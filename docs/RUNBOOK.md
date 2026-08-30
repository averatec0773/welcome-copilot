# Runbook

For whoever is on call for the welcome-email pipeline, no code, no script
editor, just the Google Sheet and the Ops Console. Every scenario below is
5 steps or fewer.

## Where things live

| Thing | Where |
|---|---|
| The pipeline's data | The shared Google Sheet, tabs **Tracker**, **Config**, **Log**, **Outbox** |
| Live status view | [welcome-copilot.vercel.app](https://welcome-copilot.vercel.app), the **Tracker**, **Outbox**, **Operator Inbox**, **Health**, **Assistant**, and **Utilization** tabs of the Ops Console (Simulate is a modal opened from the Tracker tab's "▶ Simulate a hire" button, not its own tab) |
| The switch between test mode and real sending | The **Config** tab, the **dry_run** row (value `TRUE` or `FALSE`) |
| Who gets alert emails | Set up by the engineer, not editable from the Sheet |
| The pipeline's own status page | The Health page's **Dead man's switch** tile, which shows the healthchecks.io status badge image itself |
| A record of every email ever sent or drafted | The **Outbox** tab (and the Outbox console tab, which shows the actual email) |
| A row-by-row history of every pipeline run | The **Log** tab (and the Health console tab, last 20 rows) |

## Scenario: a new hire says their welcome email didn't arrive

1. Open the Ops Console's **Tracker** tab and find their row by name.
2. Check the **Welcome email** column. `SENT` means it was sent. Check
   spam with the new hire first.
3. If it says `DRAFTED`, the pipeline is in test mode — see "Switch
   dry-run to live" below.
4. If it says `INVALID` or `DUPLICATE`, see those scenarios below.
5. If the column is empty and their **Status** column isn't `Hired` yet,
   that's the reason: the pipeline only acts on rows marked `Hired`.

## Scenario: a row shows INVALID

1. Open the **Tracker** tab of the shared Sheet and find the row.
2. Read the **error_detail** column (labeled **Detail** in the Ops
   Console's Tracker tab). It names exactly what's wrong, for example
   "missing or invalid start_date".
3. Fix that field directly in the Sheet.
4. Do nothing else. The pipeline re-checks every row automatically every 5
   minutes and clears the status once it's valid.
5. If it's still `INVALID` after 10 minutes, double-check the fix matches
   the exact complaint (e.g. the start date must be a real calendar date,
   not text).

## Scenario: a row shows DUPLICATE

1. This means another row in the Tracker uses the exact same email address.
2. Look at the **error_detail** column in the Sheet (**Detail** in the Ops
   Console's Tracker tab). It names the `hire_id` that owns the email
   (normally the one with the earlier hire number).
3. If this is genuinely two different people who happen to share an email,
   fix the email address on the newer row.
4. If it's the same person entered twice, delete the extra row.
5. No further action needed. The pipeline re-checks automatically.

## Scenario: a row marked 🧪 appeared that nobody added

1. This is expected: a visitor used the Ops Console's gated **Simulate a
   hire** modal (opened from the Tracker tab, same access code as the
   assistant's free-form questions) to try the pipeline end-to-end.
2. The row is real but harmless: it always sends to one of the author's
   own + alias addresses, never a real hire or anyone else.
3. It behaves exactly like a real hire in every other way: validated,
   sent, and archived through the same pipeline, so it may briefly show
   `SENDING` or any other normal status.
4. No action needed. Any demo row that actually sent is auto-archived
   (deleted) 7 days after its `welcome_sent_at`.
5. Want it gone sooner? Delete the row yourself, any time. Demo rows show
   a 🧪 next to their `hire_id` in the Tracker console tab, and are
   marked `TRUE` in the Sheet's `is_demo` column — never by anything in
   the name.

## Scenario: a row is stuck on SENDING

This means the pipeline started sending that email and something
interrupted it before it could confirm the send. It will **not**
auto-retry, it needs a human look, because sending it again could
double-email someone. Do not trust the Outbox for this: a row is archived
there the moment the email is *rendered*, before it's actually sent, so an
Outbox entry alone doesn't prove the send went through.

1. Open the Sheet's **Log** tab (or the Health console tab, which shows
   the last 20 rows) and look for a `SEND` entry with that hire's
   `hire_id`. That row is written only after Gmail confirms the send, so
   it's the one place that proves the email actually went out.
2. Found a matching `SEND` row? The email did go out. Open the Sheet's
   **Tracker** tab and type today's date into that row's
   `welcome_sent_at` cell first (it's protected with a warning only, so
   click through it), then set `welcome_status` to `SENT`. Do
   `welcome_sent_at` first: that's the cell the pipeline actually checks
   to know a row is done, and doing it first is what stops a re-send even
   if a run happens to fire mid-edit.
3. No matching `SEND` row, and the new hire confirms they got nothing?
   The email did not go out. Clear the `welcome_status` cell entirely and
   leave `welcome_sent_at` blank — the pipeline will pick the row up and
   send it on the next run.
4. Still unsure either way? Leave both cells as they are and message the
   engineer. A wrong guess here risks a genuine double-send, so this stays
   a deliberate human call, not a default action.

## Scenario: the Health page shows red

There are two separate red signals on this page — check both.

1. Open the Ops Console's **Health** tab.
2. Look at the **Last pipeline run** tile. It reads a green "N min ago"
   under 15 minutes, an amber "N min ago" under 60 minutes, or a red
   "N h ago" (or "never ran") beyond that. Red here means the pipeline
   hasn't completed a run recently.
3. Separately, the **Dead man's switch** tile shows the healthchecks.io
   status badge image itself. If that image reads down/red, healthchecks.io
   hasn't received a heartbeat ping within its check-in window.
4. Either red signal points to the same fix: open the shared Sheet, then
   Extensions → Apps Script, then Triggers (clock icon) in the left
   sidebar, and confirm two triggers exist: `runPipeline` (every 5
   minutes) and `dailyDigest` (daily). If either is missing, message the
   engineer: the fix is a one-click "reinstall" run in the editor, not a
   Sheet edit.
5. Both triggers present and it's still red? Message the engineer — this
   usually means an expired Google authorization, not a Sheet problem.

## Scenario: switch between test mode (dry-run) and sending real email

1. Open the shared Sheet's **Config** tab.
2. Find the **dry_run** row.
3. Type `TRUE` in its value cell to draft only (nothing gets sent), or
   `FALSE` to send live email.
4. Any value other than `FALSE` is treated as test mode — this is
   intentional, so a typo or a blank cell can never accidentally turn on
   live sending.
5. The change takes effect on the next run, within 5 minutes.

## Scenario: pause everything

1. Open the shared Sheet's **Config** tab and set **dry_run** to `TRUE` —
   this immediately stops all real sending (drafts only).
2. To stop the pipeline running at all, open Extensions → Apps Script →
   Triggers (clock icon) and delete the `runPipeline` trigger.
3. Deleting that trigger will turn the Health page's badge red within
   about 15 minutes. That's expected, not a bug, while paused.
4. To resume: if you only set `dry_run` to `TRUE` (step 1) and never
   touched the triggers, just set it back to `FALSE`. If you also deleted
   the `runPipeline` trigger (step 2), setting `dry_run` back is not
   enough by itself — re-run `installTriggers` from the Apps Script editor
   too (ask the engineer if you don't have editor access).
5. Nothing is lost while paused — rows sit as they are and get picked up
   normally on the next run once triggers are restored.

## Weekly 2-minute check

1. Open the **Health** tab of the Ops Console.
2. **Last pipeline run** should read minutes, not hours — if it's red,
   follow the "Health page shows red" scenario above.
3. **Mode** should read what you expect — `LIVE` in normal operation,
   `DRY-RUN` only if you meant to pause sending.
4. Skim the last handful of rows in the log table for repeated `ERROR` or
   `INVALID` entries — one-offs are normal, a repeating pattern isn't.
5. Check your email for the most recent daily digest — if you haven't
   gotten one in the last day, that silence is itself the signal to check
   the triggers, per the scenario above.
