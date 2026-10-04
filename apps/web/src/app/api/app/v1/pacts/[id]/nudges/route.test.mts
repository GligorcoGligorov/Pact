// POST /api/app/v1/pacts/:id/nudges (R20): one nudge per pair per day, only to someone held today
// who is still out, delivered to their inbox with a kind line. No Groq key here, so the line is
// the fixed one. The clock is fixed at noon in Skopje on 2026-09-30.
import { test, beforeEach, mock } from 'node:test'
import assert from 'node:assert/strict'
import { nudgeResponse } from '@app/contract'
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

delete process.env.GROQ_API_KEY

const route = await import('./route')
const { pactStore } = await import('@/server/db/pacts')
const { inboxStore } = await import('@/server/db/inbox')
const { analyticsStore } = await import('@/server/db/analytics')
const { profileStore } = await import('@/server/db/profiles')

const path = `/api/app/v1/pacts/${PACT_ID}/nudges`
const nudge = (to: string) =>
	send(route.POST, path, { method: 'POST', params: { id: PACT_ID }, body: { to_user_id: to } })

function serve(checkIns = [checkInRow()], outcome: 'created' | 'exists' = 'created') {
	const me = memberRow({ displayName: 'Ben Hale' })
	const members = [me, otherMember({ displayName: 'Dan' })]
	fakeStore(pactStore, 'membership', () => ({ pact: pactRow(), me }))
	fakeStore(pactStore, 'detail', () => ({ pact: pactRow(), members, checkIns, marks: checkIns }))
	fakeStore(pactStore, 'createNudge', () => outcome)
	fakeStore(inboxStore, 'notify', () => undefined)
}

mock.timers.enable({ apis: ['Date'], now: NOW })

beforeEach(() => {
	reset()
	mock.timers.setTime(NOW.getTime())
	fakeStore(profileStore, 'regionOf', () => null)
	fakeStore(analyticsStore, 'hasDuplicate', () => false)
	fakeStore(analyticsStore, 'insertEvent', () => undefined)
})

test('a nudge to a member still out: 201, their inbox gets a kind line, nudge_sent recorded', async () => {
	serve()
	const res = await nudge(OTHER)
	assert.equal(res.status, 201)
	assert.ok(nudgeResponse.safeParse(res.body).success)
	assert.deepEqual(res.body.nudge, {
		to_user_id: OTHER,
		day: TODAY,
		text: 'Dan, your crew is saving you a spot today.'
	})
	assert.deepEqual(fake.storeCalls.find((c) => c.method === 'createNudge')?.args, [
		{ pactId: PACT_ID, fromUserId: USER, toUserId: OTHER, day: at(TODAY) }
	])
	const [messages] = fake.storeCalls.find((c) => c.method === 'notify')?.args as [unknown[]]
	assert.deepEqual(messages, [
		{
			userId: OTHER,
			title: 'Ben nudged you · Morning run crew',
			body: 'Dan, your crew is saving you a spot today.',
			pactId: PACT_ID
		}
	])
	const events = fake.storeCalls
		.filter((c) => c.method === 'insertEvent')
		.map((c) => (c.args[0] as { name: string }).name)
	assert.deepEqual(events, ['nudge_sent'])
})

test('one per pair per day; never to someone already in; never to yourself', async () => {
	serve([checkInRow()], 'exists')
	assert.equal((await nudge(OTHER)).body.error.code, 'already_nudged')

	serve([checkInRow(), checkInRow({ userId: OTHER })])
	const inAlready = await nudge(OTHER)
	assert.equal(inAlready.status, 409)
	assert.equal(inAlready.body.error.code, 'already_in')

	serve()
	assert.equal((await nudge(USER)).status, 400)
	assert.equal(fake.storeCalls.filter((c) => c.method === 'notify').length, 0, 'no inbox writes')
})

test('not a member, or a pact with no check-in today', async () => {
	fakeStore(pactStore, 'membership', () => null)
	assert.equal((await nudge(OTHER)).status, 404)

	fakeStore(pactStore, 'membership', () => ({
		pact: pactRow({ startDay: at('2026-10-05'), endDay: at('2026-10-25') }),
		me: memberRow()
	}))
	const lobby = await nudge(OTHER)
	assert.equal(lobby.status, 409)
	assert.equal(lobby.body.error.code, 'not_held')
})
