# Pact — demo script (Group 2 call, Fri 2026-10-02, 7:40–8:10pm PKT)

About 5 minutes. Read it out loud and keep it relaxed.

## 1. Intro (30 seconds)

"Hi, I'm Gligorco. My project is called **Pact**. It's a habit app for small groups.

The problem: people quit habits because nobody notices when they stop. With a solo tracker you
can miss a day and nobody sees it.

In Pact, 2 to 8 friends make a pact, like 'run every morning for 3 weeks'. Every day each person
checks in with a photo, and an AI judge looks at the photo and comments on it. Missing a day
breaks the day for the whole group, so your friends are the reason you keep going."

## 2. What I built so far (about 45 seconds)

- "The whole backend for the core loop: create a pact, invite friends with a 6-letter code,
  join, and check in with a photo."
- "The day logic. Each pact has its own timezone, a daily challenge like 'hold up three fingers'
  so you can't reuse an old photo, plus streaks and a 'chain' of kept and broken days. All of
  it is covered by tests."
- "The AI judge. It runs on Gemini, and if Gemini fails it falls back to Groq. It gives a
  verdict, pass or suspicious, a one-line reason and a funny caption. It only advises: it never
  fails anyone."
- "The app runs on the iPhone simulator, with email sign-in and notifications working. The
  Pact screens in the app are what I'm building next."

## 3. Live demo (2–3 minutes)

**Step 1 — the demo data (Supabase Studio, http://127.0.0.1:55323 → Table editor →
`check_ins`)**

"This is a seeded demo pact, '6am Run Club', with 4 people and a week of check-ins. Look at
these columns: each check-in has the AI's verdict and caption, like 'Three fingers, zero
excuses.' and 'Proof, reluctantly accepted.'"

**Step 2 — the AI judge live (terminal)**

Run this one. Groq answers in about 1 second per photo:

```bash
npm run eval:judge --workspace=@app/web -- --provider=groq
```

"This is my test set for the judge. They're deliberately fake proofs: a screenshot of a
running app, a pizza when the habit is salad, a book with no blue object for the challenge.
The judge catches all of them and roasts them. For example: 'A mug with ambitions, but no pages
or fingers in sight.' 8 out of 8 match what I expected."

**Step 3 — the plan (open docs/pact-requirements.md, scroll to "Problem" and "The Thursday
slice")**

"Everything is specced before I build it: requirements, a phased plan and analytics events
registered before each feature. That way every step of the funnel is measured."

(Skip the website at localhost:3000. It's still the template's landing page and hasn't been
rebranded yet.)

## 4. What's next (20 seconds)

- "The mobile screens: create a pact, join by code, a camera check-in, the AI verdict screen
  with confetti, and today's board showing who's in."
- "Then the social part: nudging a friend who hasn't checked in, a 10pm '2 hours left'
  reminder, a public join page, and a shareable results card that shows who lost the pact."

## 5. Where I'm stuck / what I need (20 seconds)

- "Speed. Gemini's free tier sometimes takes 15–20 seconds or returns errors, which is why I
  added Groq as a fallback. I'd love advice on whether that's fine for a demo."
- "Feedback on the core idea: is a group pact with an AI judge the right hook, or should I
  focus on something else?"

## 6. Likely questions

- **Who is it for?** "Friends, roommates or gym buddies who want to keep each other honest,
  people who've already tried solo trackers and quit."
- **How does it make money?** "Not decided yet. The obvious path is free for one pact and paid
  for more pacts or bigger groups. The stake in a pact is free text, never real money."
- **What if the AI is wrong?** "It only advises. Every check-in still counts. A suspicious one
  shows a flag and the reason to the group, and the friends decide."
- **Why this tech?** "Expo and React Native for the app, Next.js and Prisma for the API, and
  Supabase for auth and storage. It's the 8x template. For the AI I use free providers behind a
  small interface, so I can switch models easily."
- **Timeline?** "Backend done. Mobile screens next, then the social loop, then a real 3-day
  test pact with friends."

## 7. Backup if the demo fails

- The terminal output from today's eval run (8 of 8): keep a screenshot of it open.
- Open `docs/pact-status.md` and walk through the phases table: what's done and what's next.
- If Studio won't load, just talk through the seeded captions above.

## Pre-call checklist

- [ ] Docker running, then `supabase start` (Studio at http://127.0.0.1:55323)
- [ ] Terminal open in the repo, with the Groq eval command typed and ready
- [ ] Tabs: Studio → `check_ins` table, `docs/pact-requirements.md`, the eval screenshot
- [ ] Optional: try the Groq eval once 10 minutes before the call
- [ ] No need to log in to admin; it isn't part of the demo
- [ ] Notifications off (macOS Focus), Slack and Discord muted, unneeded tabs closed
- [ ] Mic and camera tested in the meeting link
