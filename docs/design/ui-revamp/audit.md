# UI revamp: the slop audit

2026-10-11. Every screen in `docs/showcase/` and the code behind it, read against the two
references in [refs/](refs/) (karma.business, 8xresearch.com) and the direction in
[plan.md](plan.md). Harsh on purpose.

## Across the whole product

1. **Emoji as the visual language.** 46 emoji in mobile UI code, 15 in the web app, 44 more in
   the contract's copy. The crew's identity mark is an emoji in a coloured disc (🏃 🧘 📚); the
   streak is 🔥; the saver is 🛟; results are 🏆 💯 🦸 😅 ☕; the celebration is an emoji burst
   (🎉🔥🏆). Nothing in the product is drawn; everything is borrowed from the system keyboard.
2. **Three progress metaphors for one fact.** A ring (today), a flame (the streak) and a row of
   rounded tiles (the chain). The chain is the product's idea and it is the least prominent of
   the three.
3. **Three accents fighting.** Brand green (every button, the user's name, the countdown on
   home), the crew colour as full-bleed fills (coral board hero, violet results card), and the
   semantic colours (red and green dots on the week strip, orange flame, amber "Not yet" chip,
   green "In" chip, green Nudge pill). No screen has one loud colour; most have four.
4. **Gradients.** The primary button is a green gradient with a coloured glow. Also the tab
   bar, the onboarding shell's wash, the web's `globals.css`, the plan card, the call to action,
   the landing's scene scroll and the device frame.
5. **Five shadow styles** (`soft`, `card`, `raised`, `overlay`, `cta`) over 34 call sites. Every
   card floats.
6. **Glassmorphism.** The floating tab bar, the round icon buttons and the sheet are frosted
   glass; the web nav is `backdrop-blur`.
7. **The identical white card.** Every section is the same white, 24-radius, soft-shadow card:
   hero, challenge, member list, streak, every award, every feed item, "How it works". The page
   is a stack of identical boxes, so nothing is more important than anything else.
8. **The AI eyebrow.** Letter-spaced uppercase in the brand colour above every title:
   "6AM RUN CLUB", "TODAY'S CHALLENGE", "IRON STREAK", "1 OF 3", "YOU'RE IN THIS PACT",
   "THE RESULTS ARE IN". It says nothing the title doesn't.
9. **Icon in a tinted square.** The challenge's eye-scan in a mint tile, the three "How it
   works" steps, the award discs, the welcome mock's cards. The single most recognisable
   generated-UI pattern.
10. **Type.** Bricolage Grotesque at 800 is the current default of generated landing pages;
    its ink traps read as "fun" without choosing to be. The countdown uses SF Pro Ultralight, a
    third face. Captions are italic in curly quotes.
11. **Labels that repeat the UI.** Home card: ring "2/4", text "2 of 4 in", and avatars with
    ticks: the same fact three times. Board: "Today" over today's list; "left to check in
    today" under a countdown that already says it; "Day 8 of 21" plus "8 of 21 days". The
    challenge explains itself every day ("Show it in your photo, so everyone knows it's from
    today."). Results: "Dan buys the coffees ☕" then "The stake was: Loser buys the coffees ☕".
12. **The logo** is a white "P" in a green rounded square. It could be any app.

## Screen by screen

**Intro (3 screens).** Emoji in coloured circles floating at random, a floating "☕ Loser buys
the coffees" chip, "1 OF 3" eyebrow, a dot pager, and the gradient pill with an arrow in a white
circle: the generated onboarding, item for item.

**Welcome.** Three tilted mock cards with shadows over a green radial wash, "🔥 7", a progress
bar. A good headline ("Nobody notices when you quit. Your friends will.") buried under the
props.

**Home.** "Hey, Ana!" with the name in green (the one coloured word is the least meaningful
one). The week strip copies the reference wholesale, with red and green dots. Each pact card
is emoji disc + eyebrow + title + ring + avatar stack + flame + its own full-width gradient
"Check in", so two pacts mean two competing primary buttons. "Results are in 🏆" in a blue pill.

**Board.** A full-bleed coral card carrying an emoji badge, the eyebrow, the habit, a ring and
a 64pt ultralight countdown. Then a challenge card with an icon tile, a 🛟 line, a "Today"
header, member rows with green/amber chips and green Nudge pills (a second green call to
action next to the real one), italic quoted captions, and a separate streak card with a flame
and 21 rounded tiles. The gradient "Check in" glows below it all. The chain, the thing the
whole product is about, is the last card on the page.

**Check-in and verdict.** The verdict caption is large, italic and quoted; the pass is an emoji
burst; the crew wall flies a print in. Fun, but generic fun.

**Results.** Violet full-bleed card, emoji badge, "12/14", "best run 6 🔥", the tile grid boxed
inside a white inset. The loser reveal is 😅, a headline, ☕, and the stake again with ☕. Six
identical award cards, each an emoji disc, a violet eyebrow, a name and a line.

**Activity.** The emoji reaction pills are user content and stay, but they sit in tinted pills
under an italic caption, in a white card, under a header that explains the list ("Your crews'
check-ins, newest first.").

**Join (app).** A white card with tracked-caps eyebrow, the green habit line, three icon-led
facts; avatar discs; "HOW IT WORKS" as three icon-in-tinted-square steps.

**Web landing.** A pill badge with an icon above the headline (the strongest single tell), a
two-tone headline coloured green on "Your friends will." (the one place colour works), a tilted
phone with a drop shadow, a round green arrow button, centred nav links, gradients.

**Web join page.** The "P" logo, an emoji disc, a tracked eyebrow, a copy of the app's coral
card with ring and ultralight countdown, avatar discs with ticks, a green stake pill with a
trophy icon.

**Web results page and share card.** The violet card again, seven emoji, identical award cards.

## What is worth keeping

The headline copy, the sentence-case voice, the stakes, the AI's one-liners, the drumroll
timing, the 400/700ms celebration budget, and the chain as an idea. The revamp changes how it
looks, not what it does.
