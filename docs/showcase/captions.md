# Pact — showcase

Light mode, in story order. App shots are from the iOS simulator (iPhone 16 Pro) on the demo seed
(`npm run demo:reset`); web shots are from the local Next.js server.

1. `01-intro-1.png`: intro 1, "Make a pact with your crew". One habit, a few friends, a fixed run of days, and a stake.
2. `02-intro-2.png`: intro 2, "A photo every day, with a twist". A daily challenge in the photo proves it's from today; an AI takes a look.
3. `03-intro-3.png`: intro 3, "Keep the chain together". A day only counts when everyone's in: the whole hook.
4. `04-welcome.png`: the welcome screen. Pact's tagline and three Pact moments dealt as cards, one tap to start.
5. `05-sign-in.png`: email sign-in. No password to forget; a code arrives by email.
6. `06-sign-in-code.png`: the code step. The emailed code, verify, resend; that is the whole of auth.
7. `07-sign-in-mailpit.png`: the sign-in email in Mailpit. The local stack sends real auth mail, so the flow is testable end to end.
8. `08-home.png`: home for Ana. The countdown to today's deadline, the week strip and each pact's crew progress at a glance.
9. `09-create-pact.png`: create a pact. Name, the habit, and the crew's colour and emoji, chosen from the picker.
10. `10-invite-code.png`: the invite code. One short code to send; up to eight people per pact.
11. `11-join-web.png`: the join page on the web. A friend without the app sees the pact live before installing.
12. `12-join-link-preview.png`: the invite's link preview image. What the crew sees when the code is pasted into a chat.
13. `13-join-app.png`: joining in the app. The pact, its dates, the stake and the crew, before committing.
14. `14-board.png`: the pact board. Time left today, today's photo challenge, the saver offer, and who's in and who to nudge.
15. `15-activity-feed.png`: the activity feed. The crew's check-ins, newest first, with the AI's one-liner and reactions.
16. `16-results-awards.png`: the results. Days kept together, the chain of the full run, and the awards.
17. `17-results-web.png`: the shareable results page. The stake revealed ("Dan buys the coffees") and the awards, public by link.
18. `18-share-card.png`: the share card image. The results as one PNG, drawn by the server, ready for a story.
19. `19-pact-settings.png`: pact settings. Dates, cadence, code and stake, the crew list, and leave.
20. `20-landing.png`: the landing page. "Nobody notices when you quit. Your friends will." with the invite-code field.

## Not captured

These need a tap or a gesture, and this session had no way to drive the simulator's touch
input (no `idb`, and AppleScript was not authorised). Capture them by hand:

- Check-in (opens the system photo picker), the AI verdict (pass and flagged).
- The crew wall polaroid and the scoreboard (below the fold; they need a scroll).
- The results reveal before and after the drumroll in the app (needs the Reveal tap; the web page
  above shows the after state).
- The nudge banner, crew complete celebration, milestone card and saver card (each needs a check-in,
  a nudge or a saver tap from a second account).
