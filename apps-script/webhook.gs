// HTTP entry point for the web console's "Simulate a hire" demo feature.
// Deployed as a Web App (execute as me, access: Anyone). The console POSTs a
// shared-secret token after appending a demo row; on a match we stash the
// optional visitor-copy address and run the pipeline immediately instead of
// waiting for the 5-minute trigger.
//
// [USER one-time]: set the SIMULATE_TOKEN script property, then
// Deploy > New deployment > Web app (execute as me, access: Anyone). Paste
// the deployment URL + token into GAS_WEBHOOK_URL / SIMULATE_TOKEN env vars.

function doPost(e) {
  let body = {};
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false })).setMimeType(ContentService.MimeType.JSON);
  }

  const expected = props_().getProperty('SIMULATE_TOKEN');
  if (!expected || !tokensMatch_(String(body.token || ''), expected)) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false })).setMimeType(ContentService.MimeType.JSON);
  }

  const alias = String(body.alias || '').trim();
  const visitorEmail = String(body.visitorEmail || '').trim();
  if (alias && visitorEmail && EMAIL_RE.test(visitorEmail)) {
    CacheService.getScriptCache().put('demo-copy:' + alias.toLowerCase(), visitorEmail, 21600);
  }

  try {
    runPipeline();
  } catch (err) {
    // runPipeline() already logs/alerts internally; a webhook-triggered run
    // failing must not turn into a 500 for the console.
    Logger.log('runPipeline via webhook failed: ' + err);
  }

  return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
}

// Constant-time-ish comparison: always walks the full length of the longer
// string instead of short-circuiting on the first mismatched byte.
function tokensMatch_(a, b) {
  const maxLen = Math.max(a.length, b.length);
  let diff = a.length === b.length ? 0 : 1;
  for (let i = 0; i < maxLen; i++) {
    const ca = i < a.length ? a.charCodeAt(i) : 0;
    const cb = i < b.length ? b.charCodeAt(i) : 0;
    diff |= ca ^ cb;
  }
  return diff === 0;
}
