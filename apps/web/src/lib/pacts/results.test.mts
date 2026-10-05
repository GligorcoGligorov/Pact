// A finished pact's results (results.ts) and what the closer does with each pact
// (closing.ts). The loser rules themselves are pinned in progress.test.mts; these pin the
// finale built on them: the awards, the ties, late joiners, leavers, savers, and a closer
// that can run any number of times.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { closePlan } from './closing'
import type { MemberSpan, PactCalendar } from './day'
import { finalResult, type TimedCheckIn } from './results'

// A 7-day daily pact in Skopje (UTC+2 in October), Monday 2026-10-05 to Sunday 2026-10-11.
const pact: PactCalendar & { cancelledAt: Date | null } = {
	timezone: 'Europe/Skopje',
	cadence: 'daily',
	startDay: '2026-10-05',
	endDay: '2026-10-11',
	cancelledAt: null
}
const DAYS = ['05', '06', '07', '08', '09', '10', '11'].map((d) => `2026-10-${d}`)
const AFTER = '2026-10-12'

const member = (userId: string, joinedDay = pact.startDay, leftDay: string | null = null) => ({
	userId,
	joinedDay,
	leftDay
})
const [ana, ben, cleo, dan] = ['ana', 'ben', 'cleo', 'dan'].map((id) => member(id))

/** A photo at `hour` pact-local (Skopje is UTC+2 throughout). */
const photo = (userId: string, day: string, hour = 12): TimedCheckIn => ({
	userId,
	day,
	kind: 'photo',
	createdAt: new Date(`${day}T${String(hour - 2).padStart(2, '0')}:00:00Z`)
})
const saver = (userId: string, day: string): TimedCheckIn => ({
	...photo(userId, day),
	kind: 'saver'
})
const every = (userId: string, days: string[], hour?: number) =>
	days.map((d) => photo(userId, d, hour))

const result = (checkIns: TimedCheckIn[], members: MemberSpan[], today = AFTER) =>
	finalResult({ pact, members, checkIns, today })
const winners = (r: ReturnType<typeof result>, kind: string) =>
	r!.awards.find((a) => a.kind === kind)?.userIds ?? []

test('no results until the pact is over', () => {
	assert.equal(result(every('ana', DAYS), [ana], DAYS[6]), null)
	assert.notEqual(result(every('ana', DAYS), [ana]), null)
})

test('one loser: the crew chain, records, best streaks and who owes the stake', () => {
	// Dan misses day 3 and day 6; everyone else is perfect.
	const checkIns = [
		...every('ana', DAYS),
		...every('ben', DAYS),
		...every('dan', [DAYS[0], DAYS[1], DAYS[3], DAYS[4], DAYS[6]])
	]
	const r = result(checkIns, [ana, ben, dan])!
	assert.equal(r.outcome, 'loser')
	assert.deepEqual(r.losers, ['dan'])
	assert.deepEqual(
		r.chain.map((d) => d.status),
		['kept', 'kept', 'broken', 'kept', 'kept', 'broken', 'kept']
	)
	assert.equal(r.keptDays, 5)
	assert.equal(r.totalDays, 7)
	assert.equal(r.bestStreak, 2)
	const dans = r.members.find((m) => m.userId === 'dan')!
	assert.deepEqual([dans.daysDone, dans.daysHeld, dans.bestStreak], [5, 7, 2])
})

test('a partial tie at the bottom: both pay', () => {
	const checkIns = [
		...every('ana', DAYS),
		...every('ben', DAYS.slice(1)),
		...every('cleo', DAYS.slice(0, 6))
	]
	const r = result(checkIns, [ana, ben, cleo])!
	assert.equal(r.outcome, 'loser')
	assert.deepEqual(r.losers, ['ben', 'cleo'])
})

test('nobody pays when everyone ties: all perfect, or all equally imperfect', () => {
	const perfect = result([...every('ana', DAYS), ...every('ben', DAYS)], [ana, ben])!
	assert.equal(perfect.outcome, 'nobody_pays')
	assert.deepEqual(perfect.losers, [])
	const sameMiss = result(
		[...every('ana', DAYS.slice(1)), ...every('ben', DAYS.slice(0, 6))],
		[ana, ben]
	)!
	assert.equal(sameMiss.outcome, 'nobody_pays')
})

test('a late joiner is judged on their own days, and can win iron streak on them', () => {
	// Cleo joins for the last 4 days and does them all; Ana misses day 1.
	const late = member('cleo', DAYS[3])
	const r = result(
		[...every('ana', DAYS.slice(1)), ...every('ben', DAYS), ...every('cleo', DAYS.slice(3))],
		[ana, ben, late]
	)!
	const cleos = r.members.find((m) => m.userId === 'cleo')!
	assert.deepEqual([cleos.daysDone, cleos.daysHeld, cleos.isLoser], [4, 4, false])
	assert.deepEqual(r.losers, ['ana'])
	assert.deepEqual(winners(r, 'never_missed'), ['ben', 'cleo'])
	assert.deepEqual(winners(r, 'iron_streak'), ['ben'])
})

test('a leaver keeps their record and can still lose; a lobby leaver is never held', () => {
	const quitter = member('ben', pact.startDay, DAYS[3])
	const lobby = member('dan', pact.startDay, '2026-10-01')
	const r = result(
		[...every('ana', DAYS), ...every('ben', DAYS.slice(0, 2))],
		[ana, quitter, lobby]
	)!
	assert.deepEqual(r.losers, ['ben'])
	const dans = r.members.find((m) => m.userId === 'dan')!
	assert.deepEqual([dans.daysHeld, dans.isLoser, dans.awards], [0, false, []])
})

test('the saver: counted as done, used shows, clutch only when the crew kept that day', () => {
	const r = result(
		[
			...every('ana', DAYS),
			...every(
				'ben',
				DAYS.filter((d) => d !== DAYS[2])
			),
			saver('ben', DAYS[2]),
			...every(
				'cleo',
				DAYS.filter((d) => d !== DAYS[4])
			),
			saver('cleo', DAYS[4]),
			// Dan broke day 5, so Cleo's saver kept nothing.
			...every(
				'dan',
				DAYS.filter((d) => d !== DAYS[4])
			)
		],
		[ana, ben, cleo, dan]
	)!
	const by = (id: string) => r.members.find((m) => m.userId === id)!
	assert.deepEqual([by('ben').daysDone, by('ben').saverUsed], [7, true])
	assert.equal(by('ana').saverUsed, false)
	assert.deepEqual(winners(r, 'clutch_save'), ['ben'])
	// A saver keeps the record, not "never missed": that's photos only.
	assert.deepEqual(winners(r, 'never_missed'), ['ana'])
	assert.deepEqual(r.losers, ['dan'])
})

test('comeback kid: a miss, then three in a row', () => {
	const r = result(
		[
			...every('ana', DAYS),
			...every('ben', [DAYS[0], DAYS[2], DAYS[3], DAYS[4]]),
			...every('cleo', [DAYS[0], DAYS[2], DAYS[3]])
		],
		[ana, ben, cleo]
	)!
	assert.deepEqual(winners(r, 'comeback_kid'), ['ben'])
})

test('iron streak: only the longest run wins, ties share, and short runs win nothing', () => {
	const tie = result([...every('ana', DAYS), ...every('ben', DAYS)], [ana, ben])!
	assert.deepEqual(winners(tie, 'iron_streak'), ['ana', 'ben'])
	const short = result([...every('ana', [DAYS[0], DAYS[1], DAYS[3], DAYS[4]])], [ana])!
	assert.deepEqual(winners(short, 'iron_streak'), [])
})

test('early bird and night owl, by the pact-local clock', () => {
	const r = result(
		[
			...every('ana', DAYS.slice(0, 3), 7),
			...every('ana', DAYS.slice(3), 12),
			...every('ben', DAYS.slice(0, 2), 22),
			...every('ben', DAYS.slice(2), 8),
			...every('cleo', DAYS, 23)
		],
		[ana, ben, cleo]
	)!
	assert.deepEqual(winners(r, 'early_bird'), ['ben'])
	assert.deepEqual(winners(r, 'night_owl'), ['cleo'])
})

// ── The closer's plan ─────────────────────────────────────────────────────────

const plan = (today: string, closedThrough: string | null, checkIns: TimedCheckIn[]) =>
	closePlan({ pact, members: [ana, ben], checkIns, today, closedThrough })

test('closing: nothing in the lobby or on day one; then up to yesterday', () => {
	assert.equal(plan('2026-10-04', null, []), null)
	assert.equal(plan(DAYS[0], null, []), null)
	const p = plan(DAYS[3], null, [...every('ana', DAYS), ...every('ben', DAYS.slice(0, 3))])!
	assert.equal(p.through, DAYS[2])
	assert.deepEqual(
		p.closedDays.map((d) => d.status),
		['kept', 'kept', 'kept']
	)
	assert.equal(p.broken, null)
	assert.equal(p.finished, null)
})

test('closing is idempotent: a second run on the same day has nothing to do', () => {
	assert.equal(plan(DAYS[3], DAYS[2], []), null)
	assert.equal(plan(AFTER, DAYS[6], []), null)
	assert.equal(plan('2026-11-30', DAYS[6], []), null)
})

test('catching up a week announces only the latest day, and only when it broke', () => {
	const checkIns = [...every('ana', DAYS), ...every('ben', DAYS.slice(0, 4))]
	const p = plan(DAYS[6], null, checkIns)!
	assert.equal(p.closedDays.length, 6)
	assert.deepEqual(p.broken, { day: DAYS[5], dayNumber: 6, userIds: ['ana', 'ben'] })
	// Picking up after day 4: days 5 and 6 close now.
	assert.deepEqual(
		plan(DAYS[6], DAYS[3], checkIns)!.closedDays.map((d) => d.day),
		[DAYS[4], DAYS[5]]
	)
})

test('the end day closing finishes the pact, for everyone still in', () => {
	const late = member('cleo', DAYS[2])
	const leaver = member('dan', pact.startDay, DAYS[1])
	const p = closePlan({
		pact,
		members: [ana, ben, late, leaver],
		checkIns: [],
		today: '2026-12-01',
		closedThrough: DAYS[4]
	})!
	assert.equal(p.through, DAYS[6])
	assert.equal(p.broken, null, 'the results replace the last day’s message')
	assert.deepEqual(p.finished, { userIds: ['ana', 'ben', 'cleo'] })
})

test('a cancelled pact is never closed', () => {
	assert.equal(
		closePlan({
			pact: { ...pact, cancelledAt: new Date('2026-10-01') },
			members: [ana],
			checkIns: [],
			today: AFTER,
			closedThrough: null
		}),
		null
	)
})
