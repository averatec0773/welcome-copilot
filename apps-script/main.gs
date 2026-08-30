// Pipeline entry point, run by a 5-minute time trigger.
// Idempotency: a non-empty welcome_sent_at means done, forever.
// Dry-run drafts instead of sending and marks DRAFTED without stamping sent_at,
// so a later live run picks those rows up and actually sends.

function runPipeline() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) { log_('-', '-', 'LOCK_BUSY', 'concurrent run skipped'); return; }
  const runId = Utilities.getUuid().slice(0, 8);
  try {
    assignHireIds_();
    const cfg = getConfig();
    // Fail closed: a missing or mangled dry_run row means drafts, not live mail.
    const dryRun = String(cfg.dry_run).toUpperCase() !== 'FALSE';
    const allRows = readTrackerRows_();
    const hireNum_ = function (id) {
      const m = /^H-(\d+)$/i.exec(String(id).trim());
      return m ? parseInt(m[1], 10) : Infinity;
    };
    // owner = lowest hire_id; any already-sent twin always blocks — survives re-sorting.
    const emailInfo = {};
    allRows.forEach(function (r) {
      const email = String(r.email).trim().toLowerCase();
      if (!email) return;
      if (!emailInfo[email]) emailInfo[email] = { minHireNum: Infinity, minHireId: null, sentHireIds: [] };
      const info = emailInfo[email];
      const num = hireNum_(r.hireId);
      if (num < info.minHireNum) { info.minHireNum = num; info.minHireId = r.hireId; }
      if (r.sentAt) info.sentHireIds.push(r.hireId);
    });
    const eligible = allRows.filter(function (r) {
      if (r.status !== TRIGGER_STATUS || r.sentAt) return false;
      if (r.welcomeStatus === 'SENDING') return false; // stuck mid-send; needs human review
      if (dryRun && r.welcomeStatus === 'DRAFTED') return false; // don't re-draft
      return true;
    });
    const sheet = ss_().getSheetByName(TRACKER_SHEET);
    for (let i = 0; i < eligible.length; i++) {
      const row = eligible[i];
      const email = String(row.email).trim().toLowerCase();
      const info = email ? emailInfo[email] : null;
      if (info) {
        const otherSent = info.sentHireIds.filter(function (id) { return String(id) !== String(row.hireId); });
        const isDuplicate = otherSent.length > 0 || hireNum_(row.hireId) !== info.minHireNum;
        if (isDuplicate) {
          const ownerId = otherSent.length > 0 ? otherSent[0] : info.minHireId;
          const firstTime = row.welcomeStatus !== 'DUPLICATE';
          writeBack_(sheet, row, { status: 'DUPLICATE', error: 'duplicate of ' + ownerId });
          if (firstTime) {
            log_(runId, row.hireId, 'DUPLICATE', 'duplicate of ' + ownerId);
            alertAdmin('Duplicate hire row ' + row.hireId,
              'Email already claimed by ' + ownerId + '. Fix the row; it will send on the next run once corrected.');
          }
          continue;
        }
      }
      if (!dryRun && MailApp.getRemainingDailyQuota() < QUOTA_FLOOR) {
        log_(runId, '-', 'QUOTA_HOLD', 'up to ' + (eligible.length - i) + ' row(s) held; retry next run');
        break;
      }
      processRow_(row, cfg, dryRun, runId);
    }
    setConfigValue('last_run_at', new Date().toISOString());
    setConfigValue('mail_quota_remaining', MailApp.getRemainingDailyQuota());
    pingHeartbeat();
  } catch (e) {
    log_(runId, '-', 'ERROR', String(e));
    try { alertAdmin('Pipeline error', String(e && e.stack ? e.stack : e)); }
    catch (alertErr) { Logger.log('Alert failed: ' + alertErr); }
    throw e;
  } finally {
    lock.releaseLock();
  }
}

function processRow_(row, cfg, dryRun, runId) {
  const sheet = ss_().getSheetByName(TRACKER_SHEET);
  const v = validateRow(row);
  if (!v.ok) {
    const firstTime = row.welcomeStatus !== 'INVALID';
    writeBack_(sheet, row, { status: 'INVALID', error: v.errors.join('; ') });
    if (firstTime) {
      log_(runId, row.hireId, 'INVALID', v.errors.join('; '));
      alertAdmin('Invalid hire row ' + row.hireId, v.errors.join('\n') + '\nFix the row; it will send on the next run.');
    }
    return;
  }
  const msg = renderWelcomeEmail(row, cfg.assistant_url);
  appendOutbox_(row, msg, dryRun);
  if (dryRun) {
    GmailApp.createDraft(row.email, msg.subject, '', { htmlBody: msg.html });
    writeBack_(sheet, row, { status: 'DRAFTED', error: '' });
    log_(runId, row.hireId, 'DRAFT', 'draft created (dry run)');
  } else {
    // At-most-once: abort if the SENDING stamp did not land — never send unmarked.
    if (!writeBack_(sheet, row, { status: 'SENDING' })) return;
    SpreadsheetApp.flush(); // the SENDING stamp must be durable before mail leaves
    GmailApp.sendEmail(row.email, msg.subject, '', { htmlBody: msg.html, name: 'Mentella People Ops' });
    writeBack_(sheet, row, { sentAt: new Date(), status: 'SENT', error: '' });
    log_(runId, row.hireId, 'SEND', 'sent to alias');
  }
}

function readTrackerRows_() {
  const values = ss_().getSheetByName(TRACKER_SHEET).getDataRange().getValues();
  return values.slice(1).map(function (v, i) {
    return {
      rowIndex: i + 2,
      hireId: v[COL.HIRE_ID - 1],
      name: v[COL.NAME - 1],
      email: String(v[COL.EMAIL - 1]).trim(),
      license: v[COL.LICENSE - 1],
      state: v[COL.STATE - 1],
      startDate: v[COL.START_DATE - 1],
      manager: v[COL.MANAGER - 1],
      status: v[COL.STATUS - 1],
      sentAt: v[COL.SENT_AT - 1],
      welcomeStatus: v[COL.WELCOME_STATUS - 1],
      errorDetail: v[COL.ERROR_DETAIL - 1],
      isDemo: v[COL.IS_DEMO - 1],
    };
  }).filter(function (r) { return r.name || r.email; });
}

// Rows are keyed by hire_id, never by position — the sheet is sorted,
// filtered, and edited by several people at once.
function assignHireIds_() {
  const sheet = ss_().getSheetByName(TRACKER_SHEET);
  const values = sheet.getDataRange().getValues();
  let max = 0;
  values.slice(1).forEach(function (v) {
    const m = /^H-(\d+)$/i.exec(String(v[COL.HIRE_ID - 1]).trim());
    if (m) max = Math.max(max, parseInt(m[1], 10));
  });
  values.slice(1).forEach(function (v, i) {
    if (!String(v[COL.HIRE_ID - 1]).trim() && (v[COL.NAME - 1] || v[COL.EMAIL - 1])) {
      const cell = sheet.getRange(i + 2, COL.HIRE_ID);
      if (String(cell.getValue()).trim()) return; // live cell gained an id since snapshot
      max += 1;
      cell.setValue('H-' + String(max).padStart(4, '0'));
    }
  });
}

// Writes are verified against hire_id before landing: the sheet can be
// sorted or edited mid-run, so the captured row index is a hint, not a key.
function writeBack_(sheet, row, patch) {
  let rowIndex = row.rowIndex;
  if (String(sheet.getRange(rowIndex, COL.HIRE_ID).getValue()) !== String(row.hireId)) {
    rowIndex = findRowByHireId_(sheet, row.hireId);
    if (rowIndex === -1) { log_('-', row.hireId, 'ERROR', 'row vanished mid-run; write skipped'); return false; }
  }
  if (patch.sentAt !== undefined) sheet.getRange(rowIndex, COL.SENT_AT).setValue(patch.sentAt);
  if (patch.status !== undefined) sheet.getRange(rowIndex, COL.WELCOME_STATUS).setValue(patch.status);
  if (patch.error !== undefined) sheet.getRange(rowIndex, COL.ERROR_DETAIL).setValue(patch.error);
  return true;
}

function findRowByHireId_(sheet, hireId) {
  if (!String(hireId).trim()) return -1;
  const ids = sheet.getRange(2, COL.HIRE_ID, Math.max(sheet.getLastRow() - 1, 1), 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(hireId)) return i + 2;
  }
  return -1;
}

function appendOutbox_(row, msg, dryRun) {
  ss_().getSheetByName(OUTBOX_SHEET)
    .appendRow([row.hireId, row.email, msg.subject, msg.html, dryRun ? 'DRY_RUN' : 'LIVE', new Date()]);
}

function log_(runId, hireId, action, result) {
  ss_().getSheetByName(LOG_SHEET).appendRow([new Date(), runId, hireId, action, result]);
}
