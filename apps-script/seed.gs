// One-off seed helpers, run manually from the editor after a push.
// Not idempotent by design — each guards against being re-run once its
// job is visibly done, but don't expect a clean re-seed after edits.

// Backfills Outbox with the three hires who were already sent before the
// archive existed, so the Outbox tab shows real history instead of an
// empty tab. Renders the *current* template against their real row data.
function seedOutboxHistory() {
  const outbox = ss_().getSheetByName(OUTBOX_SHEET);
  if (outbox.getLastRow() - 1 > 3) {
    Logger.log('seedOutboxHistory: Outbox already has more than 3 rows; skipping.');
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
  const sheet = ss_().getSheetByName(TRACKER_SHEET);
  const values = sheet.getDataRange().getValues();
  const alreadySeeded = values.slice(1).some(function (v) {
    return v[COL.WELCOME_STATUS - 1] === 'DUPLICATE';
  });
  if (alreadySeeded) {
    Logger.log('seedDuplicateRow: a DUPLICATE row already exists; skipping.');
    return;
  }
  const sarah = readTrackerRows_().find(function (r) { return r.name === 'Sarah Kim'; });
  if (!sarah) {
    Logger.log('seedDuplicateRow: Sarah Kim not found in Tracker; skipping.');
    return;
  }
  sheet.appendRow(['', 'Sarah Kim', sarah.email, 'LPC', 'TX', new Date(2026, 8, 1),
    'Luis Herrera', 'Hired', '', '', '', false]);
  Logger.log('seedDuplicateRow: appended duplicate Sarah Kim row.');
}
