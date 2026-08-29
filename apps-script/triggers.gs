// Trigger management. installTriggers is idempotent: it wipes and recreates.

function installTriggers() {
  removeTriggers();
  ScriptApp.newTrigger('runPipeline').timeBased().everyMinutes(5).create();
  ScriptApp.newTrigger('dailyDigest').timeBased().atHour(8).everyDays(1).create();
  Logger.log('Installed 2 triggers.');
}

function removeTriggers() {
  ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); });
}
