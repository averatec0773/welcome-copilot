# Runbook

For whoever is on call for the welcome-email pipeline — no code, no script
editor, just the Google Sheet and the Ops Console. Every scenario below is
5 steps or fewer.

## Where things live

| Thing | Where |
|---|---|
| The pipeline's data | The shared Google Sheet, tabs **Tracker**, **Config**, **Log**, **Outbox** |
| Live status view | [welcome-copilot.vercel.app](https://welcome-copilot.vercel.app), the **Tracker**, **Outbox**, and **Health** tabs of the Ops Console |
| The switch between test mode and real sending | The **Config** tab, the **dry_run** row (value `TRUE` or `FALSE`) |
| Who gets alert emails | Set up by the engineer, not editable from the Sheet |
| The pipeline's own status page | The Health page's **Dead man's switch** tile (links to the healthchecks.io badge) |
| A record of every email ever sent or drafted | The **Outbox** tab (and the Outbox console tab, which shows the actual email) |
| A row-by-row history of every pipeline run | The **Log** tab (and the Health console tab, last 20 rows) |

## Scenario: a new hire says their welcome email didn't arrive

1. Open the Ops Console's **Tracker** tab and find their row by name.
2. Check the **Welcome email** column. `SENT` means it was sent — check
   spam with the new hire first.
3. If it says `DRAFTED`, the pipeline is in test mode — see "Switch
   dry-run to live" below.
4. If it says `INVALID` or `DUPLICATE`, see those scenarios below.
5. If the column is empty and their **Status** column isn't `Hired` yet,
   that's the reason — the pipeline only acts on rows marked `Hired`.

## Scenario: a row shows INVALID

1. Open the **Tracker** tab of the shared Sheet and find the row.
2. Read the **error_detail** column — it names exactly what's wrong (for
   example, "missing or invalid start_date").
3. Fix that field directly in the Sheet.
4. Do nothing else — the pipeline re-checks every row automatically every 5
   minutes and clears the status once it's valid.
5. If it's still `INVALID` after 10 minutes, double-check the fix matches
   the exact complaint (e.g. the start date must be a real calendar date,
   not text).

## Scenario: a row shows DUPLICATE

1. This means another row in the Tracker uses the exact same email address.
2. Look at the **error_detail** column — it names the `hire_id` that owns
   the email (normally the one with the earlier hire number).
3. If this is genuinely two different people who happen to share an email,
   fix the email address on the newer row.
4. If it's the same person entered twice, delete the extra row.
5. No further action needed — the pipeline re-checks automatically.

## Scenario: a row is stuck on SENDING

This means the pipeline started sending that email and something
interrupted it before it could confirm the send. It will **not**
auto-retry — it needs a human look, because sending it again could
double-email someone.

1. Open the **Outbox** tab (Sheet or console) and find the most recent row
   for that `hire_id`.
2. If its **mode** column says `LIVE` and the timestamp matches when the
   row got stuck, the email almost certainly went out — ask the new hire to
   check, including spam.
3. If you confirm it was sent, open the Sheet's **Tracker** tab and clear
   that row's `welcome_status` cell, then type `SENT` into it directly.
4. If you confirm it was **not** sent (no matching Outbox row, or the new
   hire never received anything), clear the `welcome_status` cell entirely
   — the pipeline will pick the row up and send it on the next run.
5. Still unsure? Leave it and message the engineer — this column is
   protected precisely so an accidental double-send needs a deliberate
   human decision, not a script.

## Scenario: the Health page's badge is red

1. Open the Ops Console's **Health** tab.
2. Check the **Last pipeline run** tile — if it says anything other than
   "a few minutes ago," the pipeline has stopped running.
3. Open the shared Sheet, then Extensions → Apps Script, then Triggers
   (clock icon) in the left sidebar.
4. Confirm two triggers exist: `runPipeline` (every 5 minutes) and
   `dailyDigest` (daily). If either is missing, message the engineer — the
   fix is a one-click "reinstall" run in the editor, not a Sheet edit.
5. If both triggers are present and it's still red, message the engineer —
   this usually means an expired Google authorization, not a Sheet problem.

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
   about 15 minutes — that's expected, not a bug, while paused.
4. To resume, re-run `installTriggers` from the Apps Script editor (ask the
   engineer if you don't have editor access), or just set `dry_run` back.
5. Nothing is lost while paused — rows sit as they are and get picked up
   normally on the next run once triggers are restored.

## Weekly 2-minute check

1. Open the **Health** tab of the Ops Console.
2. **Last pipeline run** should read minutes, not hours — if it's red,
   follow the "badge is red" scenario above.
3. **Mode** should read what you expect — `LIVE` in normal operation,
   `DRY-RUN` only if you meant to pause sending.
4. Skim the last handful of rows in the log table for repeated `ERROR` or
   `INVALID` entries — one-offs are normal, a repeating pattern isn't.
5. Check your email for the most recent daily digest — if you haven't
   gotten one in the last day, that silence is itself the signal to check
   the triggers, per the scenario above.
