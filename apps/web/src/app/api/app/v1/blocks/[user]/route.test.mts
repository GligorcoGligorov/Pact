// The store-rule routes (App Review 1.2, R7, R23): report a check-in, block and unblock a person,
// leave a pact, and remove a member as its owner. The stores are faked; ../../../../server/db/
// safety.test.mts runs them on a real database.
import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { okResponse } from '@app/contract'
import { fake, fakeStore, OTHER, reset, send, USER } from '@/server/api/app-test-kit.mts'
import { memberRow, PACT_ID, pactRow } from '@/server/api/pact-fixtures.mts'

const blocks = await import('./route')
const report = await import('../../check-ins/[id]/report/route')
const leave = await import('../../pacts/[id]/leave/route')
const members = await import('../../pacts/[id]/members/[member]/route')
const { safetyStore } = await import('@/server/db/safety')
const { pactStore } = await import('@/server/db/pacts')

const CHECK_IN = '44444444-4444-4444-8444-444444444444'
const calls = (method: string) => fake.storeCalls.filter((c) => c.method === method)

beforeEach(() => {
	reset()
	fakeStore(pactStore, 'membership', () => ({ pact: pactRow(), me: memberRow() }))
})

test('report: stored for the caller, with the reason; 404 outside their pacts', async () => {
	fakeStore(safetyStore, 'report', () => ({ pactId: PACT_ID }))
	const path = `/api/app/v1/check-ins/${CHECK_IN}/report`
	const res = await send(report.POST, path, {
		method: 'POST',
		params: { id: CHECK_IN },
		body: { reason: 'fake' }
	})
	assert.equal(res.status, 200)
	assert.ok(okResponse.safeParse(res.body).success)
	assert.deepEqual(calls('report')[0].args, [USER, CHECK_IN, 'fake', null])

	fakeStore(safetyStore, 'report', () => null)
	const outside = await send(report.POST, path, {
		method: 'POST',
		params: { id: CHECK_IN },
		body: { reason: 'other' }
	})
	assert.equal(outside.status, 404)
	const bad = await send(report.POST, path, {
		method: 'POST',
		params: { id: CHECK_IN },
		body: { reason: 'rude' }
	})
	assert.equal(bad.status, 400)
})

test('block: someone you share a pact with; anyone else is a 404; unblock is always fine', async () => {
	const path = `/api/app/v1/blocks/${OTHER}`
	fakeStore(safetyStore, 'block', () => true)
	fakeStore(safetyStore, 'unblock', () => undefined)
	assert.equal(
		(await send(blocks.POST, path, { method: 'POST', params: { user: OTHER }, body: {} })).status,
		200
	)
	assert.deepEqual(calls('block')[0].args, [USER, OTHER])
	fakeStore(safetyStore, 'block', () => false)
	assert.equal(
		(await send(blocks.POST, path, { method: 'POST', params: { user: OTHER }, body: {} })).status,
		404
	)
	assert.equal(
		(await send(blocks.DELETE, path, { method: 'DELETE', params: { user: OTHER } })).status,
		200
	)
})

test('leave: from today in the pact’s timezone; a non-member is a 404', async () => {
	fakeStore(safetyStore, 'leave', () => 'left')
	const path = `/api/app/v1/pacts/${PACT_ID}/leave`
	const res = await send(leave.POST, path, { method: 'POST', params: { id: PACT_ID }, body: {} })
	assert.equal(res.status, 200)
	const [pactId, userId, day] = calls('leave')[0].args as [string, string, Date]
	assert.deepEqual([pactId, userId], [PACT_ID, USER])
	assert.ok(day instanceof Date)

	fakeStore(pactStore, 'membership', () => null)
	assert.equal(
		(await send(leave.POST, path, { method: 'POST', params: { id: PACT_ID }, body: {} })).status,
		404
	)
})

test('remove: only the owner (403 otherwise); someone not in the pact is a 404', async () => {
	const path = `/api/app/v1/pacts/${PACT_ID}/members/${OTHER}`
	const params = { id: PACT_ID, member: OTHER }
	fakeStore(safetyStore, 'remove', () => 'removed')
	assert.equal((await send(members.DELETE, path, { method: 'DELETE', params })).status, 200)
	fakeStore(safetyStore, 'remove', () => 'not_owner')
	const notOwner = await send(members.DELETE, path, { method: 'DELETE', params })
	assert.equal(notOwner.status, 403)
	assert.equal(notOwner.body.error.code, 'forbidden')
	fakeStore(safetyStore, 'remove', () => 'not_member')
	assert.equal((await send(members.DELETE, path, { method: 'DELETE', params })).status, 404)
})
