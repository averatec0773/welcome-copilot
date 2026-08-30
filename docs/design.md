# Design

The decisions behind the build, and what I'd reconsider and when. Each entry
is: the choice, the alternative I considered, why I picked what I picked,
and the condition under which I'd revisit it.

## Polling trigger, not onEdit

**Choice:** a time-based trigger runs `runPipeline` every 5 minutes and
scans the whole Tracker for eligible rows.
**Alternative:** an `onEdit` trigger that fires the moment a row's Status
cell changes to `Hired`.
**Why:** the sheet gets sorted, filtered, and bulk-edited by several people
at once. A sort or a paste-special fires `onEdit` in ways that don't map
cleanly to "this row just became Hired," and an edit trigger can't
distinguish a human typing `Hired` from a script or an import doing the
same. A dumb poll that re-derives "what's eligible right now" from the full
sheet state is simpler to reason about and immune to edit-event edge cases.
**Revisit when:** near-instant delivery becomes a real requirement (5
minutes stops being acceptable). I'd add a narrowly-scoped `onEdit` that
only ever *shortens* the wait for a single obviously-valid change, with the
poll kept as the source of truth underneath it.

## At-most-once sends via a pre-send stamp

**Choice:** before calling `GmailApp.sendEmail`, the row is stamped
`SENDING` and that write is flushed to the sheet synchronously. Only after
the send returns does the row get stamped `SENT`.
**Alternative:** send first, then record the outcome.
**Why:** a script can be killed mid-execution (timeout, quota cutoff,
platform hiccup) at literally any line. Send-then-record risks a crash
between those two steps producing an email nobody has a record of having
sent. Stamp-then-send risks a crash leaving a row that *looks* unsent but
might not be — but that failure mode is visible (`SENDING` sits there
forever) and safe to leave for a human to check, rather than silently
duplicating a welcome email to a new hire.
**Revisit when:** never, for this cadence — this pattern is cheap and the
alternative failure mode (silent duplicate/silent loss) is strictly worse.
It'd need reconsidering only if the platform offered a real transactional
send-and-record primitive, which Apps Script + Gmail doesn't.

## Fail-closed dry-run

**Choice:** the pipeline treats anything other than `FALSE` (matched
without regard to case) in the `dry_run` config cell as "draft only." A
blank cell or a typo in that cell means draft, never send. (If the
`Config` tab itself is renamed or deleted, `getConfig()` throws instead:
the run aborts before touching any row, the admin gets alerted, and
nothing sends *or* drafts that cycle — a different failure mode, but still
safe, since it's loud rather than silent.)
**Alternative:** default to live sending unless explicitly told not to.
**Why:** the cost of an unwanted draft is zero; the cost of an unwanted
live email to a real person is not undoable. When the safe and unsafe
defaults aren't symmetric, the code should fail toward the cheap mistake.
**Revisit when:** it wouldn't: this is a one-way door I'd keep even at
scale.

## Rows keyed by `hire_id`, not row position

**Choice:** every read snapshots a row index as a hint, but every *write*
re-locates the row by `hire_id` immediately before writing, and aborts that
write if the id can't be found.
**Alternative:** trust the row index captured at the start of the run.
**Why:** the sheet is a live, human-edited surface: someone can sort it,
delete a row above, or insert one, all mid-run. A captured row index is
stale the instant that happens; writing to it would silently corrupt a
different hire's row.
**Revisit when:** if the Tracker moves off a spreadsheet (see
`tracker-v2.md`), a real primary key replaces this pattern entirely rather
than needing to be revisited.

## Duplicate-email guard: lowest hire_id owns the address

**Choice:** for a given email address, the row with the numerically lowest
`hire_id` is the "owner." Any other row with that address is marked
`DUPLICATE`, and once *any* row with that address has actually sent, every
other row with that address is permanently blocked, even if the sheet
gets re-sorted afterward.
**Alternative:** "first row in sheet order wins," which is what an earlier
version of this logic did.
**Why:** row order isn't stable — a sort changes it. `hire_id` is assigned
once, in increasing order, and never changes, so ownership computed from it
survives any amount of re-sorting. This was a real bug caught in review:
the position-based version could double-send after a sort.
**Revisit when:** if hires can legitimately share a household email (rare
but possible), this would need a manual-override column rather than a pure
`hire_id` rule.

## Quota floor instead of quota exhaustion

**Choice:** the run stops sending once Gmail's remaining daily quota drops
below 20, holding any further eligible rows for the next 5-minute cycle,
rather than sending until the quota hard-stops.
**Alternative:** send until `MailApp.getRemainingDailyQuota()` hits 0.
**Why:** running the quota to exactly zero risks Gmail rejecting the *next*
call mid-loop with no graceful way to know in advance how many more rows
would have fit — better to stop early with headroom (for the daily digest,
error alerts, and anything else sharing the same quota) than to find out by
failing.
**Revisit when:** on a Workspace account with a materially higher daily
cap, 20 as an absolute floor would want to become a percentage instead.

## Retrieval: MiniSearch (BM25-family), not embeddings

**Choice:** the handbook assistant retrieves with MiniSearch, a full-text
index (fuzzy + prefix matching over BM25-style scoring) built in-process
from nine Markdown files.
**Alternative:** embed the handbook into a vector database and retrieve by
semantic similarity.
**Why:** at nine documents, a full-text index has nothing to deploy,
rebuilds in milliseconds, and is simpler to debug — a bad retrieval is a
keyword-matching problem you can eyeball, not a similarity-in-a-black-box
problem. A vector store is real infrastructure for a corpus this size.
**Revisit when:** the handbook needs to answer paraphrased questions that
share no vocabulary with the source text ("what's the deal with my check"
→ payroll), or grows past what one in-memory index handles comfortably —
either is the concrete signal to add embeddings, not a schedule.

## Invite-code layering for the assistant

**Choice:** three layers, cheapest first. The four suggested questions are
served from a prebaked, hand-reviewed cache — zero API calls, no gate.
Free-form questions require an access code (`DEMO_ACCESS_CODE`, delivered
out of band). Even unlocked, free-form asks are rate-limited: 8/minute per
IP, 300/day globally.
**Alternative:** gate the whole assistant behind the code, or gate nothing
and rely on rate limits alone.
**Why:** the suggested questions are the common case and cost nothing to
serve to everyone, including reviewers who'll never have the code. The code
protects the thing that actually costs money (arbitrary Claude calls); the
rate limits are defense-in-depth for the code itself leaking, not the
primary control.
**Revisit when:** this is a demo-scale pattern — a real deployment behind
company SSO wouldn't need an invite code at all, just auth.

## Audit & demo instrumentation

**Choice:** two things ride alongside the public-facing features. First,
every gated action (`unlock`, `ask`, `simulate`) appends one row to a
private Google Sheet nothing else in the demo reads from or writes to:
timestamp, event type, a truncated IP, a truncated user-agent, and an
event-specific detail — the full question and answer text for the
assistant, the generated demo name/alias plus the visitor's full
self-supplied email address (when they opted in to a copy) for a simulate
run. That address is an owner decision to log in full — it's stored only
in this private, operator-only audit sheet, never in the public Tracker
sheet and never in any UI-facing log. None of it is ever surfaced in any
UI. Second, Simulate's optional visitor-copy address is
never written to the shared Tracker: it's forwarded once to the Apps
Script webhook, cached there for 6 hours keyed to that row, sent exactly
once after the real send completes, then deleted, carrying a one-time
footer explaining why the visitor got it.
**Alternative:** no audit trail at all (read server logs by hand instead),
or store the visitor-copy address on the Tracker row itself or in Redis
rather than an ephemeral Apps Script cache.
**Why:** this is a public demo with no authenticated users behind it — the
operator otherwise has no way to see whether the assistant is getting
reasonable questions, whether Simulate is being abused, or whether the
access code has leaked, short of reading raw server logs. A private,
fire-and-forget append gives that visibility without exposing anything
back to visitors and without ever blocking the request it's logging
(missing config or a failed append just no-ops). The visitor-copy address,
separately, has no reason to outlive the one email it's used for or to
ever sit next to real hiring data, so a 6-hour self-deleting cache on the
same side that already sends the email is simpler than a separate store
that would need its own security and cleanup.
**Revisit when:** this stops being a single-operator demo (real
multi-operator access needs actual access control on the audit log, not
just "it's a different sheet"), or the visitor copy needs to persist past
one send (a resend feature, a delivery audit trail) — either turns an
ephemeral-cache problem into a real data-retention decision.

## PII, not PHI

Everything this system touches (name, email, license type, state, start
date, manager, an onboarding handbook) is ordinary hiring PII. Nothing
here is Protected Health Information, and nothing here is built to touch
PHI: the handbook assistant's own system prompt refuses questions about a
specific client, and the handbook itself (see `hipaa-basics.md`) tells new
hires that client information belongs in the EHR only, never in email, a
shared sheet, or a chat tool like this one. That said, the access-boundary
habits this build practices are the transferable part regardless of what
the data is: redact identifying values out of logs before they're written
(the pipeline's Log tab carries `hire_id`, never a name or address),
keep secrets out of code and out of the spreadsheet (Script Properties, not
cells or source), and minimize what any given surface can see (the console
is read-only throughout, with one gated exception: `/api/simulate` appends
demo rows behind the same invite code as the assistant, plus rate limits
and backlog/quota/dry-run guards; the service account therefore holds
write scope, used only by that append and by the private audit log; the
assistant itself is scoped to policy documents and explicitly refuses
anything that smells like client data). Those are the same habits a
PHI-adjacent system needs. This
demo just doesn't need to earn that trust to prove it understands the
shape of the problem.

## Consciously skipped

Left out on purpose, not by oversight: each because the cost didn't clear
the bar for a demo of this scope:

- **A pulse-survey / 30-60-90-day check-in follow-up** — a natural next
  automation once the welcome email lands, and the one I'd build next if
  this went further; skipped here to keep the surface area to what could
  be built and verified end-to-end in the time available.
- **Per-row isolation in the send loop:** one row throwing (e.g. a
  transient Gmail error) aborts the rest of that run's batch rather than
  being caught and skipped individually; acceptable at low volume since the
  next 5-minute run retries everything not yet sent, but a real
  weakness at higher throughput.
- **Enforced `hire_id` uniqueness** — nothing stops two rows from being
  hand-typed with the same id; the duplicate-email guard catches the
  practical case (same person, same address) but not a deliberately or
  accidentally duplicated id.
- **Real-time `onEdit` delivery:** see the polling-vs-onEdit decision
  above.
- **Multi-language email templates** — the template is intentionally
  English-only regardless of spreadsheet locale, matching this demo's
  single-market scope.
- **An admin UI for editing the prebaked assistant answers or the email
  template:** both are edited by changing source and redeploying; fine at
  one maintainer, not fine past that.
