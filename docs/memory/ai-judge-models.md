---
name: ai-judge-models
description: Which vision models the judge's free keys can use, and how to check without printing the keys
metadata:
  type: reference
---

Checked 2026-10-01 against the developer's keys:

- **Gemini:** `gemini-2.5-flash` is listed but refuses `generateContent` with 404 "no longer
  available to new users"; Google names `gemini-3.8-flash`, which the judge uses. A model
  lookup (`GET /v1beta/models/<id>`) succeeding does NOT mean it can generate: test a call.
- **Groq:** Llama 4 Scout is gone from the key's model list (404 `model_not_found`). Of what it
  lists, only `qwen/qwen3.8-27b` took an image; the others are text or audio. The judge uses it.

**Why:** both of the plan's models had gone stale; a model id can disappear without warning.

**How to apply:** when a provider starts failing with 404, list the models from inside Node
with the key loaded by `node --env-file=.env.local` (in `apps/web`), printing ids and statuses
only, never the key: Gemini `GET https://generativelanguage.googleapis.com/v1beta/models`
(header `x-goog-api-key`), Groq `GET https://api.groq.com/openai/v1/models` (bearer). Then run
`npm run eval:judge` on the candidate. The model ids are one constant each in
`apps/web/src/server/ai/gemini.ts` and `groq.ts`. See [[trial-local-only]].
