import type { CheckIn, Pact, PactMember, TodayBoard } from '@app/contract'
import { challengeFor } from '@/lib/pacts/challenges'
import {
	closesAt,
	dayFromDate,
	isHeldOn,
	pactStatus,
	type Day,
	type MemberSpan,
	type PactCalendar,
	type PactStatus
} from '@/lib/pacts/day'
import { todayBoard } from '@/lib/pacts/progress'
import type { CheckInRecord, MemberRecord, PactRecord } from '@/server/db/pacts'

// Pact rows → the /api/app/v1 wire format, and the day math on them. The store hands back
// `@db.Date` columns as Dates at UTC midnight; everything here turns them into pact-local
// `Day`s once and asks src/lib/pacts for every answer (R10), so no route does date
// arithmetic of its own.

export function calendarOf(pact: PactRecord): PactCalendar & { cancelledAt: Date | null } {
	return {
		timezone: pact.timezone,
		cadence: pact.cadence,
		startDay: dayFromDate(pact.startDay),
		endDay: dayFromDate(pact.endDay),
		cancelledAt: pact.cancelledAt
	}
}

export function spanOf(member: Pick<MemberRecord, 'userId' | 'joinedDay' | 'leftDay'>): MemberSpan {
	return {
		userId: member.userId,
		joinedDay: dayFromDate(member.joinedDay),
		leftDay: member.leftDay ? dayFromDate(member.leftDay) : null
	}
}

export function statusOf(pact: PactRecord, today: Day): PactStatus {
	return pactStatus(calendarOf(pact), today)
}

export function toWirePact(pact: PactRecord, role: MemberRecord['role'], today: Day): Pact {
	return {
		id: pact.id,
		name: pact.name,
		habit: pact.habit,
		cadence: pact.cadence,
		timezone: pact.timezone,
		start_day: dayFromDate(pact.startDay),
		end_day: dayFromDate(pact.endDay),
		stake: pact.stake,
		invite_code: pact.inviteCode,
		max_members: pact.maxMembers,
		status: statusOf(pact, today),
		role,
		created_at: pact.createdAt.toISOString()
	}
}

export function toWireMember(member: MemberRecord): PactMember {
	return {
		user_id: member.userId,
		display_name: member.displayName,
		role: member.role,
		joined_day: dayFromDate(member.joinedDay),
		left_day: member.leftDay ? dayFromDate(member.leftDay) : null
	}
}

export function toWireCheckIn(row: CheckInRecord): CheckIn {
	return {
		id: row.id,
		pact_id: row.pactId,
		user_id: row.userId,
		day: dayFromDate(row.day),
		kind: row.kind,
		challenge: row.challenge,
		note: row.note,
		verdict: row.verdict,
		ai_reason: row.aiReason,
		ai_caption: row.aiCaption,
		judged_at: row.judgedAt?.toISOString() ?? null,
		created_at: row.createdAt.toISOString()
	}
}

/**
 * R18: today's board for an active pact, from its members and today's check-ins. Only the
 * members held today are on it; `me` says where the caller stands.
 */
export function boardFor(
	pact: PactRecord,
	members: readonly MemberRecord[],
	checkIns: readonly CheckInRecord[],
	today: Day,
	userId: string
): TodayBoard {
	const calendar = calendarOf(pact)
	const board = todayBoard({
		pact: calendar,
		members: members.map(spanOf),
		checkIns: checkIns.map((row) => ({
			userId: row.userId,
			day: dayFromDate(row.day),
			kind: row.kind
		})),
		today
	})
	const byUser = new Map(members.map((member) => [member.userId, member]))
	const checkInOf = new Map(checkIns.map((row) => [row.userId, row]))
	const me = byUser.get(userId)
	const myState = board.find((entry) => entry.userId === userId)?.state ?? null

	return {
		day: today,
		challenge: challengeFor(pact.id, today),
		closes_at: closesAt(pact.timezone, today).toISOString(),
		in_count: board.filter((entry) => entry.state !== 'out').length,
		held_count: board.length,
		members: board.map((entry) => {
			const checkIn = checkInOf.get(entry.userId)
			return {
				user_id: entry.userId,
				display_name: byUser.get(entry.userId)?.displayName ?? null,
				state: entry.state,
				check_in: checkIn
					? {
							id: checkIn.id,
							kind: checkIn.kind,
							verdict: checkIn.verdict,
							ai_reason: checkIn.aiReason,
							ai_caption: checkIn.aiCaption
						}
					: null
			}
		}),
		me: {
			held: !!me && isHeldOn(calendar, spanOf(me), today),
			state: myState,
			saver_available: !!me && me.saverUsedDay === null
		}
	}
}
