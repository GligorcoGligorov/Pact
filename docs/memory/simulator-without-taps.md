---
name: simulator-without-taps
description: An agent can screenshot and deep-link the iOS simulator here, but cannot tap or swipe it
metadata:
  type: reference
---

On this Mac an agent can drive the simulator only with `xcrun simctl`: `io booted screenshot`,
`openurl booted "pact://pact/<id>/result"` (any app route by deep link) and
`terminate`/`launch com.gligorcogligorov.pact` (which also picks up a new bundle when Metro's
reload doesn't). There is no idb or cliclick, and AppleScript isn't allowed to drive System Events,
so it can't tap, type or scroll (checked 2026-10-06).

**How to apply:** to see a state below the fold or behind a tap, make a temporary local edit
(start in that state), screenshot, and restore the file. Leave hand passes (taps, the camera) to
the developer. See [[trial-local-only]].
