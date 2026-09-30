// The arithmetic every pact screen reads: who is in today, which days were kept, the
// streaks, each member's record and who lost. All of it is computed from memberships and
// check-ins on every read (R10), so these tests are the whole definition of a kept day.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CHALLENGES, CHALLENGE_STRIDE, challengeFor } from './challenges'
import { addDays, joinedDayFor, type MemberSpan, type PactCalendar } from './day'
import {
	chain,
	memberRecords,
	pactResult,
	streaks,
	todayBoard,
	type CheckInMark,
	type PactProgressInput
} from './progress'

// A 7-day daily pact, Monday 2026-10-05 to Sunday 2026-10-11.
const pact: PactCalendar & { cancelledAt: Date | null } = {
	timezone: 'Europe/Skopje',
	cadence: 'daily',
	startDay: '2026-10-05',
	endDay: '2026-10-11',
	cancelledAt: null
}
const DAYS = [
	'2026-10-05',
	'2026-10-06',
	'2026-10-07',
	'2026-10-08',
	'2026-10-09',
	'2026-10-10',
	'2026-10-11'
]

const member = (
	userId: string,
	joinedDay = pact.startDay,
	leftDay: string | null = null
): MemberSpan => ({
	userId,
	joinedDay,
	leftDay
})
const ana = member('ana')
const ben = member('ben')

/** Everyone checks in with a photo on each of `days`. */
const all = (members: MemberSpan[], days: string[]): CheckInMark[] =>
	days.flatMap((day) => members.map((m) => ({ userId: m.userId, day, kind: 'photo' as const })))
const photo = (userId: string, day: string): CheckInMark => ({ userId, day, kind: 'photo' })
const saver = (userId: string, day: string): CheckInMark => ({ userId, day, kind: 'saver' })

const input = (
	today: string,
	checkIns: CheckInMark[],
	members: MemberSpan[] = [ana, ben],
	overrides: Partial<PactProgressInput['pact']> = {}
): PactProgressInput => ({ pact: { ...pact, ...overrides }, members, checkIns, today })

const statuses = (i: PactProgressInput) => chain(i).map((d) => d.status)

test('the chain: kept when everyone held checked in, broken otherwise, today open', () => {
	const checkIns = [
		...all([ana, ben], DAYS.slice(0, 2)),
		photo('ana', DAYS[2]),
		...all([ana, ben], [DAYS[3]])
	]
	assert.deepEqual(statuses(input(DAYS[3], checkIns)), ['kept', 'kept', 'broken', 'open'])
	// Today stays open even once it is kept; it closes at midnight.
	assert.deepEqual(statuses(input(DAYS[1], all([ana, ben], DAYS.slice(0, 2)))), ['kept', 'open'])
	// Nothing in the lobby; the whole run once completed.
	assert.deepEqual(chain(input('2026-10-04', [])), [])
	assert.equal(chain(input('2026-10-20', [])).length, 7)
	assert.ok(chain(input('2026-10-20', [])).every((d) => d.status === 'broken'))
})

test('a streak saver keeps the day and shows as saver on the board', () => {
	const checkIns = [
		photo('ana', DAYS[0]),
		saver('ben', DAYS[0]),
		photo('ana', DAYS[1]),
		saver('ben', DAYS[1])
	]
	assert.deepEqual(statuses(input(DAYS[2], checkIns)), ['kept', 'kept', 'open'])
	assert.deepEqual(todayBoard(input(DAYS[1], checkIns)), [
		{ userId: 'ana', state: 'in' },
		{ userId: 'ben', state: 'saver' }
	])
	assert.deepEqual(todayBoard(input(DAYS[2], checkIns)), [
		{ userId: 'ana', state: 'out' },
		{ userId: 'ben', state: 'out' }
	])
})

test('streaks: back from yesterday, plus today once kept', () => {
	const threeKept = all([ana, ben], DAYS.slice(0, 3))
	// Today (day 4) is open and nobody is in yet: it neither adds nor breaks.
	assert.deepEqual(streaks(input(DAYS[3], threeKept)), { current: 3, best: 3 })
	// Half in: still open, still 3.
	assert.deepEqual(streaks(input(DAYS[3], [...threeKept, photo('ana', DAYS[3])])), {
		current: 3,
		best: 3
	})
	// Everyone in: today counts.
	assert.deepEqual(streaks(input(DAYS[3], all([ana, ben], DAYS.slice(0, 4)))), {
		current: 4,
		best: 4
	})
	// Yesterday broken: the current streak is 0, the best survives.
	const brokenYesterday = [...all([ana, ben], DAYS.slice(0, 3)), photo('ana', DAYS[3])]
	assert.deepEqual(streaks(input(DAYS[4], brokenYesterday)), { current: 0, best: 3 })
	// A new run after a break.
	const rebuilt = [...brokenYesterday, ...all([ana, ben], DAYS.slice(4, 6))]
	assert.deepEqual(streaks(input(DAYS[6], rebuilt)), { current: 2, best: 3 })
	// The first day, before anyone checks in.
	assert.deepEqual(streaks(input(DAYS[0], [])), { current: 0, best: 0 })
	// In the lobby, and after the end: the end day is the last one that counts.
	assert.deepEqual(streaks(input('2026-10-01', [])), { current: 0, best: 0 })
	assert.deepEqual(streaks(input('2026-10-30', all([ana, ben], DAYS))), { current: 7, best: 7 })
})

test('a weekdays streak runs straight across the weekend', () => {
	const weekdays = { cadence: 'weekdays' as const, endDay: '2026-10-16' }
	const monToFri = ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09']
	const checkIns = all([ana, ben], [...monToFri, '2026-10-12'])
	// Saturday and Sunday are not days: Monday's today follows Friday.
	assert.deepEqual(streaks(input('2026-10-11', checkIns, [ana, ben], weekdays)), {
		current: 5,
		best: 5
	})
	assert.deepEqual(streaks(input('2026-10-12', checkIns, [ana, ben], weekdays)), {
		current: 6,
		best: 6
	})
	// Nobody is held on a Saturday.
	assert.deepEqual(todayBoard(input('2026-10-10', [], [ana, ben], weekdays)), [])
	assert.equal(chain(input('2026-10-12', checkIns, [ana, ben], weekdays)).length, 6)
})

test('a late joiner never breaks the day they join, and is held from the next', () => {
	// Ana and Ben are both in on day 3 when Cleo joins, late that evening.
	const cleo = member('cleo', joinedDayFor(pact, DAYS[2]))
	const checkIns = all([ana, ben], DAYS.slice(0, 3))
	const i = input(DAYS[2], checkIns, [ana, ben, cleo])
	assert.deepEqual(
		todayBoard(i).map((m) => m.userId),
		['ana', 'ben']
	)
	assert.deepEqual(streaks(i), { current: 3, best: 3 })
	// Tomorrow she is held like everyone else: out until she checks in.
	const tomorrow = input(DAYS[3], [...checkIns, ...all([ana, ben], [DAYS[3]])], [ana, ben, cleo])
	assert.deepEqual(
		todayBoard(tomorrow).find((m) => m.userId === 'cleo'),
		{ userId: 'cleo', state: 'out' }
	)
	assert.deepEqual(streaks(tomorrow), { current: 3, best: 3 })
	assert.deepEqual(statuses(input(DAYS[4], tomorrow.checkIns, [ana, ben, cleo])).slice(3), [
		'broken',
		'open'
	])
})

test('leaving: never breaks the day they leave, and the days before still count', () => {
	// Ben leaves on day 4 without checking in; Ana is in.
	const benLeft = member('ben', pact.startDay, DAYS[3])
	const checkIns = [...all([ana, ben], DAYS.slice(0, 3)), photo('ana', DAYS[3])]
	const i = input(DAYS[3], checkIns, [ana, benLeft])
	assert.deepEqual(todayBoard(i), [{ userId: 'ana', state: 'in' }])
	assert.deepEqual(streaks(i), { current: 4, best: 4 })
	assert.deepEqual(memberRecords(i), [
		{ userId: 'ana', daysDone: 4, daysHeld: 4 },
		{ userId: 'ben', daysDone: 3, daysHeld: 3 }
	])
})

test('a check-in on a day its author was not held to counts for nothing', () => {
	const late = member('cleo', DAYS[3])
	const checkIns = [...all([ana, ben], DAYS.slice(0, 3)), photo('cleo', DAYS[1])]
	const [, , cleo] = memberRecords(input(DAYS[4], checkIns, [ana, ben, late]))
	assert.deepEqual(cleo, { userId: 'cleo', daysDone: 0, daysHeld: 1 })
})

test('a day nobody was held to is broken, not kept', () => {
	// Ana is alone and leaves on day 2: from then on nobody is held.
	const anaLeft = member('ana', pact.startDay, DAYS[1])
	assert.deepEqual(statuses(input(DAYS[3], [photo('ana', DAYS[0])], [anaLeft])), [
		'kept',
		'broken',
		'broken',
		'open'
	])
	assert.deepEqual(todayBoard(input(DAYS[3], [], [anaLeft])), [])
})

test('records: today counts only once the member is in', () => {
	const checkIns = [...all([ana, ben], DAYS.slice(0, 2)), photo('ana', DAYS[2])]
	assert.deepEqual(memberRecords(input(DAYS[2], checkIns)), [
		{ userId: 'ana', daysDone: 3, daysHeld: 3 },
		{ userId: 'ben', daysDone: 2, daysHeld: 2 }
	])
	// Once the day closes, Ben's miss is held against him.
	assert.deepEqual(memberRecords(input(DAYS[3], checkIns))[1], {
		userId: 'ben',
		daysDone: 2,
		daysHeld: 3
	})
})

const cleo = member('cleo')
const dan = member('dan')

test('the result is null until the pact completes, and for a cancelled pact', () => {
	assert.equal(pactResult(input(DAYS[6], all([ana, ben], DAYS))), null)
	assert.equal(
		pactResult(input('2026-10-04', [], [ana, ben], { cancelledAt: new Date('2026-10-01') })),
		null
	)
	assert.notEqual(pactResult(input('2026-10-12', all([ana, ben], DAYS))), null)
})

const losers = (i: PactProgressInput) =>
	pactResult(i)!
		.filter((m) => m.isLoser)
		.map((m) => m.userId)

test('the loser is whoever has the lowest completion rate', () => {
	const checkIns = [...all([ana, ben, cleo], DAYS), ...all([dan], DAYS.slice(0, 5))]
	const result = pactResult(input('2026-10-12', checkIns, [ana, ben, cleo, dan]))!
	assert.deepEqual(
		result.find((m) => m.userId === 'dan'),
		{ userId: 'dan', daysDone: 5, daysHeld: 7, isLoser: true }
	)
	assert.deepEqual(losers(input('2026-10-12', checkIns, [ana, ben, cleo, dan])), ['dan'])
})

test('everyone tied at the lowest rate loses together', () => {
	const checkIns = [...all([ana, ben], DAYS), ...all([cleo, dan], DAYS.slice(0, 6))]
	assert.deepEqual(losers(input('2026-10-12', checkIns, [ana, ben, cleo, dan])), ['cleo', 'dan'])
})

test('if everyone is at 100%, nobody loses', () => {
	assert.deepEqual(
		losers(input('2026-10-12', all([ana, ben, cleo, dan], DAYS), [ana, ben, cleo, dan])),
		[]
	)
	// A saver is a done day.
	const withSaver = [
		...all([ana, ben], DAYS.slice(1)),
		photo('ana', DAYS[0]),
		saver('ben', DAYS[0])
	]
	assert.deepEqual(losers(input('2026-10-12', withSaver)), [])
})

test('if everyone missed the same share, everyone loses', () => {
	assert.deepEqual(losers(input('2026-10-12', all([ana, ben], DAYS.slice(0, 5)))), ['ana', 'ben'])
})

test('rates are compared exactly: a late joiner at 4/6 ties a member at 2/3', () => {
	// A 9-day pact. Ana: 6 of 9. Ben joined for the last 6 days and did 4: both 2/3.
	const long = { endDay: addDays(pact.startDay, 8) }
	const nine = Array.from({ length: 9 }, (_, i) => addDays(pact.startDay, i))
	const late = member('ben', nine[3])
	const checkIns = [
		...all([ana], nine.slice(0, 6)),
		...all([late], nine.slice(3, 7)),
		...all([cleo], nine)
	]
	const i = input('2026-10-20', checkIns, [ana, late, cleo], long)
	assert.deepEqual(
		pactResult(i)!.map((m) => [m.userId, m.daysDone, m.daysHeld]),
		[
			['ana', 6, 9],
			['ben', 4, 6],
			['cleo', 9, 9]
		]
	)
	assert.deepEqual(losers(i), ['ana', 'ben'])
})

test('a late joiner is judged on the days they were held, not the whole pact', () => {
	// Cleo joined for the last 3 days and did all 3: 100%. Ana missed one of 7.
	const late = member('cleo', DAYS[4])
	const checkIns = [
		...all([ana], DAYS.slice(0, 6)),
		...all([ben], DAYS),
		...all([late], DAYS.slice(4))
	]
	assert.deepEqual(losers(input('2026-10-12', checkIns, [ana, ben, late])), ['ana'])
})

test('leaving does not dodge losing; leaving in the lobby is never held, and never loses', () => {
	const quitter = member('ben', pact.startDay, DAYS[2])
	const lobbyLeaver = member('cleo', pact.startDay, '2026-10-02')
	const checkIns = [...all([ana], DAYS), photo('ben', DAYS[0])]
	const result = pactResult(input('2026-10-12', checkIns, [ana, quitter, lobbyLeaver]))!
	assert.deepEqual(result, [
		{ userId: 'ana', daysDone: 7, daysHeld: 7, isLoser: false },
		{ userId: 'ben', daysDone: 1, daysHeld: 2, isLoser: true },
		{ userId: 'cleo', daysDone: 0, daysHeld: 0, isLoser: false }
	])
})

test('the daily challenge: the same for every reader, no repeats within a cycle', () => {
	const pactId = '3f1c2a9e-5b7d-4e2a-9c1b-0a8d6e4f2b17'
	assert.equal(challengeFor(pactId, '2026-10-05'), challengeFor(pactId, '2026-10-05'))
	const cycle = Array.from({ length: CHALLENGES.length }, (_, i) =>
		challengeFor(pactId, addDays('2026-10-05', i))
	)
	assert.equal(new Set(cycle).size, CHALLENGES.length)
	// Different pacts start at different places in the list.
	const others = ['a', 'b', 'c', 'd', 'e'].map((id) => challengeFor(id, '2026-10-05'))
	assert.ok(new Set(others).size > 1)
	// The stride must share no factor with the list, or a cycle repeats early.
	const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b))
	assert.equal(gcd(CHALLENGE_STRIDE, CHALLENGES.length), 1)
	assert.ok(CHALLENGES.every((c) => c.length <= 60))
})
