# Pact UI brief (for Phase 3)

Paste into Claude Code when starting the mobile slice. Put the 4 reference
screenshots in `docs/design/refs/` first so Claude can look at them.

```
UI direction for Pact. References are in docs/design/refs/ — look at each
before designing. Here's exactly what I want from each, and what I don't:

1. Habit Tracker "Moe" (Purrweb) — the overall feel.
   Take: warm off-white background (#F8FAED), one strong green (#50A65C),
   near-black (#232323) for contrast; big bold greeting ("Hey, Ana!");
   the horizontal week strip with the current day as a black pill;
   soft rounded cards with the habit, a status chip (New / Skip / Done)
   and a right-hand metric; the floating dark bottom bar with a green
   primary pill. The confetti "Good job!" screen after completing.
   Skip: the mascot characters (no time to illustrate well).

2. Daily Goal & Streak widgets — the streak.
   Take: the huge streak number with the flame; the row of day tiles
   (check / missed / today ringed / future dim / rest day). Use this row
   as our "chain": one tile per pact-day, coloured kept / broken / saver.

3. Countdown Timer — the check-in / deadline moment.
   Take: the giant thin countdown numbers over a full-bleed photo.
   Use it for the today board header ("2h 14m left") and for the proof
   photo preview after capture.

4. Apple Fitness — group progress.
   Take: the progress ring and the week of small rings. Use a ring for
   "3 of 4 in today" on the pact card, and small rings per member.

Design tokens: put these colours into packages/brand (no hex in
components, the brand test enforces it). Font: a grotesk like the refs
(Founders Grotesk is paid — pick the closest free one, e.g. Inter Tight
or Space Grotesk, and tell me which).

Rules: check-in max 2 taps from home; every screen has loading, empty
and error states; haptic + confetti on a passed check-in; the AI caption
is shown big and playful on the verdict screen. Show me the screen list
with states before coding, then critique your own screens against these
refs after the first pass.
```
