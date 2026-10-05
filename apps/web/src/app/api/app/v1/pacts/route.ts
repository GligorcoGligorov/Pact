import { endpoints, suggestCrewTheme, type MemberState } from '@app/contract'
import { ApiError } from '@/server/api/app-errors'
import { createAppRoute, idConflict } from '@/server/api/app-route'
import {
	boardFor,
	calendarOf,
	progressFor,
	spanOf,
	statusOf,
	toWirePact
} from '@/server/api/pact-wire'
import { fromIsoDate } from '@/server/api/wire'
import { pactStore } from '@/server/db/pacts'
import { PACT_EVENTS } from '@/lib/analytics/events'
import { recordUserEvent } from '@/lib/analytics/record'
import {
	addDays,
	canonicalTimeZone,
	dayFromDate,
	endDayFor,
	isHeldOn,
	todayIn
} from '@/lib/pacts/day'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/app/v1/pacts: the pacts the caller belongs to, newest first, each with the caller's
 * state today in that pact's own timezone (null when they aren't held today), today's board
 * while it is active, and its chain and streaks (R10, R18, R19).
 */
export const GET = createAppRoute(endpoints.listPacts, async ({ user }) => {
	const now = new Date()
	const rows = await pactStore.listForUser(user.id)
	// Every timezone's today is within a day of UTC's, so this covers each pact's today.
	const nudges = await pactStore.nudgesFrom(
		user.id,
		rows.map((row) => row.pact.id),
		fromIsoDate(addDays(todayIn('UTC', now), -1))
	)
	return {
		body: {
			pacts: rows.map(({ pact, me, members, checkIns }) => {
				const today = todayIn(pact.timezone, now)
				const todays = checkIns.filter((row) => dayFromDate(row.day) === today)
				const held = isHeldOn(calendarOf(pact), spanOf(me), today)
				const mine = todays.find((row) => row.userId === user.id)
				const state: MemberState | null = !held
					? null
					: !mine
						? 'out'
						: mine.kind === 'photo'
							? 'in'
							: 'saver'
				return {
					...toWirePact(pact, me.role, today),
					my_state_today: state,
					today:
						statusOf(pact, today) === 'active'
							? boardFor(
									pact,
									members,
									todays,
									today,
									user.id,
									new Set(
										nudges
											.filter((n) => n.pactId === pact.id && dayFromDate(n.day) === today)
											.map((n) => n.toUserId)
									)
								)
							: null,
					progress: progressFor(pact, members, checkIns, today)
				}
			})
		}
	}
})

/**
 * POST /api/app/v1/pacts: a new pact (R1, R2), owned by the caller and held from its start day.
 * The timezone is the device's, validated here; the start day is today or later in it. 201
 * when made now; 200 with the same pact when its `id` was made by an earlier try; 409 when
 * the id is someone else's.
 */
export const POST = createAppRoute(endpoints.createPact, async ({ user, body }) => {
	const timezone = canonicalTimeZone(body.timezone)
	if (!timezone) {
		throw new ApiError('invalid_request', "That timezone isn't one we know.", {
			issues: [{ path: 'timezone', message: 'an IANA timezone name, like Europe/Skopje' }]
		})
	}
	const today = todayIn(timezone, new Date())
	if (body.start_day < today) {
		throw new ApiError('invalid_request', 'A pact starts today or later.', {
			issues: [{ path: 'start_day', message: `today (${today}) or later` }]
		})
	}

	// An app from before crew themes sends neither: it gets the theme its habit suggests.
	const suggested = suggestCrewTheme(body.habit)
	const result = await pactStore.create(user.id, {
		id: body.id,
		name: body.name,
		habit: body.habit,
		color: body.color ?? suggested.color,
		emoji: body.emoji ?? suggested.emoji,
		cadence: body.cadence,
		timezone,
		startDay: fromIsoDate(body.start_day),
		endDay: fromIsoDate(endDayFor(body.start_day, body.days)),
		stake: body.stake ?? null
	})
	if (result.outcome === 'conflict') throw idConflict()
	if (result.outcome === 'created') {
		await recordUserEvent(user.id, PACT_EVENTS.pactCreated, {
			metadata: {
				pact_id: result.pact.id,
				cadence: result.pact.cadence,
				color: result.pact.color,
				emoji: result.pact.emoji
			},
			dedupeDaily: false
		})
	}
	return {
		body: { pact: toWirePact(result.pact, 'owner', today) },
		status: result.outcome === 'created' ? 201 : 200
	}
})
