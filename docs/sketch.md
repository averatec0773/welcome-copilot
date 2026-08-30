# Welcome Copilot — Design Sketch

This is the practical task, answered end to end. It stands on its own, but the
build described here is live: **[welcome-copilot.vercel.app](https://welcome-copilot.vercel.app)**
(source: **[github.com/averatec0773/welcome-copilot](https://github.com/averatec0773/welcome-copilot)**).

## What I'd use

A Google Sheet as the system of record (HR already lives there, so the
automation should work around that instead of asking them to adopt a new
tool), plus a bound Google Apps Script project on a 5-minute time trigger
that reads rows marked `Hired`, validates them, renders a welcome email,
archives it, and sends it through Gmail. A small Next.js console (deployed
to Vercel) gives a read-only view of the pipeline: a tracker, a sent-email
archive, a health page, and a gated Simulate tab (one real demo-row append
that pokes the pipeline end-to-end — the console's only write path, else
read-only throughout), plus a Claude-backed assistant that answers
new-hire questions from a handbook, so the welcome email isn't the end of
onboarding help, it's the start of it.

I'd skip Zapier or n8n here. Both are fine for wiring two SaaS tools
together with no code, but this task needs branching logic (three kinds of
bad row, a duplicate-email guard that survives the sheet being re-sorted
mid-run, an at-most-once send guarantee, a quota floor) that turns into a
tangle of conditional steps in a no-code canvas and is easier to read, test,
and version as a dozen or so functions in a script. I'd flip to one of them if
the job became "connect Sheet X to Slack Y" with no real branching (pure
orchestration), or if non-engineers needed to edit the flow without a PR.

## What could go wrong

- **Duplicate rows for the same person** — the row with the lowest `hire_id`
  owns the email; every other row sharing that address gets marked
  `DUPLICATE` and points at the owner, and stays blocked even if the sheet
  is re-sorted afterward, because ownership is decided by `hire_id`, not
  row position.
- **People editing and sorting the sheet mid-run:** every write re-locates
  its row by `hire_id` before writing, never by the row index the pipeline
  first read; a row that moved between the read and the write still gets
  the right cell updated.
- **Invalid rows** (no name, malformed email, missing start date) — marked
  `INVALID` with the specific reason, admin gets an email immediately, the
  row is retried automatically once someone fixes it.
- **Gmail's daily send quota:** the run checks remaining quota before every
  send and halts once fewer than 20 remain, logging how many rows it
  held; those rows go out on the next 5-minute cycle instead of failing.
- **The trigger silently getting disabled** (someone deletes it, an OAuth
  token expires): this is the one failure mode that produces *no* error at
  all, which is why it gets its own defense below rather than a try/catch.
- **A template edit that breaks the layout:** the exact HTML that was sent
  is archived at send time, so a bad template shows up immediately as an
  ugly row in the Outbox rather than being noticed weeks later from a
  complaint.
- **A crash partway through a send** — the row is stamped `SENDING` and that
  stamp is flushed to the sheet *before* Gmail is asked to send anything, so
  a crash between those two steps leaves a row that's visibly stuck rather
  than one that silently double-sends or silently vanishes. The pipeline
  never auto-retries a `SENDING` row. That one needs a human to check the
  Log tab for a `SEND` entry and confirm whether the email actually left
  before clearing it.

## How I'd know it silently stopped

Three independent layers, because monitoring that depends on the pipeline
also being alive isn't monitoring:

1. **Instant alerts** for things that *do* announce themselves (an invalid
   row, a duplicate, an uncaught exception in the run) email the admin the
   moment they happen.
2. **A dead-man's-switch** — every successful run pings healthchecks.io,
   which doesn't wait for an error: it starts a timer, and if no ping
   arrives within the configured period plus a grace window, *it* emails
   the admin. That's the layer that catches what nothing else can: a
   disabled trigger, an expired auth token, a script that's dead but never
   threw. The check-in period is 10 minutes with a 5-minute grace against a
   5-minute run cadence, so a dead pipeline should be caught within ~15
   minutes of the trigger dying. The drill to confirm that timing is a
   one-off manual check, listed in the RUNBOOK.
3. **A daily digest** at 08:00: sent, drafted, invalid, duplicate, errors,
   and quota-hold counts, plus a line for rows still stuck `SENDING`, so a
   human gets the day's shape without reading the log. Its last line is
   deliberately blunt: no digest tomorrow is itself the signal to check the
   triggers.

Live demo: **welcome-copilot.vercel.app** · Repo:
**github.com/averatec0773/welcome-copilot**
