// GET /api/app/v1/pacts/:id: the pact, its members, and today's board (R18), computed from
// the rows on this read. The clock is fixed at noon in Skopje on 2026-09-30.
import { test, beforeEach, mock } from 'node:test'
import assert from 'node:assert/strict'
import { pactDetailResponse } from '@app/contract'
import { fake, fakeStore, OTHER, reset, send, USER } from '@/server/api/app-test-kit.mts'
import {
	at,
	checkInRow,
	memberRow,
	NOW,
	otherMember,
	PACT_ID,
	pactRow,
	TODAY
} from '@/server/api/pact-fixtures.mts'
import type { CheckInRecord, MemberRecord, PactRecord } from '@/server/db/pacts'
import { challengeFor } from '@/lib/pacts/challenges'

const route = await import('./route')
const { pactStore } = await import('@/server/db/pacts')

const LATE = '33333333-3333-4333-8333-333333333333'
const path = `/api/app/v1/pacts/${PACT_ID}`
const get = () => send(route.GET, path, { params: { id: PACT_ID } })

function serve(
	pact: PactRecord,
	members: MemberRecord[],
	checkIns: CheckInRecord[],
	me: MemberRecord = members[0]
) {
	fakeStore(pactStore, 'membership', () => ({ pact, me }))
	fakeStore(pactStore, 'detail', () => ({ pact, members, checkIns }))
}

mock.timers.enable({ apis: ['Date'], now: NOW })

beforeEach(() => {
	reset()
	mock.timers.setTime(NOW.getTime())
})

test("an active pact: today's board with each held member, the challenge and the close", async () => {
	serve(
		pactRow(),
		[
			memberRow({ saverUsedDay: at('2026-09-26') }),
			otherMember(),
			memberRow({ userId: LATE, role: 'member', displayName: 'Cleo', joinedDay: at('2026-10-01') })
		],
		[
			checkInRow({
				verdict: 'suspicious',
				aiReason: 'The fingers are out of frame.',
				aiCaption: 'Bold.'
			})
		]
	)
	const res = await get()
	assert.equal(res.status, 200)
	assert.ok(pactDetailResponse.safeParse(res.body).success)
	assert.equal(res.body.members.length, 3, 'every member, the late joiner included')

	const today = res.body.today
	assert.equal(today.day, TODAY)
	assert.equal(today.challenge, challengeFor(PACT_ID, TODAY))
	assert.equal(today.closes_at, '2026-09-30T22:00:00.000Z', 'midnight in Skopje')
	assert.equal(today.held_count, 2, 'the late joiner is held from tomorrow')
	assert.equal(today.in_count, 1)
	assert.deepEqual(
		today.members.map((m: { user_id: string; state: string }) => [m.user_id, m.state]),
		[
			[USER, 'in'],
			[OTHER, 'out']
		]
	)
	assert.deepEqual(today.members[0].check_in, {
		id: checkInRow().id,
		kind: 'photo',
		verdict: 'suspicious',
		ai_reason: 'The fingers are out of frame.',
		ai_caption: 'Bold.'
	})
	assert.equal(today.members[1].check_in, null)
	assert.deepEqual(today.me, { held: true, state: 'in', saver_available: false })

	assert.deepEqual(fake.storeCalls.find((c) => c.method === 'detail')?.args, [
		PACT_ID,
		USER,
		at(TODAY)
	])
})

test("a saver shows as saver, and the caller's own saver is then used", async () => {
	serve(
		pactRow(),
		[memberRow({ saverUsedDay: at(TODAY) }), otherMember()],
		[checkInRow({ kind: 'saver', photoPath: null, challenge: null, verdict: 'skipped' })]
	)
	const res = await get()
	assert.equal(res.body.today.members[0].state, 'saver')
	assert.equal(res.body.today.in_count, 1, 'a saver keeps the day')
	assert.deepEqual(res.body.today.me, { held: true, state: 'saver', saver_available: false })
})

test('today follows the pact timezone: after local midnight it is the next day', async () => {
	mock.timers.setTime(new Date('2026-09-30T22:30:00.000Z').getTime())
	serve(pactRow(), [memberRow()], [])
	const res = await get()
	assert.equal(res.body.today.day, '2026-10-01')
	assert.deepEqual(fake.storeCalls.find((c) => c.method === 'detail')?.args[2], at('2026-10-01'))
})

test('no board in the lobby, after the end, or when cancelled', async () => {
	for (const [pact, status] of [
		[pactRow({ startDay: at('2026-10-05'), endDay: at('2026-10-25') }), 'lobby'],
		[pactRow({ startDay: at('2026-09-01'), endDay: at('2026-09-29') }), 'completed'],
		[pactRow({ cancelledAt: new Date('2026-09-20T00:00:00Z') }), 'cancelled']
	] as const) {
		serve(pact, [memberRow()], [])
		const res = await get()
		assert.equal(res.status, 200)
		assert.equal(res.body.pact.status, status)
		assert.equal(res.body.today, null, status)
	}
})

test('weekdays pact on a Saturday: active, nobody held, the board is empty', async () => {
	mock.timers.setTime(new Date('2026-10-03T10:00:00.000Z').getTime())
	serve(pactRow({ cadence: 'weekdays' }), [memberRow(), otherMember()], [])
	const res = await get()
	assert.equal(res.body.today.held_count, 0)
	assert.deepEqual(res.body.today.members, [])
	assert.equal(res.body.today.me.held, false)
})

test("not a member, or no such pact: 404, and a pact id that isn't a uuid is a 404 too", async () => {
	fakeStore(pactStore, 'membership', () => null)
	const res = await get()
	assert.equal(res.status, 404)
	assert.equal(fake.storeCalls.filter((c) => c.method === 'detail').length, 0)

	const bad = await send(route.GET, '/api/app/v1/pacts/nope', { params: { id: 'nope' } })
	assert.equal(bad.status, 404)
})
