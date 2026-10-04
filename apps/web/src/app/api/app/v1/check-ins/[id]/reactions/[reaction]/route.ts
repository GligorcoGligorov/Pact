import { endpoints } from '@app/contract'
import { createAppRoute, notFound } from '@/server/api/app-route'
import { crewFeedStore } from '@/server/db/crew-feed'
import { PACT_EVENTS } from '@/lib/analytics/events'
import { recordUserEvent } from '@/lib/analytics/record'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/app/v1/check-ins/:id/reactions/:reaction: the caller's 🔥 👏 or 😂 on a check-in in
 * one of their pacts. Idempotent: reacting twice is one reaction. 404 for a check-in that
 * doesn't exist or isn't in one of the caller's pacts.
 */
export const POST = createAppRoute(endpoints.addReaction, async ({ user, params }) => {
	const result = await crewFeedStore.react(user.id, params.id, params.reaction, true)
	if (!result) throw notFound()
	if (result.added) {
		await recordUserEvent(user.id, PACT_EVENTS.checkInReacted, {
			metadata: { pact_id: result.pactId, reaction: params.reaction },
			dedupeDaily: false
		})
	}
	return { body: { reactions: result.tally } }
})

/** DELETE: takes the caller's reaction back. Taking back one that isn't there is fine. */
export const DELETE = createAppRoute(endpoints.removeReaction, async ({ user, params }) => {
	const result = await crewFeedStore.react(user.id, params.id, params.reaction, false)
	if (!result) throw notFound()
	return { body: { reactions: result.tally } }
})
