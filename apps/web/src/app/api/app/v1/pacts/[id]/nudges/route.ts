import { endpoints } from '@app/contract'
import { ApiError } from '@/server/api/app-errors'
import { createAppRoute, notFound } from '@/server/api/app-route'
import { calendarOf, spanOf, statusOf } from '@/server/api/pact-wire'
import { fromIsoDate } from '@/server/api/wire'
import { writeNudge } from '@/server/ai/nudge'
import { inboxStore } from '@/server/db/inbox'
import { pactStore } from '@/server/db/pacts'
import { PACT_EVENTS } from '@/lib/analytics/events'
import { recordUserEvent } from '@/lib/analytics/record'
import { challengeFor } from '@/lib/pacts/challenges'
import { dayFromDate, todayIn } from '@/lib/pacts/day'
import { todayBoard } from '@/lib/pacts/progress'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/app/v1/pacts/:id/nudges (R20): poke a crew member who is held today and still out.
 * One per pair per day. The friend gets a `team` inbox message, written by the AI in a short,
 * kind line about the habit (or a fixed one), which the app shows as a banner.
 */
export const POST = createAppRoute(endpoints.createNudge, async ({ user, params, body }) => {
	if (body.to_user_id === user.id) {
		throw new ApiError('invalid_request', "You can't nudge yourself.", {
			issues: [{ path: 'to_user_id', message: 'someone else in the pact' }]
		})
	}
	const membership = await pactStore.membership(params.id, user.id)
	if (!membership || membership.me.leftDay !== null) throw notFound()
	const { pact, me } = membership
	const today = todayIn(pact.timezone, new Date())
	if (statusOf(pact, today) !== 'active') {
		throw new ApiError('not_held', 'This pact has no check-in today.')
	}

	const detail = await pactStore.detail(pact.id, user.id, fromIsoDate(today))
	if (!detail) throw notFound()
	const board = todayBoard({
		pact: calendarOf(pact),
		members: detail.members.map(spanOf),
		checkIns: detail.checkIns.map((row) => ({
			userId: row.userId,
			day: dayFromDate(row.day),
			kind: row.kind
		})),
		today
	})
	const target = board.find((entry) => entry.userId === body.to_user_id)
	if (!target) throw new ApiError('not_held', "They aren't held to today.")
	if (target.state !== 'out') throw new ApiError('already_in', 'They’re already in today.')

	const created = await pactStore.createNudge({
		pactId: pact.id,
		fromUserId: user.id,
		toUserId: body.to_user_id,
		day: fromIsoDate(today)
	})
	if (created === 'exists') {
		throw new ApiError('already_nudged', 'You’ve already nudged them today.')
	}

	const toName = detail.members.find((m) => m.userId === body.to_user_id)?.displayName ?? 'Hey'
	const { text } = await writeNudge({
		fromUserId: user.id,
		toName,
		habit: pact.habit,
		challenge: challengeFor(pact.id, today)
	})
	const fromName = me.displayName?.trim().split(/\s+/)[0] || 'Someone in your crew'
	await inboxStore.notify([
		{
			userId: body.to_user_id,
			title: `${fromName} nudged you · ${pact.name}`,
			body: text,
			pactId: pact.id
		}
	])
	await recordUserEvent(user.id, PACT_EVENTS.nudgeSent, {
		metadata: { pact_id: pact.id },
		dedupeDaily: false
	})

	return { body: { nudge: { to_user_id: body.to_user_id, day: today, text } }, status: 201 }
})
