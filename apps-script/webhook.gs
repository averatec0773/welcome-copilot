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

  // Crude throttle: not atomic (a read-then-write race under truly concurrent
  // hits could let a couple extra through), but good enough to stop a burst
  // of requests — wrong token or not — from silently burning through quota-
  // sensitive work (runPipeline calls) before the per-IP/global web limiters
  // even get a chance to matter.
  const cache = CacheService.getScriptCache();
  const hits = Number(cache.get('wh-hits') || 0);
  if (hits >= 30) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false })).setMimeType(ContentService.MimeType.JSON);
  }
  cache.put('wh-hits', String(hits + 1), 60);

  const expected = props_().getProperty('SIMULATE_TOKEN');
  if (!expected || !tokensMatch_(String(body.token || ''), expected)) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false })).setMimeType(ContentService.MimeType.JSON);
  }

  const alias = String(body.alias || '').trim();
  const visitorEmail = String(body.visitorEmail || '').trim();
  if (alias && visitorEmail && EMAIL_RE.test(visitorEmail)) {
    cache.put('demo-copy:' + alias.toLowerCase(), visitorEmail, 21600);
    try {
      log_('-', '-', 'COPY_QUEUED', 'copy requested for ' + alias);
    } catch (e) {
      // Never let a log-append hiccup block the simulate webhook itself.
      Logger.log('COPY_QUEUED log failed: ' + e);
    }
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
