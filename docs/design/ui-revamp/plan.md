# UI revamp: the plan

2026-10-11. A visual revamp only: no new features, no new events (every existing `track()`
call stays where it is). The slop it answers: [audit.md](audit.md). References:
[refs/](refs/) (karma.business, 8xresearch.com, first viewport of each; both reveal the rest
on scroll, so a full-page capture is blank).

## The system

**One signature: the chain.** Interlocking links, one per pact day
(`apps/mobile/components/pact/Chain.tsx`). A kept day is a closed link in the crew's colour. A
missed day is a cut link in ink. Days to come are dashed outlines. Today's link draws itself
closed as the crew checks in (`in / held` of its perimeter), and the moment it closes is the
celebration. Every other edge-on link alternates, so it reads as a chain, not a row of pills.
It replaces the ring, the flame and the tile grid. The board hero shows it large (up to 11 per
row); home cards and results show it small.

**Palette: paper and ink.** Ground `#f2efe9`, ink `#151412`, the muted second line
`#5f5b54`; a dark "ink" scheme that inverts it. The accent is the ink itself (buttons are ink
pills). The crew colour is the only colour, as a line on the chain and the member's link, and
nowhere as a fill. The brand builder's gradient pair is now a flat pair, so every former
gradient renders as a fill. (`packages/brand/presets/daylight.ts`, `src/palette.ts`)

**Type.** Inter Tight 500/600 for headlines (56/42/32/24 at -0.05 to -0.03em), Inter for
text, IBM Plex Mono 500 caps for metadata: `DAY 08 / 21`, `05:59:12 LEFT`, `2 / 4`. The old
tracked-caps eyebrow role is now the mono label, everywhere at once. Headlines are two-tone:
line 1 ink, line 2 muted (`tone="tertiary"`). Bricolage Grotesque and SF Ultralight are gone.

**Engineered details.** Hairline rules between sections and rows instead of cards. Crosshair
corner marks (`components/ui/CornerMarks.tsx`) on the one block a screen is about. Tabular
figures on every number. Radii 2 to 8 for blocks, pills only for buttons. Spacing on 4/8:
32 between sections, 12 to 16 inside.

**One shadow.** `overlay` (sheets, modals, toasts). Every other elevation level is flat.

**Kill list.** No emoji as icons or decoration (crew emoji stay in the data; the UI stops
drawing them), no icon-in-a-tinted-square, no italic captions, no gradients, no glass, no
identical card stacks, no labels that repeat the UI.

**Celebrations.** The chain closing (380ms, the existing `CELEBRATION.landMs` budget) plus
the haptic, instead of the emoji burst. The results reveal keeps its drumroll timing.

## Order (one commit per step, gates green each time)

0. Foundation: brand tokens, fonts, flat fills, one shadow, `Chain`, `CornerMarks`.
1. **Board** (shown first, before the rest).
2. Home (pact cards with the small chain, no per-card primary button, tab bar without glass).
3. Check-in and verdict (no italic, no emoji burst; the crew wall shows links).
4. Results (chain, awards as a hairline list, the loser reveal without emoji).
5. Onboarding: intro and welcome (one idea per screen, no floating emoji).
6. Web: landing, join page, results page and its share card and OG images.

Each step: before/after screenshots in [shots/](shots/).

## Native note

The splash and status-bar colour in `app.json` moved to the new paper (`#f2efe9`), because
the theme test pins them to the ground. That one value ships with the next binary; everything
else in this revamp is JavaScript and font assets, so it is an OTA update. In this trial (local
only, no store) that means a rebuild for the splash colour only, whenever one happens.
