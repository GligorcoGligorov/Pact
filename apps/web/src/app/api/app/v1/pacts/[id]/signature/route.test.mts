// POST /api/app/v1/pacts/:id/signature: the signed pact. A current member signs once.
import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { signPactResponse } from '@app/contract'
import { fake, fakeStore, reset, send, USER } from '@/server/api/app-test-kit.mts'
import { memberRow, PACT_ID } from '@/server/api/pact-fixtures.mts'

const route = await import('./route')
const { pactStore } = await import('@/server/db/pacts')
const { analyticsStore } = await import('@/server/db/analytics')
const { profileStore } = await import('@/server/db/profiles')

const PATH = 'M10 60 Q 40 20 70 60 Q 100 100 130 60 L 180 58'
const signedAt = new Date('2026-09-30T10:00:00.000Z')
const sign = (signature: unknown = PATH) =>
	send(route.POST, `/api/app/v1/pacts/${PACT_ID}/signature`, {
		method: 'POST',
		params: { id: PACT_ID },
		body: { signature }
	})

beforeEach(() => {
	reset()
	fakeStore(profileStore, 'regionOf', () => null)
	fakeStore(analyticsStore, 'hasDuplicate', () => false)
	fakeStore(analyticsStore, 'insertEvent', () => undefined)
})

test('signs the pact once: the member comes back with the signature, and pact_signed is recorded', async () => {
	fakeStore(pactStore, 'sign', () => ({
		outcome: 'signed',
		member: memberRow({ signature: PATH, signedAt })
	}))
	const res = await sign()
	assert.equal(res.status, 200)
	assert.ok(signPactResponse.safeParse(res.body).success)
	assert.equal(res.body.member.signature, PATH)
	assert.equal(res.body.member.signed_at, signedAt.toISOString())
	assert.deepEqual(fake.storeCalls.find((c) => c.method === 'sign')?.args, [PACT_ID, USER, PATH])
	const event = fake.storeCalls.find((c) => c.method === 'insertEvent')
	assert.equal((event?.args[0] as { name: string }).name, 'pact_signed')
})

test('a second signature is a 409 already_signed, and records nothing', async () => {
	fakeStore(pactStore, 'sign', () => ({
		outcome: 'already',
		member: memberRow({ signature: PATH, signedAt })
	}))
	const res = await sign()
	assert.equal(res.status, 409)
	assert.equal(res.body.error.code, 'already_signed')
	assert.equal(
		fake.storeCalls.some((c) => c.method === 'insertEvent'),
		false
	)
})

test('404 for anyone who is not a current member', async () => {
	fakeStore(pactStore, 'sign', () => null)
	const res = await sign()
	assert.equal(res.status, 404)
})

test('only path data is accepted: markup or an empty scribble is a 400, and nothing is stored', async () => {
	fakeStore(pactStore, 'sign', () => {
		throw new Error('must not be called')
	})
	for (const bad of ['<svg onload=alert(1)>', 'M1', 'M 0 0 L 10 10 Z" fill="red']) {
		const res = await sign(bad)
		assert.equal(res.status, 400, bad)
	}
})
