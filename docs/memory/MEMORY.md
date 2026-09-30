# Memory Index

Durable notes for this play. One line per note. See `AGENTS.md` ("Project memory") for how to write one.

- [pact-status](../pact-status.md) — read first: phase checklist, what exists, decisions, open items, how to run
- [trial-local-only](trial-local-only.md) — 8x trial: local only, no CI/store; free Apple ID means no push or Apple sign-in
- [no-play-stats-in-trial](no-play-stats-in-trial.md) — no Play Stats API, pulse or 8xsend in the trial; .mcp.json removed
- [local-replay-on-supabase](local-replay-on-supabase.md) — migration replay runs on the stack's Postgres as supabase_admin, in a throwaway DB

Worth writing early, once each is decided:

- The build environment traps for this play (signing, EAS profiles, Xcode caches).
- The monetization decision: what is free, what is paid, what the trial is.
- Launch markets and locale history.
- Which "aha" action `user_activated` fires on, and why that one.
- Anything a future session would otherwise rediscover the hard way.
