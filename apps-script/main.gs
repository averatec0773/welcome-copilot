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
    const dryRun = String(cfg.dry_run).toUpperCase() === 'TRUE';
    readTrackerRows_()
      .filter(function (r) {
        if (r.status !== TRIGGER_STATUS || r.sentAt) return false;
        if (dryRun && r.welcomeStatus === 'DRAFTED') return false; // don't re-draft
        return true;
      })
      .forEach(function (r) { processRow_(r, cfg, dryRun, runId); });
    setConfigValue('last_run_at', new Date().toISOString());
    setConfigValue('mail_quota_remaining', MailApp.getRemainingDailyQuota());
    pingHeartbeat();
  } catch (e) {
    log_(runId, '-', 'ERROR', String(e));
    alertAdmin('Pipeline error', String(e && e.stack ? e.stack : e));
    throw e;
  } finally {
    lock.releaseLock();
  }
}

function processRow_(row, cfg, dryRun, runId) {
  const sheet = ss_().getSheetByName(TRACKER_SHEET);
  const v = validateRow(row);
  if (!v.ok) {
    // Re-validated every run so a fixed row heals itself; alert only on transition.
    if (row.welcomeStatus !== 'INVALID') {
      writeBack_(sheet, row.rowIndex, { status: 'INVALID', error: v.errors.join('; ') });
      log_(runId, row.hireId, 'INVALID', v.errors.join('; '));
      alertAdmin('Invalid hire row ' + row.hireId, v.errors.join('\n') + '\nFix the row; it will send on the next run.');
    }
    return;
  }
  if (!dryRun && MailApp.getRemainingDailyQuota() < QUOTA_FLOOR) {
    log_(runId, row.hireId, 'QUOTA_HOLD', 'daily quota low; retry next run');
    return;
  }
  const msg = renderWelcomeEmail(row, cfg.assistant_url);
  appendOutbox_(row, msg, dryRun);
  if (dryRun) {
    GmailApp.createDraft(row.email, msg.subject, '', { htmlBody: msg.html });
    writeBack_(sheet, row.rowIndex, { status: 'DRAFTED', error: '' });
    log_(runId, row.hireId, 'DRAFT', 'draft created (dry run)');
  } else {
    GmailApp.sendEmail(row.email, msg.subject, '', { htmlBody: msg.html, name: 'Mentella People Ops' });
    writeBack_(sheet, row.rowIndex, { sentAt: new Date(), status: 'SENT', error: '' });
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
    const m = /^H-(\d+)$/.exec(String(v[COL.HIRE_ID - 1]));
    if (m) max = Math.max(max, parseInt(m[1], 10));
  });
  values.slice(1).forEach(function (v, i) {
    if (!v[COL.HIRE_ID - 1] && (v[COL.NAME - 1] || v[COL.EMAIL - 1])) {
      max += 1;
      sheet.getRange(i + 2, COL.HIRE_ID).setValue('H-' + ('0000' + max).slice(-4));
    }
  });
}

function writeBack_(sheet, rowIndex, patch) {
  if (patch.sentAt !== undefined) sheet.getRange(rowIndex, COL.SENT_AT).setValue(patch.sentAt);
  if (patch.status !== undefined) sheet.getRange(rowIndex, COL.WELCOME_STATUS).setValue(patch.status);
  if (patch.error !== undefined) sheet.getRange(rowIndex, COL.ERROR_DETAIL).setValue(patch.error);
}

function appendOutbox_(row, msg, dryRun) {
  ss_().getSheetByName(OUTBOX_SHEET)
    .appendRow([row.hireId, row.email, msg.subject, msg.html, dryRun ? 'DRY_RUN' : 'LIVE', new Date()]);
}

function log_(runId, hireId, action, result) {
  ss_().getSheetByName(LOG_SHEET).appendRow([new Date(), runId, hireId, action, result]);
}
