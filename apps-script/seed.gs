// One-off seed helpers, run manually from the editor after a push.
// Not idempotent by design — each guards against being re-run once its
// job is visibly done, but don't expect a clean re-seed after edits.

// Backfills Outbox with the three hires who were already sent before the
// archive existed, so the Outbox tab shows real history instead of an
// empty tab. Renders the *current* template against their real row data.
function seedOutboxHistory() {
  const outbox = ss_().getSheetByName(OUTBOX_SHEET);
  const targets = ['H-0001', 'H-0002', 'H-0003'];
  const existingIds = outbox.getLastRow() > 1
    ? outbox.getRange(2, 1, outbox.getLastRow() - 1, 1).getValues().map(function (r) { return String(r[0]); })
    : [];
  if (targets.some(function (id) { return existingIds.indexOf(id) !== -1; })) {
    Logger.log('seedOutboxHistory: Outbox already has one of H-0001/H-0002/H-0003; skipping.');
    return;
  }
  const d = function (y, m, day) { return new Date(y, m - 1, day); };
  const sentAt = {
    'H-0001': d(2026, 7, 20),
    'H-0002': d(2026, 7, 27),
    'H-0003': d(2026, 8, 18),
  };
  const cfg = getConfig();
  const rows = readTrackerRows_().filter(function (r) { return sentAt[r.hireId]; });
  rows.forEach(function (row) {
    const msg = renderWelcomeEmail(row, cfg.assistant_url);
    outbox.appendRow([row.hireId, row.email, msg.subject, msg.html, 'LIVE', sentAt[row.hireId]]);
  });
  Logger.log('seedOutboxHistory: appended ' + rows.length + ' historical outbox row(s).');
}

// Appends a second "Sarah Kim" row sharing her real email, so the
// duplicate-hire guard has something visible to catch on the live sheet.
function seedDuplicateRow() {
  const rows = readTrackerRows_();
  const sarah = rows.find(function (r) { return r.name === 'Sarah Kim'; });
  if (!sarah) {
    Logger.log('seedDuplicateRow: Sarah Kim not found in Tracker; skipping.');
    return;
  }
  const email = String(sarah.email).trim().toLowerCase();
  const matches = rows.filter(function (r) { return String(r.email).trim().toLowerCase() === email; });
  if (matches.length >= 2) {
    Logger.log('seedDuplicateRow: Sarah\'s email already appears on 2+ rows; skipping.');
    return;
  }
  const sheet = ss_().getSheetByName(TRACKER_SHEET);
  sheet.appendRow(['', 'Sarah Kim', sarah.email, 'LPC', 'TX', new Date(2026, 8, 1),
    'Luis Herrera', 'Hired', '', '', '', false]);
  Logger.log('seedDuplicateRow: appended duplicate Sarah Kim row.');
}

// Backfills the Log's redaction: any earlier run that logged an address
// (before validation.gs stopped interpolating it) gets scrubbed in place.
function redactLogHistory() {
  const emailPattern = /[\w.+-]+@[\w-]+(\.[\w-]+)*|[\w.+-]+@/g;
  const sheet = ss_().getSheetByName(LOG_SHEET);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    Logger.log('redactLogHistory: no log rows.');
    return;
  }
  const range = sheet.getRange(2, 5, lastRow - 1, 1); // col E = result
  const values = range.getValues();
  let changed = 0;
  values.forEach(function (v, i) {
    const original = String(v[0]);
    const redacted = original.replace(emailPattern, '<redacted>');
    if (redacted !== original) {
      sheet.getRange(i + 2, 5).setValue(redacted);
      changed++;
    }
  });
  Logger.log('redactLogHistory: redacted ' + changed + ' log row(s).');
}
