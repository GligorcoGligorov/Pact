// GET /api/app/v1/feed and POST/DELETE /api/app/v1/check-ins/:id/reactions/:reaction: the crew
// feed (R22) with its signed photo URLs and reactions, and the reactions themselves.
import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { listFeedResponse, reactionResponse } from '@app/contract'
import { fake, fakeStore, OTHER, reset, send, USER } from '@/server/api/app-test-kit.mts'
import { at, PACT_ID } from '@/server/api/pact-fixtures.mts'

const feed = await import('./route')
const reactions = await import('../check-ins/[id]/reactions/[reaction]/route')
const { crewFeedStore } = await import('@/server/db/crew-feed')
const { analyticsStore } = await import('@/server/db/analytics')
const { profileStore } = await import('@/server/db/profiles')
const { safetyStore } = await import('@/server/db/safety')

const CHECK_IN = '44444444-4444-4444-8444-444444444444'
const SAVER = '55555555-5555-4555-8555-555555555555'
const PHOTO = `${OTHER}/proofs/66666666-6666-4666-8666-666666666666.jpg`

function row(id: string, extra: Record<string, unknown> = {}) {
	return {
		id,
		pactId: PACT_ID,
		userId: OTHER,
		day: at('2026-09-30'),
		kind: 'photo',
		challenge: 'Give a thumbs up',
		photoPath: PHOTO,
		note: null,
		verdict: 'suspicious',
		aiReason: 'No thumb in sight.',
		aiCaption: 'Bold.',
		createdAt: new Date('2026-09-30T10:00:00.000Z'),
		member: {
			profile: { displayName: 'Ben' },
			pact: { name: '6am Run Club', habit: 'Run', color: 'coral', emoji: '🏃' }
		},
		...extra
	}
}

const tally = (fire = 0, mine: string[] = []) => ({ counts: { fire, clap: 0, laugh: 0 }, mine })

beforeEach(() => {
	reset()
	fakeStore(profileStore, 'regionOf', () => null)
	fakeStore(analyticsStore, 'hasDuplicate', () => false)
	fakeStore(analyticsStore, 'insertEvent', () => undefined)
	fakeStore(safetyStore, 'blockedEitherWay', () => new Set())
	fakeStore(safetyStore, 'reportedBy', () => new Set())
})

test('the feed: each check-in with its signed photo, verdict and reactions, and the next page', async () => {
	fakeStore(crewFeedStore, 'page', () => ({
		rows: [
			row(CHECK_IN),
			row(SAVER, {
				kind: 'saver',
				photoPath: null,
				verdict: 'skipped',
				aiReason: null,
				aiCaption: null
			})
		],
		nextAfter: SAVER,
		tallies: new Map([[CHECK_IN, tally(2, ['fire'])]])
	}))
	fake.storage = () =>
		Response.json([
			{ path: PHOTO, signedURL: `/object/sign/user-uploads/${PHOTO}?token=t`, error: null }
		])

	const res = await send(feed.GET, '/api/app/v1/feed?limit=2')
	assert.equal(res.status, 200)
	assert.ok(listFeedResponse.safeParse(res.body).success)
	const [photo, saver] = res.body.entries
	assert.equal(photo.display_name, 'Ben')
	assert.equal(photo.pact_name, '6am Run Club')
	assert.equal(photo.pact_color, 'coral')
	assert.equal(photo.pact_emoji, '🏃')
	assert.equal(photo.verdict, 'suspicious')
	assert.equal(photo.ai_reason, 'No thumb in sight.', 'the crew sees why (R15)')
	assert.match(photo.photo_url, /token=t/)
	assert.deepEqual(photo.reactions, tally(2, ['fire']))
	assert.equal(saver.photo_url, null)
	assert.deepEqual(saver.reactions, tally(), 'no reactions yet is all zeros')
	assert.ok(res.body.next_cursor)
	assert.deepEqual(fake.storeCalls.find((c) => c.method === 'page')?.args, [
		USER,
		{ limit: 2, after: undefined },
		new Set()
	])
})

test('the feed: a cursor from another list is a 400, not an empty page', async () => {
	fakeStore(crewFeedStore, 'page', () => ({ rows: [], nextAfter: null, tallies: new Map() }))
	const cursor = Buffer.from(JSON.stringify({ v: 1, list: 'items', id: CHECK_IN })).toString(
		'base64url'
	)
	const res = await send(feed.GET, `/api/app/v1/feed?cursor=${cursor}`)
	assert.equal(res.status, 400)
})

test('react: adds the reaction and records it once; a repeat records nothing', async () => {
	const path = `/api/app/v1/check-ins/${CHECK_IN}/reactions/fire`
	const params = { id: CHECK_IN, reaction: 'fire' }
	let added = true
	fakeStore(crewFeedStore, 'react', () => ({ pactId: PACT_ID, added, tally: tally(1, ['fire']) }))

	const first = await send(reactions.POST, path, { method: 'POST', params, body: {} })
	assert.equal(first.status, 200)
	assert.ok(reactionResponse.safeParse(first.body).success)
	assert.deepEqual(first.body.reactions, tally(1, ['fire']))
	added = false
	await send(reactions.POST, path, { method: 'POST', params, body: {} })

	const recorded = fake.storeCalls
		.filter((c) => c.method === 'insertEvent')
		.map((c) => c.args[0] as { name: string; metadata?: Record<string, unknown> })
	assert.deepEqual(
		recorded.map((e) => [e.name, e.metadata]),
		[['check_in_reacted', { pact_id: PACT_ID, reaction: 'fire' }]]
	)
	assert.deepEqual(fake.storeCalls.find((c) => c.method === 'react')?.args, [
		USER,
		CHECK_IN,
		'fire',
		true
	])
})

test('react: taking it back, and a check-in outside your pacts is a 404', async () => {
	fakeStore(crewFeedStore, 'react', (_u: string, _c: string, _r: string, on: boolean) =>
		on ? null : { pactId: PACT_ID, added: false, tally: tally() }
	)
	const params = { id: CHECK_IN, reaction: 'fire' }
	const path = `/api/app/v1/check-ins/${CHECK_IN}/reactions/fire`
	const back = await send(reactions.DELETE, path, { method: 'DELETE', params })
	assert.equal(back.status, 200)
	assert.deepEqual(back.body.reactions, tally())
	const outside = await send(reactions.POST, path, { method: 'POST', params, body: {} })
	assert.equal(outside.status, 404)
})
