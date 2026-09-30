import { endpoints } from '@app/contract'
import { ApiError } from '@/server/api/app-errors'
import { createAppRoute, notFound } from '@/server/api/app-route'
import { calendarOf, statusOf, toWirePact } from '@/server/api/pact-wire'
import { fromIsoDate } from '@/server/api/wire'
import { pactStore } from '@/server/db/pacts'
import { PACT_EVENTS } from '@/lib/analytics/events'
import { recordUserEvent } from '@/lib/analytics/record'
import { dayFromDate, joinedDayFor, todayIn } from '@/lib/pacts/day'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const closed = () =>
	new ApiError('pact_closed', "This pact has finished or was cancelled, so it can't be joined.")

/**
 * POST /api/app/v1/invites/:code/join: joins the pact (R5). Idempotent: a member joining again
 * gets 200 with their membership. A new member is held from the start day in the lobby, else
 * from tomorrow (R6), so joining never breaks a day in progress; a join that would hold them
 * to no day is `pact_closed`. A pact at its limit is `pact_full` (R4).
 */
export const POST = createAppRoute(endpoints.joinPact, async ({ user, params, body }) => {
	const found = await pactStore.byInviteCode(params.code, user.id)
	if (!found) throw notFound()
	const { pact } = found
	const today = todayIn(pact.timezone, new Date())

	if (!found.isMember) {
		if (found.hasLeft) {
			throw new ApiError('conflict', 'You left this pact, so this code no longer adds you.')
		}
		const status = statusOf(pact, today)
		if (status === 'cancelled' || status === 'completed') throw closed()
		if (joinedDayFor(calendarOf(pact), today) > dayFromDate(pact.endDay)) throw closed()
	}

	const joinedDay = joinedDayFor(calendarOf(pact), today)
	const result = await pactStore.join(pact.id, user.id, fromIsoDate(joinedDay))
	if (result.outcome === 'full' || result.outcome === 'left') {
		throw result.outcome === 'full'
			? new ApiError('pact_full', 'This pact is full.')
			: new ApiError('conflict', 'You left this pact, so this code no longer adds you.')
	}
	if (result.outcome === 'joined') {
		await recordUserEvent(user.id, PACT_EVENTS.pactJoined, {
			metadata: { pact_id: pact.id, source: body.source },
			dedupeDaily: false
		})
	}
	return {
		body: {
			pact: toWirePact(pact, result.member.role, today),
			joined_day: dayFromDate(result.member.joinedDay)
		},
		status: result.outcome === 'joined' ? 201 : 200
	}
})
