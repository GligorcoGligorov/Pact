// GET and POST /api/app/v1/pacts: the caller's pacts with their state today, and creating one.
// The clock is fixed, so "today" is a known day in the pact's timezone.
import { test, beforeEach, mock } from 'node:test'
import assert from 'node:assert/strict'
import { listPactsResponse, pactResponse } from '@app/contract'
import { fake, fakeStore, reset, send, USER } from '@/server/api/app-test-kit.mts'
import {
	at,
	checkInRow,
	memberRow,
	NOW,
	PACT_ID,
	pactRow,
	TODAY
} from '@/server/api/pact-fixtures.mts'

const pacts = await import('./route')
const { pactStore } = await import('@/server/db/pacts')
const { profileStore } = await import('@/server/db/profiles')
const { analyticsStore } = await import('@/server/db/analytics')

const body = {
	name: 'Morning run crew',
	habit: 'Run 3 km before 9',
	cadence: 'daily',
	days: 21,
	start_day: TODAY,
	timezone: 'Europe/Skopje'
}

const events = () =>
	fake.storeCalls
		.filter((call) => call.method === 'insertEvent')
		.map((call) => call.args[0] as { name: string; metadata?: Record<string, unknown> })

mock.timers.enable({ apis: ['Date'], now: NOW })

beforeEach(() => {
	reset()
	mock.timers.setTime(NOW.getTime())
	fakeStore(profileStore, 'regionOf', () => null)
	fakeStore(analyticsStore, 'hasDuplicate', () => false)
	fakeStore(analyticsStore, 'insertEvent', () => undefined)
	fakeStore(pactStore, 'create', (_userId: string, input: { startDay: Date; endDay: Date }) => ({
		outcome: 'created',
		pact: pactRow({ startDay: input.startDay, endDay: input.endDay })
	}))
})

test('create: 201, the owner is the caller, 21 days end 20 days after the start', async () => {
	const res = await send(pacts.POST, '/api/app/v1/pacts', { method: 'POST', body })
	assert.equal(res.status, 201)
	assert.ok(pactResponse.safeParse(res.body).success)
	assert.equal(res.body.pact.role, 'owner')
	assert.equal(res.body.pact.start_day, TODAY)
	assert.equal(res.body.pact.end_day, '2026-10-20')
	assert.equal(res.body.pact.status, 'active')

	const [call] = fake.storeCalls.filter((c) => c.method === 'create')
	assert.equal(call.args[0], USER)
	const input = call.args[1] as Record<string, unknown>
	assert.equal(input.timezone, 'Europe/Skopje')
	assert.deepEqual(input.startDay, at(TODAY))
	assert.deepEqual(input.endDay, at('2026-10-20'))
	assert.equal(input.stake, null)

	assert.deepEqual(events(), [
		{
			userId: USER,
			name: 'pact_created',
			path: null,
			metadata: { pact_id: PACT_ID, cadence: 'daily' }
		}
	])
})

test('create: an alias timezone is stored as its canonical name', async () => {
	await send(pacts.POST, '/api/app/v1/pacts', {
		method: 'POST',
		body: { ...body, timezone: 'America/Argentina/Buenos_Aires', start_day: TODAY }
	})
	const input = fake.storeCalls.find((c) => c.method === 'create')?.args[1] as {
		timezone: string
	}
	assert.equal(input.timezone, 'America/Buenos_Aires')
})

test('create: an unknown timezone or a start day in the past is a 400, nothing stored', async () => {
	for (const bad of [
		{ ...body, timezone: 'Mars/Olympus' },
		{ ...body, timezone: 'UTC+2' },
		{ ...body, start_day: '2026-09-29' }
	]) {
		const res = await send(pacts.POST, '/api/app/v1/pacts', { method: 'POST', body: bad })
		assert.equal(res.status, 400, JSON.stringify(bad))
		assert.equal(res.body.error.code, 'invalid_request')
	}
	assert.equal(fake.storeCalls.filter((c) => c.method === 'create').length, 0)
})

test('create: the start day is judged in the pact timezone, not UTC', async () => {
	// 23:30 UTC on the 30th is already 01:30 on 1 October in Skopje: the 30th is past there.
	mock.timers.setTime(new Date('2026-09-30T23:30:00.000Z').getTime())
	const res = await send(pacts.POST, '/api/app/v1/pacts', { method: 'POST', body })
	assert.equal(res.status, 400)
	const ok = await send(pacts.POST, '/api/app/v1/pacts', {
		method: 'POST',
		body: { ...body, start_day: '2026-10-01' }
	})
	assert.equal(ok.status, 201)
})

test('create: a retry by id is 200 with no second event; an id that is not ours is 409', async () => {
	fakeStore(pactStore, 'create', () => ({ outcome: 'existing', pact: pactRow() }))
	const again = await send(pacts.POST, '/api/app/v1/pacts', {
		method: 'POST',
		body: { ...body, id: PACT_ID }
	})
	assert.equal(again.status, 200)
	assert.equal(events().length, 0)

	fakeStore(pactStore, 'create', () => ({ outcome: 'conflict' }))
	const taken = await send(pacts.POST, '/api/app/v1/pacts', {
		method: 'POST',
		body: { ...body, id: PACT_ID }
	})
	assert.equal(taken.status, 409)
	assert.equal(taken.body.error.code, 'conflict')
})

test('create: a server-controlled field is refused, and no token is a 401', async () => {
	const res = await send(pacts.POST, '/api/app/v1/pacts', {
		method: 'POST',
		body: { ...body, invite_code: 'STREAK' }
	})
	assert.equal(res.status, 400)
	const anon = await send(pacts.POST, '/api/app/v1/pacts', { method: 'POST', body, token: null })
	assert.equal(anon.status, 401)
	assert.equal(fake.storeCalls.filter((c) => c.method === 'create').length, 0)
})

test("list: each pact with the caller's state today; not held today is null", async () => {
	const late = '11111111-1111-4111-8111-111111111111'
	fakeStore(pactStore, 'listForUser', () => [
		{ pact: pactRow(), me: memberRow(), checkIns: [checkInRow()] },
		{
			pact: pactRow({ id: late, inviteCode: 'LATEJN' }),
			me: memberRow({ role: 'member', joinedDay: at('2026-10-01') }),
			checkIns: []
		},
		{
			pact: pactRow({ id: '22222222-2222-4222-8222-222222222222', inviteCode: 'SAVERS' }),
			me: memberRow(),
			checkIns: [checkInRow({ kind: 'saver', day: at('2026-09-29') })]
		}
	])
	const res = await send(pacts.GET, '/api/app/v1/pacts')
	assert.equal(res.status, 200)
	assert.ok(listPactsResponse.safeParse(res.body).success)
	assert.deepEqual(
		res.body.pacts.map((p: { my_state_today: string | null }) => p.my_state_today),
		['in', null, 'out'],
		"yesterday's saver doesn't count today"
	)
	assert.deepEqual(fake.storeCalls.find((c) => c.method === 'listForUser')?.args, [
		USER,
		at('2026-09-29')
	])
})
