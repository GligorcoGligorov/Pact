---
name: no-play-stats-in-trial
description: 8x confirmed the trial needs no Play Stats API, pulse or 8xsend; both MCP servers are removed
metadata:
  type: project
---

8x confirmed in #help (2026-09-30) that the Pact trial doesn't need the plays dashboard: no
Play Stats API work, and neither the `pulse` nor the `8xsend` MCP server. `.mcp.json` is
deleted, along with the setup docs that existed only for those two servers (`PULSE_TOKEN`,
`EIGHTXSEND_MANAGE_KEY`).

**Why:** the trial is judged on the product loop, locally ([[trial-local-only]]); nothing
reads this play's numbers from the dashboard.

**How to apply:**

- Events stay registered locally, in both registries, and `check:events` still gates them.
  First-party `analytics_events` is the sink that holds data during the trial.
- AGENTS.md (non-negotiable 2), `.claude/session-brief.py`, the `events`, `play-api`,
  `local-review` and `ship` skills, and the comments in `apps/web/src/app/api/dashboard/v1/`
  still say to ask `pulse`. For this trial, ignore those steps: there is no server to ask, and
  the events skill's `integration_check` step is skipped.
- Leave `apps/web/src/app/api/dashboard/v1/` and `dashboard-stats.ts` untouched. If the play
  ever reports to the dashboard, restore `.mcp.json` from git history and ask `pulse` for the
  live contract first.
