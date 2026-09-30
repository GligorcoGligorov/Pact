// GET /api/app/v1/invites/:code and POST …/join: what a code joins, and joining it (R4–R6).
// The clock is fixed at noon in Skopje on 2026-09-30.
import { test, beforeEach, mock } from 'node:test'
import assert from 'node:assert/strict'
import { inviteResponse, joinPactResponse } from '@app/contract'
import { fake, fakeStore, reset, send } from '@/server/api/app-test-kit.mts'
import { at, NOW, otherMember, PACT_ID, pactRow } from '@/server/api/pact-fixtures.mts'
import type { PactRecord } from '@/server/db/pacts'

const join = await import('./route')
const invite = await import('../route')
const { pactStore } = await import('@/server/db/pacts')
const { profileStore } = await import('@/server/db/profiles')
const { analyticsStore } = await import('@/server/db/analytics')

const post = (code = 'STREAK', source = 'code') =>
	send(join.POST, `/api/app/v1/invites/${code}/join`, {
		method: 'POST',
		body: { source },
		params: { code }
	})

function found(pact: PactRecord, extra: { isMember?: boolean; hasLeft?: boolean } = {}) {
	fakeStore(pactStore, 'byInviteCode', () => ({
		pact,
		memberCount: 3,
		isMember: false,
		hasLeft: false,
		...extra
	}))
}

const joins = () => fake.storeCalls.filter((c) => c.method === 'join')
const events = () =>
	fake.storeCalls
		.filter((c) => c.method === 'insertEvent')
		.map((c) => c.args[0] as { name: string; metadata?: Record<string, unknown> })

mock.timers.enable({ apis: ['Date'], now: NOW })

beforeEach(() => {
	reset()
	mock.timers.setTime(NOW.getTime())
	fakeStore(profileStore, 'regionOf', () => null)
	fakeStore(analyticsStore, 'hasDuplicate', () => false)
	fakeStore(analyticsStore, 'insertEvent', () => undefined)
	fakeStore(pactStore, 'join', (_p: string, _u: string, joinedDay: Date) => ({
		outcome: 'joined',
		member: otherMember({ joinedDay })
	}))
})

test('preview: the pact, its size and whether the caller is in; lowercase codes work', async () => {
	found(pactRow())
	const res = await send(invite.GET, '/api/app/v1/invites/streak', { params: { code: 'streak' } })
	assert.equal(res.status, 200)
	assert.ok(inviteResponse.safeParse(res.body).success)
	assert.equal(res.body.invite.pact.status, 'active')
	assert.equal(res.body.invite.member_count, 3)
	assert.equal(res.body.invite.is_member, false)
	assert.equal(fake.storeCalls[0].args[0], 'STREAK', 'looked up upper-cased')
	assert.equal(res.body.invite.pact.invite_code, undefined, 'the preview repeats no code')
})

test('preview: an unknown or malformed code is a 404', async () => {
	fakeStore(pactStore, 'byInviteCode', () => null)
	for (const code of ['ZZZZZZ', 'STRE0K', 'x']) {
		const res = await send(invite.GET, `/api/app/v1/invites/${code}`, { params: { code } })
		assert.equal(res.status, 404, code)
	}
})

test('join an active pact: 201, held from tomorrow, pact_joined with its source', async () => {
	found(pactRow())
	const res = await post('STREAK', 'deep_link')
	assert.equal(res.status, 201)
	assert.ok(joinPactResponse.safeParse(res.body).success)
	assert.equal(res.body.joined_day, '2026-10-01')
	assert.equal(res.body.pact.role, 'member')
	assert.deepEqual(joins()[0].args, [PACT_ID, joins()[0].args[1], at('2026-10-01')])
	assert.deepEqual(events(), [
		{
			userId: joins()[0].args[1],
			name: 'pact_joined',
			path: null,
			metadata: { pact_id: PACT_ID, source: 'deep_link' }
		}
	])
})

test('join in the lobby: held from the start day', async () => {
	found(pactRow({ startDay: at('2026-10-05'), endDay: at('2026-10-25') }))
	const res = await post()
	assert.equal(res.status, 201)
	assert.equal(res.body.joined_day, '2026-10-05')
})

test('join again: 200 with the membership, no event, even once the pact has finished', async () => {
	found(pactRow({ startDay: at('2026-09-01'), endDay: at('2026-09-20') }), { isMember: true })
	fakeStore(pactStore, 'join', () => ({
		outcome: 'existing',
		member: otherMember({ joinedDay: at('2026-09-02') })
	}))
	const res = await post()
	assert.equal(res.status, 200)
	assert.equal(res.body.joined_day, '2026-09-02')
	assert.equal(events().length, 0)
})

test('completed, cancelled, or on its end day: pact_closed, and nothing joined', async () => {
	for (const pact of [
		pactRow({ startDay: at('2026-09-01'), endDay: at('2026-09-29') }),
		pactRow({ cancelledAt: new Date('2026-09-10T00:00:00Z') }),
		pactRow({ endDay: at('2026-09-30') })
	]) {
		found(pact)
		const res = await post()
		assert.equal(res.status, 409)
		assert.equal(res.body.error.code, 'pact_closed')
	}
	assert.equal(joins().length, 0)
})

test('full: pact_full; left before: 409 conflict', async () => {
	found(pactRow())
	fakeStore(pactStore, 'join', () => ({ outcome: 'full' }))
	const full = await post()
	assert.equal(full.status, 409)
	assert.equal(full.body.error.code, 'pact_full')

	found(pactRow(), { hasLeft: true })
	const left = await post()
	assert.equal(left.status, 409)
	assert.equal(left.body.error.code, 'conflict')
	assert.equal(events().length, 0)
})

test('join: a source other than deep_link or code is a 400; an unknown code a 404', async () => {
	found(pactRow())
	const bad = await post('STREAK', 'qr')
	assert.equal(bad.status, 400)
	fakeStore(pactStore, 'byInviteCode', () => null)
	assert.equal((await post('ZZZZZZ')).status, 404)
})
