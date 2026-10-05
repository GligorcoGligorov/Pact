import type { PactResult } from '@app/contract'
import { addDays, dayFromDate, daysBetween, type Day } from '@/lib/pacts/day'
import { finalResult, type FinalResult } from '@/lib/pacts/results'
import type { PactForResults } from '@/server/db/results'
import { calendarOf, spanOf } from './pact-wire'

// A finished pact's rows → its results (src/lib/pacts/results.ts) → the wire. Shared by
// GET pacts/:id/result, the public /results/[pact] page and its share card.

export function finalResultOf(row: PactForResults, today: Day): FinalResult | null {
	return finalResult({
		pact: calendarOf(row.pact),
		members: row.members.map(spanOf),
		checkIns: row.marks.map((m) => ({
			userId: m.userId,
			day: dayFromDate(m.day),
			kind: m.kind,
			createdAt: m.createdAt
		})),
		today
	})
}

/** Only members ever held to a day are on the results: a lobby leaver never played. */
export function toWireResult(row: PactForResults, result: FinalResult): PactResult {
	const names = new Map(row.members.map((m) => [m.userId, m.displayName]))
	return {
		outcome: result.outcome,
		losers: result.losers,
		chain: result.chain,
		kept_days: result.keptDays,
		total_days: result.totalDays,
		best_streak: result.bestStreak,
		members: result.members
			.filter((m) => m.daysHeld > 0)
			.map((m) => ({
				user_id: m.userId,
				display_name: names.get(m.userId) ?? null,
				days_done: m.daysDone,
				days_held: m.daysHeld,
				best_streak: m.bestStreak,
				saver_used: m.saverUsed,
				is_loser: m.isLoser,
				awards: m.awards
			})),
		awards: result.awards.map((a) => ({ kind: a.kind, user_ids: a.userIds }))
	}
}

const ROUND = / · Round (\d+)$/

/** "Sunrise Yoga" → "Sunrise Yoga · Round 2" → "Sunrise Yoga · Round 3", within `max`. */
export function nextRoundName(name: string, max: number): string {
	const match = ROUND.exec(name)
	const base = match ? name.slice(0, match.index) : name
	const suffix = ` · Round ${match ? Number(match[1]) + 1 : 2}`
	return `${base.slice(0, Math.max(1, max - suffix.length)).trimEnd()}${suffix}`
}

/** Round 2 runs as long as the round before, from tomorrow. */
export function nextRoundDays(row: PactForResults, today: Day): { startDay: Day; endDay: Day } {
	const length = daysBetween(dayFromDate(row.pact.startDay), dayFromDate(row.pact.endDay))
	const startDay = addDays(today, 1)
	return { startDay, endDay: addDays(startDay, length) }
}
