# UI revamp: the plan

2026-10-11. A visual revamp only: no new features, no new events (every existing `track()`
call stays where it is). The slop it answers: [audit.md](audit.md). References:
[refs/](refs/) (karma.business, 8xresearch.com, first viewport of each; both reveal the rest
on scroll, so a full-page capture is blank).

## Revision 2, 2026-10-11: real content is the hero

The chain is gone everywhere. The signature is **the Crew Wall**
(`components/wall/WallGrid.tsx`, `GET /api/app/v1/pacts/:id/wall`): the crew's real check-in
photos, one column per member, one row per day, newest on top. A full row is a kept day (a
frame in the crew's colour and a glow); a missing photo is a dashed tile with initials,
breathing on today's row; a tap opens the photo full screen with the caption and reactions
(`PhotoViewer`). It is the board's hero, home's mini grid (last three days), the verdict's
landing (your tile pops in, the row lights up if it closed the day) and the first results
slide (the whole pact).

**The signed pact** (`app/pact/[id]/sign.tsx`, `POST /api/app/v1/pacts/:id/signature`,
`pact_members.signature`): on create and join each member signs a contract card with a finger
("I, Ana, promise: run for 20 minutes, every day for 21 days. If I break it, I buy the
coffees."; `pledgeLine` in the contract). Signatures show on the pact details and the last
results slide.

**Dark first:** near-black ground, each pact screen on its crew's deep tint
(`CrewTone.deep`), the crew colour saturated on the hero with a glow (`CrewTone.glow`).
**The daily challenge** is a full-screen moment before the camera
(`components/pact/ChallengeMoment.tsx`). **Results are stories** you tap through
(`components/results/Stories.tsx`): wall → awards → drumroll → who pays → the signatures, a
share button on every slide. Demo photos: `npm run demo:photos` (Unsplash via Lorem Picsum,
gitignored) before `npm run seed:demo`.

## Revision 1, 2026-10-11: louder

After the first board ("the editorial base is right, but too quiet"): each screen gets **one
loud block in the crew's solid colour** (`components/pact/CrewHero.tsx`), its text and chain in
the crew's `onFill`, and everything else stays paper and ink. The chain got bigger, thicker and
a halo in the crew's colour lifted toward white (`CrewTone.glow`); it is one row around today
(future days fade out) instead of the full pact in rows; links draw in 60ms apart on open,
today's link breathes, and when it closes it snaps shut with a haptic and a halo pulse. Stats
count up (`components/motion/CountUp.tsx`), the countdown ticks every second, and the board
shows the whole crew with each member's link (`components/pact/CrewLinks.tsx`). The hero grows
in on open; a true shared-element transition needs Reanimated's static
`ENABLE_SHARED_ELEMENT_TRANSITIONS` flag, a native rebuild, so it is not in this OTA-only pass.
The sections below are the original plan; where they say "the crew colour only as a line",
the revision wins.

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

0. Foundation: brand tokens, fonts, flat fills, one shadow, `CornerMarks`. Done.
1. **Board**. Done.
2. Home: the owed pact as the loud block with its check-in, quiet rows, paper tab bar. Done.
3. Verdict: the photo on the crew block, today's link closing, monochrome crew wall. Done.
4. Results: the whole chain, awards as a numbered list, the reveal as a mono drumroll. Done.
5. Onboarding: intro and welcome (one idea per screen, no floating emoji). To do.
6. Web: landing, join page, results page and its share card and OG images. To do; the web
   already picks up the new fonts and palette from `@app/brand`, but its components still
   carry the old cards, emoji and gradients.

Each step: before/after screenshots in [shots/](shots/).

## Native note

The splash and status-bar colour in `app.json` moved to the new paper (`#f2efe9`), because
the theme test pins them to the ground. That one value ships with the next binary; everything
else in this revamp is JavaScript and font assets, so it is an OTA update. In this trial (local
only, no store) that means a rebuild for the splash colour only, whenever one happens.
