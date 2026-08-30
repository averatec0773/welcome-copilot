# Tracker v2: what happens after the spreadsheet

The Sheet is the right choice today. See `sketch.md` for why. This is
where it stops being the right choice, and how I'd move off it without a
cutover weekend.

## Why not yet

At current volume (single digits to low tens of hires a month), the Sheet
costs nothing to run, HR already knows how to use it, and every reliability
mechanism in this build (hire_id-keyed writes, at-most-once sends, the
duplicate guard) exists specifically to make a spreadsheet safe to automate
against. Replacing it now would trade a working, understood, zero-cost
system for infrastructure that solves problems this scale doesn't have yet.

## What breaks, and around what volume

- **Row limits and read cost.** A Google Sheet tops out around 10 million
  cells, but long before that the pipeline's pattern of reading the *entire*
  Tracker on every 5-minute run gets slow and eventually throttled by
  Sheets API quota. With 12 columns, that's roughly 800,000 rows before
  hitting the cell ceiling, but the API-quota and latency wall arrives
  much sooner, realistically once the sheet holds a few thousand active
  rows and years of history sitting alongside them.
- **No referential integrity.** Nothing stops two rows from sharing a
  `hire_id`, an email typo from creating a phantom "duplicate," or a
  manager name from being spelled three different ways across rows. The
  duplicate-email guard is a workaround for exactly this gap, not a fix
  for it.
- **No real history.** The Log tab is an append-only audit trail, but the
  Tracker itself only holds current state: there's no "what did this row
  look like before HR edited it," no soft-deletes, no schema versioning.
  Answering "how many hires needed a manual fix last quarter" means reading
  the Log by hand.
- **Permissions are all-or-nothing.** Anyone with edit access to the Sheet
  can edit any column, including the script-managed ones (`welcome_status`,
  `error_detail`) — those are protected with a *warning*, not a hard block,
  because Sheets protection can't express "read-only for humans, writable
  for this specific script" cleanly at the cell level. At one recruiter
  this is fine; at a team, someone will eventually overwrite a status cell
  by accident.
- **Concurrent-write correctness gets expensive.** `LockService` gives the
  Apps Script side a script-level lock, but that's a 5-second wait with no
  real queue behind it — a busy run just skips its cycle
  (`LOCK_BUSY`) and tries again in 5 minutes. That's fine when "the sheet"
  is the only writer. It stops being fine once other systems need
  transactional writes against the same data.

At roughly **50 hires a month** — where History, permissions, and
concurrent HR + pipeline + integration writes all start mattering at once
— I'd start the migration rather than layering another workaround onto the
Sheet.

## Migration path: mirror → dual-read → cutover

I would not do a single cutover weekend. The Sheet stays authoritative
until the new system has earned trust with real traffic.

1. **Mirror.** Every pipeline run also writes each Tracker row into
   Airtable (or Postgres, if the team already runs infrastructure — Airtable
   if this needs to stay something HR can browse and edit without an
   engineer). The Sheet is still the only thing anything *reads* from.
   This stage is pure observation: does the mirror stay in sync, does the
   write add meaningful latency, do the row shapes actually match.
2. **Dual-read.** The pipeline and the console start reading from the new
   store for anything non-critical (the Health page's log, the Outbox
   archive) while `runPipeline` itself still reads and writes the Sheet as
   the source of truth, with the mirror still running underneath. This is
   where referential integrity rules (unique `hire_id`, foreign-keyed
   manager records) get turned on in the new store and any violations
   surfaced, a cheap way to find out how dirty the existing data actually
   is before it becomes load-bearing.
3. **Cutover.** Once dual-read has run clean for a stretch (no sync drift,
   no violated constraints, latency acceptable), flip `runPipeline` to
   read and write the new store as authoritative, with the Sheet becoming
   a read-only mirror for HR's benefit during the transition, then retired
   once nobody's looked at it in a month.

Each stage is independently reversible: if the mirror falls out of sync or
the new store misbehaves, the fallback at every step is "keep using the
Sheet," not "roll back a migration."
