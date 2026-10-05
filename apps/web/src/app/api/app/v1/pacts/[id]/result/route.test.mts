// GET pacts/:id/result and POST pacts/:id/rematch: a finished pact's results, and round 2 with
// the same crew. The clock is fixed at noon in Skopje on 2026-09-30; the pact ran 09-16 → 09-22.
import { test, beforeEach, mock } from 'node:test'
import assert from 'node:assert/strict'
import { pactResultResponse, rematchPactResponse } from '@app/contract'
import { fake, fakeStore, OTHER, reset, send, USER } from '@/server/api/app-test-kit.mts'
import { at, memberRow, NOW, otherMember, PACT_ID, pactRow } from '@/server/api/pact-fixtures.mts'
import type { MemberRecord, PactRecord } from '@/server/db/pacts'
import type { PactForResults } from '@/server/db/results'

const route = await import('./route')
const rematch = await import('../rematch/route')
const { pactStore } = await import('@/server/db/pacts')
const { resultStore } = await import('@/server/db/results')
const { inboxStore } = await import('@/server/db/inbox')
const { safetyStore } = await import('@/server/db/safety')
const { analyticsStore } = await import('@/server/db/analytics')
const { profileStore } = await import('@/server/db/profiles')

const CLEO = '33333333-3333-4333-8333-333333333333'
const ROUND_2 = '44444444-4444-4444-8444-444444444444'
const DAYS = ['16', '17', '18', '19', '20', '21', '22'].map((d) => `2026-09-${d}`)
const finished = pactRow({ startDay: at(DAYS[0]), endDay: at(DAYS[6]) })
/** Members of the finished pact, held from its first day. */
const ana = (o: Partial<MemberRecord> = {}) => memberRow({ joinedDay: at(DAYS[0]), ...o })
const ben = (o: Partial<MemberRecord> = {}) => otherMember({ joinedDay: at(DAYS[0]), ...o })

function rows(members: MemberRecord[], missing: Record<string, string[]> = {}): PactForResults {
	return {
		pact: { ...finished, closedThrough: null },
		members,
		marks: members.flatMap((m) =>
			DAYS.filter((day) => !(missing[m.userId] ?? []).includes(day)).map((day) => ({
				userId: m.userId,
				day: at(day),
				kind: 'photo' as const,
				createdAt: new Date(`${day}T10:00:00Z`)
			}))
		),
		rematchId: null
	}
}

function serve(pact: PactRecord, row: PactForResults, me: MemberRecord = row.members[0]) {
	// Round 2's membership too: the caller is in the pact the rematch returns.
	fakeStore(pactStore, 'membership', (pactId: string) => ({
		pact: pactId === PACT_ID ? pact : pactRow({ id: pactId }),
		me
	}))
	fakeStore(resultStore, 'forMember', () => row)
}

const get = () =>
	send(route.GET, `/api/app/v1/pacts/${PACT_ID}/result`, { params: { id: PACT_ID } })
const post = (body: unknown = {}) =>
	send(rematch.POST, `/api/app/v1/pacts/${PACT_ID}/rematch`, {
		method: 'POST',
		body,
		params: { id: PACT_ID }
	})

mock.timers.enable({ apis: ['Date'], now: NOW })

beforeEach(() => {
	reset()
	mock.timers.setTime(NOW.getTime())
	fakeStore(profileStore, 'regionOf', () => null)
	fakeStore(analyticsStore, 'hasDuplicate', () => false)
	fakeStore(analyticsStore, 'insertEvent', () => undefined)
	fakeStore(inboxStore, 'notify', () => undefined)
	fakeStore(safetyStore, 'blockedEitherWay', () => new Set())
})

test('the results: who owes the stake, the chain, the awards, and no lobby leaver', async () => {
	const lobby = ana({ userId: CLEO, role: 'member', leftDay: at(DAYS[0]) })
	serve(finished, rows([ana(), ben(), lobby], { [OTHER]: [DAYS[2]] }))
	const res = await get()
	assert.equal(res.status, 200)
	assert.ok(pactResultResponse.safeParse(res.body).success)
	const { result } = res.body
	assert.equal(result.outcome, 'loser')
	assert.deepEqual(result.losers, [OTHER])
	assert.equal(result.kept_days, 6)
	assert.equal(result.total_days, 7)
	assert.deepEqual(
		result.members.map((m: { user_id: string }) => m.user_id),
		[USER, OTHER]
	)
	assert.deepEqual(result.members[0].awards, ['iron_streak', 'never_missed'])
	assert.equal(res.body.rematch, null)
	assert.ok(
		fake.storeCalls.some((c) => c.method === 'insertEvent'),
		'pact_result_viewed recorded'
	)
})

test('nobody pays when everyone is perfect', async () => {
	serve(finished, rows([ana(), ben()]))
	const res = await get()
	assert.equal(res.body.result.outcome, 'nobody_pays')
	assert.deepEqual(res.body.result.losers, [])
})

test('a pact still running has no results yet: 409 not_finished', async () => {
	const running = pactRow()
	serve(running, { ...rows([memberRow()]), pact: { ...running, closedThrough: null } })
	const res = await get()
	assert.equal(res.status, 409)
	assert.equal(res.body.error.code, 'not_finished')
})

test('never a member: 404', async () => {
	fakeStore(pactStore, 'membership', () => null)
	assert.equal((await get()).status, 404)
})

test('round 2: same crew, same theme and length, from tomorrow, Round 2 in the name', async () => {
	const leaver = ana({ userId: CLEO, role: 'member', leftDay: at(DAYS[3]) })
	serve(finished, rows([ana(), ben(), leaver]))
	let created: Parameters<typeof resultStore.createRematch>[0] | null = null
	fakeStore(resultStore, 'createRematch', (input: never) => {
		created = input
		return {
			outcome: 'created',
			pact: pactRow({ id: ROUND_2, name: 'Morning run crew · Round 2' })
		}
	})

	const res = await post()
	assert.equal(res.status, 201)
	assert.ok(rematchPactResponse.safeParse(res.body).success)
	assert.equal(res.body.created, true)
	const input = created!
	assert.equal(input.pact.name, 'Morning run crew · Round 2')
	assert.equal(input.pact.color, 'coral')
	assert.deepEqual(
		[input.pact.startDay, input.pact.endDay],
		[at('2026-10-01'), at('2026-10-07')],
		'tomorrow, for the same seven days'
	)
	assert.deepEqual(input.memberIds, [OTHER], 'the crew still in at the end, not the leaver')
	const notified = fake.storeCalls.find((c) => c.method === 'notify')!.args[0] as {
		userId: string
	}[]
	assert.deepEqual(
		notified.map((n) => n.userId),
		[OTHER]
	)
})

test('round 2 already started by a crewmate: 200 with theirs, no second banner', async () => {
	serve(finished, rows([ana(), ben()]))
	fakeStore(resultStore, 'createRematch', () => ({
		outcome: 'existing',
		pact: pactRow({ id: ROUND_2 })
	}))
	const res = await post()
	assert.equal(res.status, 200)
	assert.equal(res.body.created, false)
	assert.ok(!fake.storeCalls.some((c) => c.method === 'notify'))
})

test('round 2 of a running pact, or by someone who left: refused', async () => {
	const running = pactRow()
	serve(running, rows([ana()]))
	assert.equal((await post()).body.error.code, 'not_finished')
	serve(finished, rows([ana()]), ana({ leftDay: at(DAYS[2]) }))
	assert.equal((await post()).status, 404)
})
