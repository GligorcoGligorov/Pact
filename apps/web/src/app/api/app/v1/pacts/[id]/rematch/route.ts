import { endpoints, PACT_NAME_MAX } from '@app/contract'
import { ApiError } from '@/server/api/app-errors'
import { createAppRoute, notFound } from '@/server/api/app-route'
import { statusOf, toWirePact } from '@/server/api/pact-wire'
import { nextRoundDays, nextRoundName } from '@/server/api/result-wire'
import { fromIsoDate } from '@/server/api/wire'
import { inboxStore } from '@/server/db/inbox'
import { pactStore } from '@/server/db/pacts'
import { resultStore } from '@/server/db/results'
import { safetyStore } from '@/server/db/safety'
import { PACT_EVENTS } from '@/lib/analytics/events'
import { recordUserEvent } from '@/lib/analytics/record'
import { todayIn } from '@/lib/pacts/day'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/app/v1/pacts/:id/rematch: "same crew, new pact" from a finished pact's results.
 * Round 2 has the same habit, theme, cadence, stake and length, starts tomorrow, and holds the
 * whole crew from day one (everyone who was still in at the end, minus anyone blocked either
 * way with the caller). The caller owns it; the others get a banner and can leave as usual.
 *
 * One round 2 per finished pact: a second tap, or a crewmate's tap, answers 200 with the one
 * already started (`created: false`).
 */
export const POST = createAppRoute(endpoints.rematchPact, async ({ user, params, body }) => {
	const membership = await pactStore.membership(params.id, user.id)
	if (!membership || membership.me.leftDay !== null) throw notFound()
	const today = todayIn(membership.pact.timezone, new Date())
	if (statusOf(membership.pact, today) !== 'completed') {
		throw new ApiError('not_finished', 'Round 2 starts once this pact is over.')
	}

	const row = await resultStore.forMember(params.id, user.id)
	if (!row) throw notFound()
	const blocked = await safetyStore.blockedEitherWay(user.id)
	const crew = row.members.filter(
		(m) => m.userId !== user.id && m.leftDay === null && !blocked.has(m.userId)
	)
	const { startDay, endDay } = nextRoundDays(row, today)
	const name = nextRoundName(row.pact.name, PACT_NAME_MAX)

	const result = await resultStore.createRematch({
		id: body.id,
		fromPactId: row.pact.id,
		ownerId: user.id,
		pact: {
			name,
			habit: row.pact.habit,
			color: row.pact.color,
			emoji: row.pact.emoji,
			cadence: row.pact.cadence,
			timezone: row.pact.timezone,
			stake: row.pact.stake,
			startDay: fromIsoDate(startDay),
			endDay: fromIsoDate(endDay)
		},
		memberIds: crew.map((m) => m.userId)
	})

	if (result.outcome === 'created') {
		const starter = membership.me.displayName ?? 'Someone in your crew'
		await inboxStore.notify(
			crew.map((m) => ({
				userId: m.userId,
				title: `🔁 ${name}`,
				body: `${starter} started round 2 with the same crew. Day 1 is tomorrow. You're in!`,
				pactId: result.pact.id
			}))
		)
		await recordUserEvent(user.id, PACT_EVENTS.pactRematched, {
			metadata: { pact_id: result.pact.id, from_pact_id: row.pact.id, crew_size: crew.length + 1 },
			dedupeDaily: false
		})
	}

	// The caller is in round 2 unless someone who blocked them started it: then it isn't theirs.
	const mine = await pactStore.membership(result.pact.id, user.id)
	if (!mine) throw new ApiError('conflict', 'Someone in the crew already started round 2.')
	return {
		body: {
			pact: toWirePact(result.pact, mine.me.role, today),
			created: result.outcome === 'created'
		},
		status: result.outcome === 'created' ? 201 : 200
	}
})
