/**
 * The event-name registry. Single source of truth for everything this play
 * measures on the web.
 *
 * Client-safe: this module has NO server imports, so it is importable from
 * client components. That matters because the same constants feed both the
 * client `gaEvent` call sites AND the server-side TRACKED_EVENTS whitelist in
 * `lib/analytics/record.ts` — sharing the constants is what stops the two from
 * drifting.
 *
 * An event fired but not registered here is rejected by /api/track with a 400
 * and disappears with no error anywhere a person would see it. Real plays have
 * lost their main funnel step this way for months. `npm run check:events`
 * exists to make that impossible; it runs in CI.
 *
 * Adding events: use the `events` skill (.claude/skills/events/). It asks the
 * questions the code cannot answer — what the "aha" is, where the drop-off is,
 * what discriminator each event carries.
 *
 * Naming: snake_case, object then action (`checkout_started`, not
 * `start_checkout`). Reuse an existing name when the moment is the same moment;
 * two names for one action means every funnel built on either is wrong.
 */

/**
 * Marketing funnel — the anonymous top of funnel.
 *
 * These fire for GUESTS, who are most of the traffic on these pages. They are
 * recorded first-party against a session id rather than a user id, which is the
 * only way landing → pricing → signup conversion is computable at all.
 *
 * `pricingView` is the one that matters: it is the denominator for every
 * conversion rate this play will be judged on.
 */
export const FUNNEL_EVENTS = {
	/** The landing page was viewed. */
	landingView: 'landing_view',
	/** The pricing page or pricing section was viewed. */
	pricingView: 'pricing_view',
	/** A plan was selected on the pricing page. metadata: { plan } */
	planSelected: 'plan_selected',
	/** The waitlist form was submitted. */
	waitlistJoined: 'waitlist_joined',
	/** The contact form was submitted. */
	contactSubmitted: 'contact_submitted',
	/**
	 * A store button was clicked through to App Store / Play. metadata: { store, placement }
	 *
	 * `store` is the first-party discriminator (one row per store per visitor per
	 * day). `placement` ('hero' | 'closing') rides to PostHog and GA4 only: it
	 * answers "which part of the page sends people to the store", a design
	 * question for funnels, and widening the first-party dedupe key with it would
	 * count one visitor's two clicks on the same store as two store visits.
	 */
	storeBadgeClicked: 'store_badge_clicked',

	// The landing page's own interactions. None of them is the conversion (that
	// is a store click or a waitlist join); each one explains a drop before it.

	/**
	 * An in-page call to action was clicked. metadata: { cta }
	 * `cta` is the discriminator: 'nav' (the capsule nav's "Get the app") or
	 * 'pricing_teaser' (the landing pricing section's link to /pricing). Compare
	 * each against `store_badge_clicked` to see whether the nav or the page is
	 * doing the sending.
	 */
	ctaClicked: 'cta_clicked',
	/**
	 * The scene-scroll story on the landing page came into view (once per page view).
	 * Its share of `landing_view` is how many visitors get past the first
	 * viewport; if it is low, the hero is the problem, not the story.
	 */
	storyView: 'story_view',
	/**
	 * A FAQ answer was opened, on the landing page or /pricing. metadata: { question }
	 * `question` is the discriminator (a stable slug from src/lib/faq.ts), so the
	 * count per question is real: the most-opened question is the objection the
	 * page above it failed to answer.
	 */
	faqOpened: 'faq_opened'
} as const

export const FUNNEL_EVENT_NAMES = Object.values(FUNNEL_EVENTS)

/**
 * Account lifecycle.
 *
 * Every one of these ALSO goes to the Play Events API (lib/plays/events.ts),
 * because they are what the platform's email automation runs on. `signupCompleted`
 * and `accountDeleted` are mandatory for every play — the second is the GDPR
 * right-to-be-forgotten hook and must never be skipped.
 *
 * `userActivated` is the only one you have to decide: it fires on this play's
 * "aha", the single action that means the product worked. If you cannot name
 * that action, the play has no success criterion yet, which is worth saying out
 * loud before building more of it.
 */
export const LIFECYCLE_EVENTS = {
	/** An account was created. metadata: { signup_method } */
	signupCompleted: 'signup_completed',
	/** The user reached this play's "aha". metadata: { activation_type } */
	userActivated: 'user_activated',
	/** Onboarding finished. */
	onboardingCompleted: 'onboarding_completed',
	/** The account was deleted / erasure requested. metadata: { reason } */
	accountDeleted: 'account_deleted',
	/** Product-email opt-in toggled. metadata: { subscribed } */
	marketingConsentChanged: 'marketing_consent_changed'
} as const

export const LIFECYCLE_EVENT_NAMES = Object.values(LIFECYCLE_EVENTS)

/**
 * Paywall and checkout.
 *
 * The gap between `checkoutStarted` and `purchase` is the drop that never
 * reached a payment sheet, which is a different problem from a sheet people
 * abandoned — so both exist deliberately.
 *
 * `purchase` is recorded with dedupe OFF: every occurrence is a row. Deduping
 * money by day would merge a customer's second purchase into their first.
 */
export const CHECKOUT_EVENTS = {
	/** The paywall / upgrade screen was viewed. metadata: { source } */
	upgradeView: 'upgrade_view',
	/** Checkout began — a real payment sheet is opening. metadata: { plan, price_cents } */
	checkoutStarted: 'checkout_started',
	/** Payment succeeded. metadata: { plan, price_cents, currency } */
	purchase: 'purchase',
	/** Payment failed. metadata: { plan, reason } */
	paymentFailed: 'payment_failed',
	/** A trial began. metadata: { plan } */
	trialStarted: 'trial_started',
	/** Auto-renew was turned off; access continues to period end. metadata: { plan } */
	subscriptionCancelled: 'subscription_cancelled',
	/** Access actually ended. metadata: { plan } */
	subscriptionExpired: 'subscription_expired',
	/** A refund was issued. metadata: { plan } */
	refundIssued: 'refund_issued'
} as const

export const CHECKOUT_EVENT_NAMES = Object.values(CHECKOUT_EVENTS)

/**
 * Pact — the product loop, judged on the pact completion rate: the share of
 * held member-days that have a check-in (docs/pact-requirements.md).
 *
 * `checkInCreated` is THE metric's numerator. The loop, in order, is
 * created → joined (a second member) → check-in → a check-in on day 2; a pact
 * that stalls shows as the gap after its last step. The "aha" is not here: it
 * is `user_activated` with `activation_type: 'first_group_check_in'`, emitted
 * once per person (dedupeForever) by the check-in route.
 *
 * Every one of these is recorded SERVER-SIDE with `recordUserEvent` from the
 * /api/app/v1 route that did the thing: the app cannot write first-party, and a
 * browser must not be able to forge the metric, so /api/track refuses them
 * (SERVER_ONLY_EVENT_NAMES below). All carry `pact_id`, and all are recorded
 * with `dedupeDaily: false`: the database's unique constraints already bound
 * them (one member row per person, one check-in per person per pact-day, one
 * nudge per pair per day), and a UTC-day dedupe would drop a person's check-in
 * in their second pact, or merge two pact-local days that share a UTC date.
 */
export const PACT_EVENTS = {
	/** A pact was created. metadata: { pact_id, cadence } */
	pactCreated: 'pact_created',
	/** A NEW member joined (an idempotent re-join does not fire). metadata: { pact_id, source } */
	pactJoined: 'pact_joined',
	/** A check-in was created. metadata: { pact_id, kind: 'photo' | 'saver' } */
	checkInCreated: 'check_in_created',
	/**
	 * A crew member reacted to a check-in in the feed (🔥 👏 😂), recorded when a NEW reaction
	 * row is written, never on a take-back. metadata: { pact_id, reaction }. Reactions are
	 * the feed's whole point: they make it social, not a log. Bounded by the database's one
	 * row per person, check-in and reaction.
	 */
	checkInReacted: 'check_in_reacted',
	/**
	 * The last member held today checked in, so the whole crew kept the day: the loop's best
	 * moment, and the one the crew-complete banner celebrates. Recorded once per pact-day, for
	 * the member whose check-in completed it. metadata: { pact_id, day_number, streak }
	 */
	pactDayKept: 'pact_day_kept',
	/**
	 * The AI judge finished with a check-in. metadata: { pact_id, verdict }
	 * A high `suspicious` share on real check-ins means the prompt is wrong,
	 * not the people.
	 */
	checkInJudged: 'check_in_judged',
	/** A member nudged a held member who was still out. metadata: { pact_id } */
	nudgeSent: 'nudge_sent',
	/**
	 * The closer closed a pact's end day: the pact is over and its results are in. Recorded
	 * once per pact (the closer's `closed_through` makes it once), for the owner.
	 * metadata: { pact_id, outcome: 'loser' | 'nobody_pays', kept_days, total_days }
	 * kept_days / total_days across pacts is how well crews actually hold together.
	 */
	pactCompleted: 'pact_completed',
	/**
	 * A member opened a finished pact's results, recorded by GET pacts/:id/result once per
	 * person, pact and day. metadata: { pact_id }. Over pact_completed: did the finale land.
	 */
	pactResultViewed: 'pact_result_viewed',
	/**
	 * Round 2: a member started a new pact with the same crew from the results. THE retention
	 * metric of the finale: pacts that end in a rematch over pact_completed. Recorded once per
	 * new pact. metadata: { pact_id (the new one), from_pact_id, crew_size }
	 */
	pactRematched: 'pact_rematched'
} as const

export const PACT_EVENT_NAMES = Object.values(PACT_EVENTS)

/**
 * The public join page (/join/[code]) — judged on how many people who open an
 * invite link go on to open the app. Mostly GUESTS, so these go through the
 * beacon against a session id.
 *
 * join_page_view → join_open_app_clicked is the web half of the invite loop;
 * the app's own `join_viewed` → `pact_joined` is the other half.
 *
 * Phase 4 lets a friend join on the page itself: join_page_view →
 * join_code_requested → join_signed_in → `pact_joined` (source `web`, recorded
 * server-side by the join route) → join_open_app_clicked. THE metric is that
 * `pact_joined` with source `web` over join_page_view: whether the first thing a
 * friend sees turns them into a member. Each step is its own event so the
 * drop-off between them shows: an email the friend wouldn't give, a code that
 * never arrived, a join that failed.
 */
export const JOIN_PAGE_EVENTS = {
	/** /join/[code] was viewed, for a code that exists. */
	joinPageView: 'join_page_view',
	/**
	 * A way into the app was taken. metadata: { target: 'app' | 'code_copied' }
	 * `target` is the discriminator: a copied code means the custom scheme did
	 * not open, which is the universal-links question for later.
	 */
	joinOpenAppClicked: 'join_open_app_clicked',
	/** The friend asked for a sign-in code by email on the page. */
	joinCodeRequested: 'join_code_requested',
	/** The emailed code was accepted: the friend is signed in on the page. */
	joinSignedIn: 'join_signed_in'
} as const

export const JOIN_PAGE_EVENT_NAMES = Object.values(JOIN_PAGE_EVENTS)

/**
 * The public results page (/results/[pact]): what a friend in the group chat sees when a crew
 * shares how their pact ended. Mostly GUESTS, through the beacon. THE metric is
 * result_cta_clicked with target `start` over result_page_view: whether a shared result
 * recruits a new crew.
 */
export const RESULT_PAGE_EVENTS = {
	/** /results/[pact] was viewed, for a finished pact. */
	resultPageView: 'result_page_view',
	/**
	 * A call to action on the page was tapped. metadata: { target: 'app' | 'start' }
	 * `app` opens the pact in the app (a member); `start` goes to the landing to make one.
	 */
	resultCtaClicked: 'result_cta_clicked'
} as const

export const RESULT_PAGE_EVENT_NAMES = Object.values(RESULT_PAGE_EVENTS)

/**
 * Every registered web event, flat. This is what the whitelist and the CI check
 * read; adding a group above without spreading it here is the one mistake
 * `npm run check:events` is built to catch.
 */
export const ALL_EVENT_NAMES = [
	...FUNNEL_EVENT_NAMES,
	...LIFECYCLE_EVENT_NAMES,
	...CHECKOUT_EVENT_NAMES,
	...PACT_EVENT_NAMES,
	...JOIN_PAGE_EVENT_NAMES,
	...RESULT_PAGE_EVENT_NAMES
] as const

export type AppEvent = (typeof ALL_EVENT_NAMES)[number]

/**
 * Events only server code may record. /api/track answers 400 to these: they
 * are this play's activation and completion numbers, and a signed-in browser
 * posting them to the beacon would inflate both.
 */
export const SERVER_ONLY_EVENT_NAMES: readonly AppEvent[] = [
	...PACT_EVENT_NAMES,
	LIFECYCLE_EVENTS.userActivated
]
