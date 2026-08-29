// One-time provisioning: tabs, headers, validation, protection, mock data.
// Safe to re-run — it rebuilds the demo sheet from scratch.

const ALIAS_BASE = 'ayetek0773';

function demoEmail_(slug) { return ALIAS_BASE + '+' + slug + '@gmail.com'; }

function provisionSheet() {
  const ss = ss_();
  const tracker = resetSheet_(ss, TRACKER_SHEET, 0);
  const config = resetSheet_(ss, CONFIG_SHEET, 1);
  const log = resetSheet_(ss, LOG_SHEET, 2);
  const outbox = resetSheet_(ss, OUTBOX_SHEET, 3);

  // --- Tracker ---
  const headers = ['hire_id', 'name', 'email', 'license', 'state', 'start_date',
    'manager', 'status', 'welcome_sent_at', 'welcome_status', 'error_detail', 'is_demo'];
  tracker.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
  tracker.setFrozenRows(1);

  const d = function (y, m, day) { return new Date(y, m - 1, day); };
  const rows = [
    ['H-0001', 'Maria Chen', demoEmail_('maria'), 'LMFT', 'CA', d(2026, 8, 3), 'Dana Whitfield', 'Onboarded', d(2026, 7, 20), 'SENT', '', false],
    ['H-0002', 'James Okafor', demoEmail_('james'), 'LCSW', 'NY', d(2026, 8, 10), 'Dana Whitfield', 'Onboarded', d(2026, 7, 27), 'SENT', '', false],
    ['H-0003', 'Sarah Kim', demoEmail_('sarah'), 'LPC', 'TX', d(2026, 9, 1), 'Luis Herrera', 'Hired', d(2026, 8, 18), 'SENT', '', false],
    ['H-0004', 'Priya Natarajan', demoEmail_('priya'), 'LPCC', 'CA', d(2026, 9, 14), 'Luis Herrera', 'Hired', '', '', '', false],
    ['H-0005', 'Daniel Reyes', 'daniel.reyes@', 'PsyD', 'FL', d(2026, 9, 14), 'Dana Whitfield', 'Hired', '', '', '', false],
    ['H-0006', 'Emily Tran', demoEmail_('emily'), 'LMFT', 'WA', d(2026, 9, 21), 'Luis Herrera', 'Offer', '', '', '', false],
    ['H-0007', 'Marcus Bell', demoEmail_('marcus'), 'LCSW', 'IL', d(2026, 10, 5), 'Dana Whitfield', 'Offer', '', '', '', false],
    ['H-0008', 'Hannah Roth', demoEmail_('hannah'), 'LPC', 'CO', '', '', 'Interviewing', '', '', '', false],
    ['H-0009', 'Deshawn Carter', demoEmail_('deshawn'), 'LMFT', 'GA', '', '', 'Interviewing', '', '', '', false],
    ['H-0010', 'Alina Petrova', demoEmail_('alina'), 'PsyD', 'NJ', '', '', 'Interviewing', '', '', '', false],
  ];
  tracker.getRange(2, 1, rows.length, headers.length).setValues(rows);

  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(STATUSES, true).setAllowInvalid(false).build();
  tracker.getRange(2, COL.STATUS, 500, 1).setDataValidation(rule);

  const protection = tracker.getRange(1, COL.SENT_AT, tracker.getMaxRows(), 4)
    .protect().setDescription('Script-managed columns — do not edit by hand');
  protection.setWarningOnly(true);
  tracker.autoResizeColumns(1, headers.length);

  // --- Config ---
  config.getRange(1, 1, 5, 2).setValues([
    ['key', 'value'],
    ['dry_run', 'TRUE'],
    ['assistant_url', 'https://welcome-copilot.vercel.app/console/assistant'],
    ['last_run_at', ''],
    ['mail_quota_remaining', ''],
  ]);
  config.getRange(1, 1, 1, 2).setFontWeight('bold');

  // --- Log ---
  log.getRange(1, 1, 1, 5).setValues([['timestamp', 'run_id', 'hire_id', 'action', 'result']])
    .setFontWeight('bold');
  log.setFrozenRows(1);

  // --- Outbox ---
  outbox.getRange(1, 1, 1, 6).setValues([['hire_id', 'to', 'subject', 'body_html', 'mode', 'sent_at']])
    .setFontWeight('bold');
  outbox.setFrozenRows(1);

  Logger.log('Provisioned 4 tabs with ' + rows.length + ' mock hires.');
}

function resetSheet_(ss, name, index) {
  let sheet = ss.getSheetByName(name);
  if (sheet) { sheet.clear(); sheet.getDataRange().clearDataValidations(); }
  else { sheet = ss.insertSheet(name, index); }
  sheet.getProtections(SpreadsheetApp.ProtectionType.RANGE).forEach(function (p) { p.remove(); });
  return sheet;
}
