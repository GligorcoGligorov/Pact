import 'server-only'
import type { MemberState, Pact } from '@app/contract'
import { calendarOf, progressFor, spanOf, statusOf } from '@/server/api/pact-wire'
import { pactStore } from '@/server/db/pacts'
import { closesAt, dayFromDate, pactDaysThrough, todayIn } from '@/lib/pacts/day'
import { todayBoard } from '@/lib/pacts/progress'

export interface JoinPageMember {
	userId: string
	/** The display name, or null: the page says "A member". */
	name: string | null
	isOwner: boolean
	/** Today's state while the pact is active and they are held today; null otherwise. */
	state: MemberState | null
}

export interface JoinPage {
	code: string
	pactId: string
	name: string
	habit: string
	/** The crew's identity, as on the pact: a PACT_COLORS key and a PACT_EMOJIS value. */
	color: string
	emoji: string
	cadence: 'daily' | 'weekdays'
	stake: string | null
	status: Pact['status']
	startDay: string
	endDay: string
	/** The owner's display name: "Ana invited you". */
	inviter: string | null
	members: JoinPageMember[]
	maxMembers: number
	/** Held today and in (photo or saver), out of held today. Zero outside an active day. */
	inCount: number
	heldCount: number
	/** When today closes, while the pact is active. */
	closesAt: string | null
	/** Day n of m, while active. */
	dayNumber: number | null
	totalDays: number
	currentStreak: number
}

/**
 * R27: everything the public join page shows for a code, computed from the rows on this read.
 * Null for an unknown code (the page answers 404). Only what R27 allows: names, dates, the stake,
 * who is in today and the streak; never a photo, a verdict or a caption.
 */
export async function getJoinPage(code: string, now = new Date()): Promise<JoinPage | null> {
	const found = await pactStore.publicPage(code)
	if (!found) return null
	const { pact, members, marks } = found
	const today = todayIn(pact.timezone, now)
	const status = statusOf(pact, today)
	const active = members.filter((m) => m.leftDay === null)
	const calendar = calendarOf(pact)

	const board =
		status === 'active'
			? todayBoard({
					pact: calendar,
					members: active.map(spanOf),
					checkIns: marks.map((m) => ({ userId: m.userId, day: dayFromDate(m.day), kind: m.kind })),
					today
				})
			: []
	const stateOf = new Map(board.map((entry) => [entry.userId, entry.state]))
	const progress = progressFor(pact, members, marks, today)
	const totalDays = pactDaysThrough(calendar, dayFromDate(pact.endDay)).length

	return {
		code: pact.inviteCode,
		pactId: pact.id,
		name: pact.name,
		habit: pact.habit,
		color: pact.color,
		emoji: pact.emoji,
		cadence: pact.cadence,
		stake: pact.stake,
		status,
		startDay: dayFromDate(pact.startDay),
		endDay: dayFromDate(pact.endDay),
		inviter: active.find((m) => m.role === 'owner')?.displayName ?? null,
		members: active.map((m) => ({
			userId: m.userId,
			name: m.displayName,
			isOwner: m.role === 'owner',
			state: stateOf.get(m.userId) ?? null
		})),
		maxMembers: pact.maxMembers,
		inCount: board.filter((entry) => entry.state !== 'out').length,
		heldCount: board.length,
		closesAt: status === 'active' ? closesAt(pact.timezone, today).toISOString() : null,
		dayNumber: status === 'active' ? progress.chain.length : null,
		totalDays,
		currentStreak: progress.current_streak
	}
}
