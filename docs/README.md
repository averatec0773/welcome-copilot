# docs/

Long-form documents that don't belong in the always-loaded harness files — specs,
plans, design notes, research, investigation write-ups. This is the **default home for
anything an AI agent writes to record, or reads back later**, unless the project defines
a dedicated location or the user says otherwise.

## Organizing rule

- **Group by kind in subfolders; don't pile files in the root.** A spec or an
  implementation plan opens its own subfolder (`docs/specs/`, `docs/plans/`) so related
  documents stay together and the root stays scannable.
- **Create a subfolder when a category gets its first document — not preemptively.** A
  one-off note can sit in the root until a second sibling makes a folder worth it.
- **Name files for their content**, dated when ordering matters:
  `docs/plans/2026-08-17-auth-rework.md`.

## Suggested subfolders (create as needed)

| Folder | Holds |
|--------|-------|
| `specs/` | Feature / behavior specifications an agent works from |
| `plans/` | Implementation plans, step sequences |
| `notes/` | Investigations, findings, design rationale |
| `research/` | External research, comparisons, references |

These are conventions, not requirements — rename or add folders to fit the project.
