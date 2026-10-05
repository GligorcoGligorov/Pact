import 'server-only'
import { PACT_EVENTS } from '@/lib/analytics/events'
import { recordUserEvent } from '@/lib/analytics/record'
import { closePlan } from '@/lib/pacts/closing'
import { addDays, dayFromDate, dateFromDay, todayIn } from '@/lib/pacts/day'
import { finalResult } from '@/lib/pacts/results'
import { calendarOf, spanOf } from '@/server/api/pact-wire'
import {
	resultStore,
	type InboxLine,
	type PactForResults,
	type ResultStore
} from '@/server/db/results'
import { log } from '@/server/lib/logger'
import { deleteProofs } from '@/server/storage/proofs'

// The closer (R26): for every pact-day that has ended since a pact's `closed_through`, the
// broken-day and "results are in" messages, once; and proof photos deleted 30 days after a
// pact's end day. Safe to run any number of times: `closed_through` moves with a conditional
// update in the same transaction as the messages, so two runs at once write them once.
//
// Run by POST /api/cron/pacts, and locally by `npm run pacts:close` (scripts/close-pacts.ts).

/** R26: photos go 30 days after the end day. */
const PHOTO_RETENTION_DAYS = 30
const PHOTO_BATCH = 200
/** Generous: every timezone's today is within a day of UTC's. */
const CLOCK_SLACK_DAYS = 2

export type CloseSummary = {
	/** Pacts whose `closed_through` moved. */
	pacts: number
	daysClosed: number
	finished: number
	messages: number
	photosDeleted: number
}

export type CloserDeps = {
	store: Pick<ResultStore, 'dueForClosing' | 'advance' | 'expiredPhotos' | 'markPhotosDeleted'>
	deletePhotos: (paths: string[]) => Promise<void>
	record: typeof recordUserEvent
}

const defaults: CloserDeps = {
	store: resultStore,
	deletePhotos: deleteProofs,
	record: recordUserEvent
}

export function brokenTitle(dayNumber: number): string {
	return `Day ${dayNumber} slipped away 💔`
}

export function finishedTitle(name: string): string {
	return `🏁 ${name} is over!`
}

export async function closePacts(now: Date, deps: CloserDeps = defaults): Promise<CloseSummary> {
	const summary: CloseSummary = {
		pacts: 0,
		daysClosed: 0,
		finished: 0,
		messages: 0,
		photosDeleted: 0
	}
	const utcToday = todayIn('UTC', now)
	const due = await deps.store.dueForClosing(dateFromDay(addDays(utcToday, CLOCK_SLACK_DAYS)))

	for (const row of due) {
		try {
			await closeOne(row, now, deps, summary)
		} catch (err) {
			// One pact failing must not stop the rest; it is retried on the next run.
			log.error('closing a pact failed', { source: 'pacts/closer', pactId: row.pact.id, err })
		}
	}

	const endedBefore = dateFromDay(addDays(utcToday, -PHOTO_RETENTION_DAYS))
	for (;;) {
		const photos = await deps.store.expiredPhotos(endedBefore, PHOTO_BATCH)
		if (photos.length === 0) break
		await deps.deletePhotos(photos.map((p) => p.photoPath))
		await deps.store.markPhotosDeleted(
			photos.map((p) => p.id),
			now
		)
		summary.photosDeleted += photos.length
		if (photos.length < PHOTO_BATCH) break
	}
	return summary
}

async function closeOne(row: PactForResults, now: Date, deps: CloserDeps, summary: CloseSummary) {
	const { pact, members, marks } = row
	const today = todayIn(pact.timezone, now)
	const input = {
		pact: calendarOf(pact),
		members: members.map(spanOf),
		checkIns: marks.map((m) => ({
			userId: m.userId,
			day: dayFromDate(m.day),
			kind: m.kind,
			createdAt: m.createdAt
		})),
		today
	}
	const plan = closePlan({
		...input,
		closedThrough: pact.closedThrough ? dayFromDate(pact.closedThrough) : null
	})
	if (!plan) return

	const lines: InboxLine[] = []
	const label = `${pact.emoji} ${pact.name}`
	if (plan.broken) {
		for (const userId of plan.broken.userIds) {
			lines.push({
				userId,
				title: brokenTitle(plan.broken.dayNumber),
				body: `${label}: not everyone made it. New day, new chain. You've got this.`,
				pactId: pact.id
			})
		}
	}
	const result = plan.finished ? finalResult(input) : null
	if (plan.finished) {
		for (const userId of plan.finished.userIds) {
			lines.push({
				userId,
				title: finishedTitle(pact.name),
				body: pact.stake
					? `The results are in. Who's on the hook for "${pact.stake}"? Tap for the reveal 🥁`
					: 'The results are in. Tap for the big reveal 🥁',
				pactId: pact.id
			})
		}
	}

	const moved = await deps.store.advance(
		pact.id,
		pact.closedThrough,
		dateFromDay(plan.through),
		lines
	)
	if (!moved) return
	summary.pacts++
	summary.daysClosed += plan.closedDays.length
	summary.messages += lines.length
	if (plan.finished && result) {
		summary.finished++
		await deps.record(pact.ownerId, PACT_EVENTS.pactCompleted, {
			metadata: {
				pact_id: pact.id,
				outcome: result.outcome,
				kept_days: result.keptDays,
				total_days: result.totalDays
			},
			dedupeDaily: false
		})
	}
}
