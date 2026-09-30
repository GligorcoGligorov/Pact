/**
 * What a pact's check-ins add up to: today's board, the chain of kept and broken days, the
 * streaks, each member's record and, once the pact is over, who lost (R18, R19, R24).
 *
 * Computed on every read from the pact, its memberships and its check-ins, never from
 * anything the closer wrote (R10), so every answer is right even if the closer never ran.
 * Pure: `today` comes from `todayIn` in the caller.
 *
 * The rules, in one place:
 *  - A pact-day is KEPT when every member held that day checked in (a saver counts), and
 *    BROKEN otherwise. A day nobody was held to is broken: nobody kept it.
 *  - Today stays OPEN in the chain until it closes, but counts toward the streak, and toward
 *    a member's record, as soon as it is kept or they are in.
 *  - A check-in on a day its author was not held to counts for nothing.
 */

import {
	addDays,
	isHeldOn,
	pactDaysThrough,
	pactStatus,
	type Day,
	type MemberSpan,
	type PactCalendar
} from './day'

export type CheckInKind = 'photo' | 'saver'
export type MemberState = 'in' | 'saver' | 'out'
export type DayStatus = 'kept' | 'broken' | 'open'

/** The fields of a check-in the arithmetic reads. */
export interface CheckInMark {
	userId: string
	day: Day
	kind: CheckInKind
}

export interface PactProgressInput {
	pact: PactCalendar & { cancelledAt: Date | null }
	members: readonly MemberSpan[]
	checkIns: readonly CheckInMark[]
	today: Day
}

export interface BoardMember {
	userId: string
	state: MemberState
}

export interface MemberRecord {
	userId: string
	daysDone: number
	daysHeld: number
}

export interface ResultMember extends MemberRecord {
	isLoser: boolean
}

/** Check-in kind by day, then by member. */
type Marks = Map<Day, Map<string, CheckInKind>>

function indexMarks(checkIns: readonly CheckInMark[]): Marks {
	const marks: Marks = new Map()
	for (const c of checkIns) {
		let byMember = marks.get(c.day)
		if (!byMember) marks.set(c.day, (byMember = new Map()))
		byMember.set(c.userId, c.kind)
	}
	return marks
}

function isKept(input: PactProgressInput, marks: Marks, day: Day): boolean {
	const held = input.members.filter((m) => isHeldOn(input.pact, m, day))
	const byMember = marks.get(day)
	return held.length > 0 && held.every((m) => byMember?.has(m.userId))
}

/** R18: each member held today, in or out. Empty when today is not a day the pact counts. */
export function todayBoard(input: PactProgressInput): BoardMember[] {
	const byMember = indexMarks(input.checkIns).get(input.today)
	return input.members
		.filter((m) => isHeldOn(input.pact, m, input.today))
		.map((m) => {
			const kind = byMember?.get(m.userId)
			return {
				userId: m.userId,
				state: kind === undefined ? 'out' : kind === 'photo' ? 'in' : 'saver'
			}
		})
}

/** R19: every pact day from the start through today (or the end), oldest first. */
export function chain(input: PactProgressInput): { day: Day; status: DayStatus }[] {
	const marks = indexMarks(input.checkIns)
	return pactDaysThrough(input.pact, input.today).map((day) => ({
		day,
		status: day === input.today ? 'open' : isKept(input, marks, day) ? 'kept' : 'broken'
	}))
}

/**
 * R19: the current streak counts consecutive kept days back from the last closed day, plus
 * today once it is kept; an open, unkept today neither adds to it nor breaks it. The best
 * streak is the longest run the pact has had.
 */
export function streaks(input: PactProgressInput): { current: number; best: number } {
	const marks = indexMarks(input.checkIns)
	let current = 0
	let best = 0
	for (const day of pactDaysThrough(input.pact, input.today)) {
		const kept = isKept(input, marks, day)
		if (day === input.today && !kept) break
		current = kept ? current + 1 : 0
		best = Math.max(best, current)
	}
	return { current, best }
}

/**
 * R24: a member's days done out of days held. Days held are the closed days they were held
 * to, plus today once they are in, so nobody's record drops for a day that is still open.
 */
export function memberRecords(input: PactProgressInput): MemberRecord[] {
	const marks = indexMarks(input.checkIns)
	const days = pactDaysThrough(input.pact, input.today)
	return input.members.map((m) => {
		let daysDone = 0
		let daysHeld = 0
		for (const day of days) {
			if (!isHeldOn(input.pact, m, day)) continue
			const done = marks.get(day)?.has(m.userId) ?? false
			if (day === input.today && !done) continue
			daysHeld++
			if (done) daysDone++
		}
		return { userId: m.userId, daysDone, daysHeld }
	})
}

/**
 * R24, once the pact has completed (null before, and for a cancelled pact). The loser is
 * whoever has the lowest completion rate; everyone tied at it loses together; if everyone is
 * at 100%, nobody loses. A member who was never held to a day (they left in the lobby) has
 * no rate and never loses. Leaving does not erase a record: the days before still count.
 */
export function pactResult(input: PactProgressInput): ResultMember[] | null {
	if (pactStatus(input.pact, input.today) !== 'completed') return null
	const records = memberRecords({ ...input, today: addDays(input.pact.endDay, 1) })
	const rated = records.filter((r) => r.daysHeld > 0)
	const lowest = rated.reduce<MemberRecord | null>(
		(low, r) => (low === null || compareRate(r, low) < 0 ? r : low),
		null
	)
	const someoneMissed = lowest !== null && lowest.daysDone < lowest.daysHeld
	return records.map((r) => ({
		...r,
		isLoser: someoneMissed && r.daysHeld > 0 && compareRate(r, lowest) === 0
	}))
}

/** Compares done/held exactly, by cross-multiplying: 2/3 and 4/6 are a tie, not a float. */
function compareRate(a: MemberRecord, b: MemberRecord): number {
	return a.daysDone * b.daysHeld - b.daysDone * a.daysHeld
}
