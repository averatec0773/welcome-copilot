# [PROJECT_NAME]

<!-- Replace this line with a one-sentence description of the project. -->

---

> **Note for template users:** The "About this template" section below is part of the template and should be removed once you've adapted this repo for a real project. Replace it — and this note — with content about your project.

---

## About this template

`averatec-harness-template` is a starting point for building a project harness: a structured repository that gives AI developers the context they need to operate consistently and safely within a codebase.

> **Multi-agent: Claude Code + Codex.** Both agents read one shared spec — `AGENTS.md` is a symlink to `CLAUDE.md`. Claude Code auto-loads skills in `.claude/skills/` (triggered by each skill's `description`) and reads `CLAUDE.md` at session start; Codex reads `AGENTS.md` plus `.codex/` (config + hooks). Edit `CLAUDE.md` only — `AGENTS.md` follows automatically.

### What is a harness?

A harness encodes how a project works — its architecture, conventions, and operational procedures — so an AI developer doesn't have to figure it out from scratch every session. Rather than relying on improvisation, the harness makes the right action easy and the wrong action obvious to avoid.

The core idea comes from how safety harnesses work physically: they don't restrict movement, they channel it. A well-written harness makes an AI developer more capable and less likely to cause unintended side effects.

### What's in this template

```
CLAUDE.md                      ← Entry point, auto-read by Claude Code
AGENTS.md                      ← Symlink to CLAUDE.md (read by Codex)
README.md                      ← This file
CHANGELOG.md                   ← Project change history
ROADMAP.md                     ← Versioned plan of pending work

.claude/
  settings.json                ← Shared permissions + SessionStart hooks
  settings.local.json.example  ← Personal-override template (copied on first session)
  skills/                      ← Auto-loaded by Claude Code
    git/                       ← Commit risk classification + pre-commit checklist
    harness/                   ← Keep CHANGELOG / ROADMAP / conventions in sync
    memory/                    ← When and how to update memory files
    skill-creator/             ← How to create and improve skills

.codex/
  config.toml                  ← Codex agent config
  hooks.json                   ← Mirrors the Claude SessionStart hook

conventions/
  architecture.md              ← Directory map, layering rules, what NOT to change
  style.md                     ← Visual / UX direction: tokens, components, patterns

loop/
  PROMPT.md                    ← Loop launch line + usage-budget protocol + task protocol (hot-editable)
  STATE.md                     ← Self-paced /loop state; single source of truth

scripts/
  check-usage.sh               ← Subscription 5h/7d quota check (official API → native offline fallback)
  usage-estimate.py            ← Native 5h-block token estimator (no third-party deps)
  refresh-oauth.py             ← Refresh the local Claude Code OAuth token (reads ~/.claude credentials)

changelog/
  README.md                    ← Archive index for older CHANGELOG series

memory/
  rules.md                     ← Standing behavioral rules set by the user
  notes.md                     ← Discoveries and manually triggered notes

docs/                          ← Default home for agent-written docs; group by kind in subfolders
  README.md                    ← The docs organizing convention
```

### How to use this template

1. Create a new repo from this template. (If you `cp` it rather than using GitHub's "Use this template", copy with symlink preservation — `cp -a` — so `AGENTS.md → CLAUDE.md` survives. Git needs `core.symlinks=true`; Windows needs Developer Mode.)
2. Replace all `[placeholder]` and `FILL` fields across these files:
   - `CLAUDE.md` — project name, description, stack, owner, Component Map
   - `conventions/architecture.md` and `conventions/style.md` — your real architecture and design direction
3. Update each skill with your project's real workflow.
4. Remove this "About this template" section from the README and replace it with your project's own documentation.
5. At the start of each AI session, point the AI developer to `CLAUDE.md` (Claude Code) or `AGENTS.md` (Codex).

### Inspiration and references

- [Harness Engineering](https://openai.com/index/harness-engineering/)
- [Harness Design for Long-Running Apps](https://www.anthropic.com/engineering/harness-design-long-running-apps)
- [Effective Harnesses for Long-Running Agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
