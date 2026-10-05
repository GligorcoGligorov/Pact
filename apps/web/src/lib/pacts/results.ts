/**
 * A finished pact's final results: the chain, each member's record and best run, who used
 * their saver, the awards and who owes the stake (R17, R24). The results screen, the share
 * card and the closer's "results are in" message all read this one function.
 *
 * Pure, like progress.ts: computed from the pact, its memberships and its check-ins, never
 * from anything the closer wrote (R10). Null until the pact has completed.
 *
 * The awards, every one earned from real check-ins, ties shared:
 *  - iron_streak 🔥: the longest personal run of done days (at least 3).
 *  - never_missed 💯: every day held done with a photo, no saver.
 *  - comeback_kid 🦸: missed a day, then ran at least 3 in a row after it.
 *  - clutch_save 🛟: their saver kept a day the whole crew kept.
 *  - early_bird 🌅: the most photo check-ins before 09:00 pact-local (at least 2).
 *  - night_owl 🦉: the most photo check-ins from 21:00 pact-local (at least 2).
 */

import { addDays, isHeldOn, pactDaysThrough, type Day } from './day'
import { chain, pactResult, streaks, type CheckInMark, type PactProgressInput } from './progress'

export const AWARD_KINDS = [
	'iron_streak',
	'never_missed',
	'comeback_kid',
	'clutch_save',
	'early_bird',
	'night_owl'
] as const
export type AwardKind = (typeof AWARD_KINDS)[number]

/** A check-in as results read it: when it was made decides the early bird and the night owl. */
export interface TimedCheckIn extends CheckInMark {
	createdAt: Date
}

export interface FinalMember {
	userId: string
	daysDone: number
	daysHeld: number
	/** Their own longest run of done days (a saver counts as done). */
	bestStreak: number
	saverUsed: boolean
	isLoser: boolean
	awards: AwardKind[]
}

export interface FinalResult {
	/** `loser`: one or more members owe the stake. `nobody_pays`: everyone tied. */
	outcome: 'loser' | 'nobody_pays'
	losers: string[]
	/** Every pact day, kept or broken: a finished pact has no open day. */
	chain: { day: Day; status: 'kept' | 'broken' }[]
	keptDays: number
	totalDays: number
	/** The crew's longest run of kept days. */
	bestStreak: number
	members: FinalMember[]
	/** Each award earned, in AWARD_KINDS order, with everyone who shares it. */
	awards: { kind: AwardKind; userIds: string[] }[]
}

const MIN_IRON_STREAK = 3
const MIN_COMEBACK_RUN = 3
const MIN_TIMED_CHECK_INS = 2
const EARLY_BEFORE_HOUR = 9
const NIGHT_FROM_HOUR = 21

export function finalResult(
	input: Omit<PactProgressInput, 'checkIns'> & { checkIns: readonly TimedCheckIn[] }
): FinalResult | null {
	const records = pactResult(input)
	if (!records) return null

	// Read the whole pact as of the day after it ended: every day closed, none open.
	const closed: PactProgressInput = { ...input, today: addDays(input.pact.endDay, 1) }
	const days = pactDaysThrough(input.pact, input.pact.endDay)
	const crewChain = chain(closed).map(({ day, status }) => ({
		day,
		status: status === 'kept' ? ('kept' as const) : ('broken' as const)
	}))
	const keptOn = new Set(crewChain.filter((d) => d.status === 'kept').map((d) => d.day))

	const byMember = new Map<string, Map<Day, TimedCheckIn>>()
	for (const c of input.checkIns) {
		let own = byMember.get(c.userId)
		if (!own) byMember.set(c.userId, (own = new Map()))
		own.set(c.day, c)
	}

	const hourOf = hourIn(input.pact.timezone)
	const earned = new Map<AwardKind, Map<string, number>>(AWARD_KINDS.map((k) => [k, new Map()]))
	const members: FinalMember[] = records.map((record) => {
		const span = input.members.find((m) => m.userId === record.userId)!
		const own = byMember.get(record.userId) ?? new Map<Day, TimedCheckIn>()
		let run = 0
		let best = 0
		let missed = false
		let bestAfterMiss = 0
		let saverDay: Day | null = null
		let photos = 0
		let early = 0
		let night = 0
		for (const day of days) {
			if (!isHeldOn(input.pact, span, day)) continue
			const mark = own.get(day)
			if (!mark) {
				missed = true
				run = 0
				continue
			}
			run++
			best = Math.max(best, run)
			if (missed) bestAfterMiss = Math.max(bestAfterMiss, run)
			if (mark.kind === 'saver') {
				saverDay = day
				continue
			}
			photos++
			const hour = hourOf(mark.createdAt)
			if (hour < EARLY_BEFORE_HOUR) early++
			if (hour >= NIGHT_FROM_HOUR) night++
		}

		const score = (kind: AwardKind, value: number) => earned.get(kind)!.set(record.userId, value)
		if (best >= MIN_IRON_STREAK) score('iron_streak', best)
		if (record.daysHeld > 0 && photos === record.daysHeld) score('never_missed', 1)
		if (bestAfterMiss >= MIN_COMEBACK_RUN) score('comeback_kid', 1)
		if (saverDay !== null && keptOn.has(saverDay)) score('clutch_save', 1)
		if (early >= MIN_TIMED_CHECK_INS) score('early_bird', early)
		if (night >= MIN_TIMED_CHECK_INS) score('night_owl', night)

		return {
			...record,
			bestStreak: best,
			saverUsed: saverDay !== null,
			awards: []
		}
	})

	// Only the top score wins a ranked award; ties share it.
	const awards: FinalResult['awards'] = []
	for (const kind of AWARD_KINDS) {
		const scores = earned.get(kind)!
		if (scores.size === 0) continue
		const top = Math.max(...scores.values())
		const userIds = members.map((m) => m.userId).filter((id) => scores.get(id) === top)
		awards.push({ kind, userIds })
		for (const m of members) if (userIds.includes(m.userId)) m.awards.push(kind)
	}

	const losers = members.filter((m) => m.isLoser).map((m) => m.userId)
	return {
		outcome: losers.length > 0 ? 'loser' : 'nobody_pays',
		losers,
		chain: crewChain,
		keptDays: keptOn.size,
		totalDays: crewChain.length,
		bestStreak: streaks(closed).best,
		members,
		awards
	}
}

/** The hour (0–23) an instant falls on in `timezone`. */
function hourIn(timezone: string): (at: Date) => number {
	const format = new Intl.DateTimeFormat('en-US', {
		timeZone: timezone,
		hour: 'numeric',
		hourCycle: 'h23'
	})
	return (at) => Number(format.format(at))
}
