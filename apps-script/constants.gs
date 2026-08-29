// Shared constants and config helpers for the welcome-email pipeline.

const TRACKER_SHEET = 'Tracker';
const CONFIG_SHEET = 'Config';
const LOG_SHEET = 'Log';
const OUTBOX_SHEET = 'Outbox';

const STATUSES = ['Interviewing', 'Offer', 'Hired', 'Onboarded'];
const TRIGGER_STATUS = 'Hired';
const QUOTA_FLOOR = 20; // stop sending when fewer than this many daily emails remain

// 1-based column indexes in Tracker.
const COL = {
  HIRE_ID: 1, NAME: 2, EMAIL: 3, LICENSE: 4, STATE: 5, START_DATE: 6,
  MANAGER: 7, STATUS: 8, SENT_AT: 9, WELCOME_STATUS: 10, ERROR_DETAIL: 11, IS_DEMO: 12,
};

function ss_() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function getConfig() {
  const values = ss_().getSheetByName(CONFIG_SHEET).getDataRange().getValues();
  const cfg = {};
  values.slice(1).forEach(function (r) { cfg[r[0]] = r[1]; });
  return cfg;
}

function setConfigValue(key, value) {
  const sheet = ss_().getSheetByName(CONFIG_SHEET);
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === key) { sheet.getRange(i + 1, 2).setValue(value); return; }
  }
  sheet.appendRow([key, value]);
}
