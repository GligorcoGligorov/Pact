# Web revamp: the plan

2026-10-12, branch `feat/web-revamp`. The app was revamped on 2026-10-11
([ui-revamp](../ui-revamp/plan.md)); the website kept its first-pass layout: a static wall
beside a headline, a four-column numbered list, three phone screenshots and a code box. Theo's
verdict on the cohort's landings ("the first output from AI") applies to it. The bar is
karma.business and 8xresearch.com.

## What I studied

Both sites in Playwright at 1440×900, scrolled slowly top to bottom, a screenshot per screen
height and a scroll video each, in [refs/](refs/) (`karma-NN.jpg`, `8xresearch-NN.jpg`,
`*-scroll.mp4`). Also [ui-revamp/plan.md](../ui-revamp/plan.md),
[ui-revamp/audit.md](../ui-revamp/audit.md) (the slop list still applies),
[pact-ui-brief.md](../pact-ui-brief.md) and `.impeccable/design.json` (the template's original
dusk/daylight contract; superseded for Pact by the ui-revamp plan, which this follows).

## Ten techniques, and what each becomes on Pact

| #   | Seen                                                                                                                                                                             | Where                                 | On Pact                                                                                                                                                                                                                                                              |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **One hero object that performs.** Karma's arrow sits in a construction frame and morphs into the next section's outline; 8x Research's orb reacts to a click.                   | karma-00/01, 8xresearch-01            | **The Crew Wall assembles itself**: tiles flip in on a spring, Dan's tile waits dashed and pulsing, the row locks, a coral line sweeps across it: DAY KEPT. Loops with new photos; tilts toward the cursor.                                                          |
| 2   | **Construction lines and crosshairs.** Karma frames the hero with registration ticks, `+` crosshairs and a dotted grid fading out.                                               | karma-00, 8xresearch-04 (study frame) | A faint 80px construction grid behind the hero and the step stage, `+` crosshairs on grid intersections near the object, corner brackets on the wall, the pact card and the stage.                                                                                   |
| 3   | **Two-tone headlines.** White line then grey line ("The research work. / Off your to-do list."); Karma does it in colour ("Verified owners").                                    | 8xresearch-02/03/08, karma-04         | Every section headline: "Nobody notices when you quit. / Your friends will.", "Four steps. / One promise.", "Your turn. / Sign something.", "Same crew, / new pact."                                                                                                 |
| 4   | **Pinned scroll with a numbered step rail.** 8x Research pins "How it works" and walks five steps on a right-hand rail of `01…05` with tick marks; the active one fills.         | 8xresearch-02…05                      | "How it works" pins for four screens: a right rail `01–04` with ten ticks each that fill as you scroll; the stage morphs per step, built from real components (typing pact, signatures drawing, the challenge with countdown and shutter, the wall then "Dan buys"). |
| 5   | **Mono micro-labels.** `01 / SPOT`, `[ INSIDE KARMA ]`, `HEARD IN 4 OF 6`.                                                                                                       | 8xresearch-02, karma-06               | `01 / MAKE THE PACT`, `DAY 08 / 21`, `05:59:12 LEFT`, `ANA · RUN · 06:42`, `[ DEMO · NOTHING IS SAVED ]`. Plex Mono, caps, tracked, tabular.                                                                                                                         |
| 6   | **Lines that draw on scroll.** Karma's three coloured strokes sweep between steps and then converge on a hub.                                                                    | karma-02…05, karma-13                 | The numbers section: hairlines draw from one stat to the next as it scrolls into view, ending on the coral one. Signatures everywhere draw themselves stroke by stroke (same technique, smaller).                                                                    |
| 7   | **Real people as the hero material.** 8x Research's first viewport is a mosaic of real portraits on flat colour fields, the headline set into the grid, caption chips on photos. | 8xresearch-00                         | Real check-in photos everywhere the landing shows a crew: the hero wall, the marquee with `NAME · HABIT · TIME` chips. (Public join/results pages stay photo-free: R25, R27.)                                                                                        |
| 8   | **An interactive "Your turn."** 8x Research ends its story with "Your turn. Tell us what you're building." and an orb you click to talk.                                         | 8xresearch-01                         | "Your turn.": type your own pact sentence, sign it with a mouse or finger, watch your signature land beside three crew signatures with a paper-stamp thud. Nothing is saved. CTA: "Start your pact".                                                                 |
| 9   | **Auto-advancing tabs with floating proof cards.** Karma's console steps `01 Brief it / 02 Get matched / 03 See results`, toasts pop in over the product.                        | karma-06…08                           | Inside the step stage: the challenge card's shutter flash, then the verdict chip ("IN · 06:42") pops over the photo; on results the wall settles, then the stake lands big.                                                                                          |
| 10  | **One full-colour band at the end, a solid nav pill, a theme toggle.** 8x Research closes on a violet band with a two-tone headline; its nav is a solid pill with a sun toggle.  | 8xresearch-07/08, karma (nav pill)    | A coral band ("Same crew, / new pact.") with the magnetic CTA, a solid nav pill that shrinks on scroll, a sun/moon toggle for light mode, and a 1px coral scroll-progress line under the nav.                                                                        |

What I deliberately did **not** take: Karma's pastel gradient washes and soft drop shadows,
the icon-in-a-disc trust row under its burst (karma-13), 8x Research's gradient orb, and every
FAQ accordion. The app's kill list holds: no emoji, no gradients, no glass, no icon cards.

## Language (same as the app)

Near-black ground (the dark scheme of `@app/brand`), one saturated crew colour per section
(coral leads; the challenge step is sun, the results step violet, as the app's crews are),
real photos as the hero material, Inter Tight 600 headlines tracked tight in two tones,
Plex Mono micro-labels, corner marks and crosshairs, a faint construction grid. Light mode
is a toggle on `<html data-scheme>`, remembered per browser, applied before first paint.

## The landing, section by section

1. **Hero.** Left: mono kicker, the headline revealed line by line from a clip
   ("Nobody notices when you quit." white, "Your friends will." grey), a short promise, two
   CTAs (the primary "Start your pact" is magnetic; the secondary "Got a code?" opens the code
   field). Right: the Crew Wall stage in corner marks over the grid: header `6AM RUN CLUB ·
DAY 08 / 21`, a ticking mono countdown, three rows of four. The loop: the top row's tiles
   flip in one by one on a spring and land with a soft coral glow; Dan's tile stays dashed,
   pulsing `WAITING ON DAN`; after ~3s his photo drops in, the row locks (frame + glow) and a
   coral line sweeps across it with `DAY KEPT`; the rows shift down and a new day starts with
   new photos. Pointer: the stage tilts (±6°) and its layers parallax. Mobile: the wall goes
   full width under the headline, no tilt.
2. **Marquee.** Two rows of real check-in photos with mono captions (`ANA · RUN · 06:42`),
   moving in opposite directions; hovering a row pauses it; edge fade by mask, not gradient
   paint. CSS transform animation only.
3. **How it works** (`#how`). 400vh tall, a sticky stage. Left: the step's mono label, a
   two-tone title and one line. Centre/right: the visual. Far right: the rail. Steps:
   01 make the pact (the sentence types itself, caret blinking), 02 everyone signs (four
   signatures draw stroke by stroke, names under them), 03 the daily challenge (sun:
   "Include something red", the countdown, the shutter flash, the verdict chip), 04 the
   results (violet: the full wall, then "Dan buys the coffees." big). Mobile: no pin; four
   stacked panels that play as each enters view.
4. **Your turn.** (`#start`). A sentence field ("I promise to …"), a signature pad, and the
   pact card beside it (desktop) / under it (mobile) with three demo signatures and an empty
   line that receives yours, then a stamp `SIGNED · 12 OCT` thuds on. CTA "Start your pact"
   goes to the code box / app; nothing is saved.
5. **Numbers.** Big mono count-ups from the demo seed (`npm run seed:demo -- --finished`): 18
   days kept, 80 photos, 2 crews, 1 round of coffees. Hairlines draw between them on scroll.
6. **Final CTA band** in full coral: "Same crew, / new pact." with the magnetic CTA and the
   invite-code field, then a minimal footer (wordmark, four links, one line).

Global: Lenis smooth scroll (off under reduced motion), a solid nav pill that shrinks after
the first screen, a 1px coral progress line, staggered reveals, hover states on every link
and button, a coral focus ring with offset.

## Join, results, share card

- **Join** (`/join/[code]`): two columns on desktop, one on the phone. The pact sentence big
  (`pledgeLine`), the crew's presence wall assembling row by row (presence only, never a
  photo), the signatures drawing themselves, the stake, then one CTA (the existing
  `JoinPanel`).
- **Results** (`/results/[pact]`): the app's stories as a scroll: the wall (whole pact, rows
  landing in order), the awards (one at a time), who pays (big, the drumroll as a mono count),
  the signed pact (signatures drawing). Each chapter pins on desktop and reveals; no photos.
- **Share card** (`/results/[pact]/card`, OG images): near-black, corner marks, the crew colour
  as the one colour, the presence grid, the two-tone headline, mono labels.

## Events (registered before the code; `events` skill)

- `cta_clicked` gains `cta` values `hero_start`, `hero_code`, `your_turn`, `closing` (the
  discriminator is already declared).
- `story_view` now fires when "How it works" first pins into view (same moment it measured
  before: a visitor got past the first viewport).
- New `demo_pact_signed`: a visitor finished a signature on the "Your turn." pad. It is the
  landing's engagement signal: if many sign but few click "Start your pact", the CTA is the
  problem; if few sign, the section is.
- New `site_theme_changed` `{ scheme }`: the light/dark toggle (a settings toggle is a
  user-visible change). PostHog/GA4 only matter here; first-party keeps it too.

## Tech

`motion` (already installed) for springs, `useScroll` and the pinned sections (no GSAP: one
library, smaller bundle); `lenis` for smooth scroll. Transform and opacity only; images through
`next/image` with sizes; everything below the hero lazy. Reduced motion: no Lenis, no pin, no
loop: the hero shows the kept wall still, steps stack, signatures are drawn, numbers are final.

## Quality loop: scores

Each section after its commit, screenshots at 1440 and 390 and a short video in
[shots/](shots/) and [videos/](videos/), scored 1–10 on craft, motion, originality and "would
8x ship this". Below 8 means redo. Filled in as I go.

| Section      | Craft | Motion | Originality | 8x ship | Notes                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------ | ----- | ------ | ----------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hero         | 8     | 9      | 9           | 8       | Pass 1 was a 6: the headline wrapped a word per line, the CTAs fell below the fold, every kept row glowed (no single moment), the CTA arrow was clipped and photos flipped in before they loaded. Fixed: set three lines at 5.1rem, wall column widened, glow only on the live row, arrow swap rebuilt, next day preloaded; also two hydration mismatches under reduced motion. `shots/01-hero-*`, `videos/hero.mp4`. |
| Marquee      | 8     | 8      | 8           | 8       | Pass 1 was a 7: a generic photo marquee, captions truncated on the phone. Pass 2: a coral `IN` stamp per photo, two-line captions, and the AI judge's deadpan line rises over a photo on hover (tap holds a row on touch). `shots/02-*`, `videos/marquee.mp4`.                                                                                                                                                        |
| How it works | 9     | 9      | 9           | 9       | Pinned four screens with a 01–04 tick rail and the ground taking each step's crew colour (coral, coral, sun, violet). Pass 1 fixes: the results card's corner marks were clipped, the wall behind "Dan buys" was too busy (13% now), the photo hid the shutter, the stamp covered Dan's label. Phone: stacked, each plays in view. `shots/03-*`, `videos/how-it-works.mp4`.                                           |
| Your turn    | 8     | 8      | 9           | 8       | Type a pledge (or tap an idea), sign on the pad with a mouse or finger; the card takes your words live and your signature as each stroke ends, beside three crew signatures, then the stamp comes down and the card takes its weight. Pass 1: the stamp landed on the signature and hid it; now an opaque stamp hangs off the card edge (shared with step 02). `shots/04-*`, `videos/your-turn.mp4`.                  |
| Numbers      |       |        |             |         |                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Final CTA    |       |        |             |         |                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Join         |       |        |             |         |                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Results      |       |        |             |         |                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Share card   |       |        |             |         |                                                                                                                                                                                                                                                                                                                                                                                                                       |
