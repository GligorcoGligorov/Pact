import { endpoints } from '@app/contract'
import { ApiError } from '@/server/api/app-errors'
import { createAppRoute, notFound } from '@/server/api/app-route'
import { toWirePact } from '@/server/api/pact-wire'
import { finalResultOf, toWireResult } from '@/server/api/result-wire'
import { pactStore } from '@/server/db/pacts'
import { resultStore } from '@/server/db/results'
import { PACT_EVENTS } from '@/lib/analytics/events'
import { recordUserEvent } from '@/lib/analytics/record'
import { todayIn } from '@/lib/pacts/day'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/app/v1/pacts/:id/result (R24): a finished pact's results, computed on this read: the
 * chain, each member's record and best run, savers, awards and who owes the stake. 409
 * `not_finished` while it runs; 404 unless the caller is or was a member.
 */
export const GET = createAppRoute(endpoints.getPactResult, async ({ user, params }) => {
	const membership = await pactStore.membership(params.id, user.id)
	if (!membership) throw notFound()
	const today = todayIn(membership.pact.timezone, new Date())

	const row = await resultStore.forMember(params.id, user.id)
	if (!row) throw notFound()
	const result = finalResultOf(row, today)
	if (!result)
		throw new ApiError('not_finished', 'This pact is still going. Results come at the end.')

	await recordUserEvent(user.id, PACT_EVENTS.pactResultViewed, {
		metadata: { pact_id: row.pact.id },
		dedupeMatch: { pact_id: row.pact.id }
	})
	return {
		body: {
			pact: toWirePact(row.pact, membership.me.role, today),
			result: toWireResult(row, result),
			rematch: row.rematchId ? { pact_id: row.rematchId } : null
		}
	}
})
