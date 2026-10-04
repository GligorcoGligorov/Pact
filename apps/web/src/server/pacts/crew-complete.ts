import 'server-only'
import { calendarOf, progressFor, spanOf } from '@/server/api/pact-wire'
import { fromIsoDate } from '@/server/api/wire'
import { inboxStore } from '@/server/db/inbox'
import { pactStore, type PactRecord } from '@/server/db/pacts'
import { PACT_EVENTS } from '@/lib/analytics/events'
import { recordUserEvent } from '@/lib/analytics/record'
import { dayFromDate, type Day } from '@/lib/pacts/day'
import { todayBoard } from '@/lib/pacts/progress'

/** A crew of one can't keep a day "together": the celebration needs two or more held today. */
const MIN_CREW = 2
/** Long enough to cover a pact-day in any timezone, short enough to never see yesterday's. */
const SAME_DAY_WINDOW_MS = 36 * 60 * 60 * 1000

export function keptTitle(dayNumber: number): string {
	return `Day ${dayNumber} kept by the whole crew 🔥`
}

/**
 * Runs after a new check-in. When it was the last one the day was waiting on, every OTHER member
 * held today gets "Day 8 kept by the whole crew 🔥" in their inbox (and so a banner); the one who
 * completed it sees it on their verdict screen. Once per pact-day: a second last check-in racing
 * this one finds the message already written. Returns whether it celebrated.
 */
export async function celebrateIfKept(pact: PactRecord, today: Day, completedBy: string) {
	const detail = await pactStore.detail(pact.id, completedBy, fromIsoDate(today))
	if (!detail) return false
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
	if (board.length < MIN_CREW || board.some((entry) => entry.state === 'out')) return false

	const progress = progressFor(pact, detail.members, detail.marks, today)
	const dayNumber = progress.chain.length
	const title = keptTitle(dayNumber)
	if (await inboxStore.sentSince(pact.id, title, new Date(Date.now() - SAME_DAY_WINDOW_MS))) {
		return false
	}
	const streak = progress.current_streak
	await inboxStore.notify(
		board
			.filter((entry) => entry.userId !== completedBy)
			.map((entry) => ({
				userId: entry.userId,
				title,
				body: `${pact.name}: everyone checked in. ${streak} ${streak === 1 ? 'day' : 'days'} in a row.`,
				pactId: pact.id
			}))
	)
	await recordUserEvent(completedBy, PACT_EVENTS.pactDayKept, {
		metadata: { pact_id: pact.id, day_number: dayNumber, streak },
		dedupeDaily: false
	})
	return true
}
