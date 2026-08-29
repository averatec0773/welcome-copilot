// Failure defenses. Layer 1: alertAdmin (loud errors). Layer 2: heartbeat ping
// to healthchecks.io (detects silence itself — trigger disabled, auth expired,
// script dead). Layer 3: dailyDigest (human-level bottom line).
// Secrets live in Script Properties, not in the (publicly viewable) sheet.

function props_() { return PropertiesService.getScriptProperties(); }

function pingHeartbeat() {
  const url = props_().getProperty('HC_PING_URL');
  if (!url) return;
  try {
    UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  } catch (e) {
    // Heartbeat failure must never break the pipeline itself.
    Logger.log('Heartbeat ping failed: ' + e);
  }
}

function alertAdmin(subject, body) {
  const admin = props_().getProperty('ADMIN_EMAIL');
  if (!admin) { Logger.log('ADMIN_EMAIL not set; alert dropped: ' + subject); return; }
  MailApp.sendEmail(admin, '[welcome-copilot] ' + subject, body);
}

function dailyDigest() {
  const since = new Date(Date.now() - 24 * 3600 * 1000);
  const entries = ss_().getSheetByName(LOG_SHEET).getDataRange().getValues().slice(1)
    .filter(function (r) { return r[0] instanceof Date && r[0] > since; });
  const count = function (a) {
    return entries.filter(function (r) { return r[3] === a; }).length;
  };
  const stuck = ss_().getSheetByName(TRACKER_SHEET).getDataRange().getValues().slice(1)
    .filter(function (r) { return r[COL.WELCOME_STATUS - 1] === 'SENDING' && !r[COL.SENT_AT - 1]; }).length;
  const body = [
    'welcome-copilot pipeline — last 24h',
    'Emails sent: ' + count('SEND'),
    'Drafts created (dry-run): ' + count('DRAFT'),
    'Invalid rows: ' + count('INVALID'),
    'Pipeline errors: ' + count('ERROR'),
    'Runs skipped (lock busy): ' + count('LOCK_BUSY'),
    'Runs hitting quota floor: ' + count('QUOTA_HOLD'),
    'Rows stuck in SENDING (need review): ' + stuck,
    'Mail quota remaining today: ' + MailApp.getRemainingDailyQuota(),
    '',
    'No news from me tomorrow would itself be a signal — check the triggers.',
  ].join('\n');
  alertAdmin('Daily digest', body);
  archiveDemoRows_();
}

function archiveDemoRows_() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) { Logger.log('archiveDemoRows_: lock busy; skipping until tomorrow'); return; }
  try {
    const sheet = ss_().getSheetByName(TRACKER_SHEET);
    const values = sheet.getDataRange().getValues();
    const cutoff = new Date(Date.now() - 7 * 24 * 3600 * 1000);
    for (let i = values.length - 1; i >= 1; i--) {
      const isDemo = values[i][COL.IS_DEMO - 1] === true || String(values[i][COL.IS_DEMO - 1]).toUpperCase() === 'TRUE';
      const sentAt = values[i][COL.SENT_AT - 1];
      if (isDemo && sentAt instanceof Date && sentAt < cutoff) sheet.deleteRow(i + 1);
    }
  } finally {
    lock.releaseLock();
  }
}
