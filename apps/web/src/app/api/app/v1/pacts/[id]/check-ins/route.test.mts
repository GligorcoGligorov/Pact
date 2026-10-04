// POST /api/app/v1/pacts/:id/check-ins, POST …/upload and GET /api/app/v1/check-ins/:id:
// today's check-in (R11, R12, R16, R17), its proof upload, and polling its verdict. Storage is
// the test kit's fake; the judge's background task is captured and awaited here. The clock is
// fixed at noon in Skopje on 2026-09-30.
import { test, beforeEach, mock } from 'node:test'
import assert from 'node:assert/strict'
import { checkInResponse, createUploadResponse } from '@app/contract'
import { fake, fakeStore, OTHER, reset, send, USER } from '@/server/api/app-test-kit.mts'
import {
	at,
	CHECK_IN_ID,
	checkInRow,
	memberRow,
	NOW,
	PACT_ID,
	pactRow,
	TODAY
} from '@/server/api/pact-fixtures.mts'
import type { NewCheckIn } from '@/server/db/pacts'
import { challengeFor } from '@/lib/pacts/challenges'

const checkIns = await import('./route')
const upload = await import('./upload/route')
const getOne = await import('../../../check-ins/[id]/route')
const { pactStore } = await import('@/server/db/pacts')
const { profileStore } = await import('@/server/db/profiles')
const { analyticsStore } = await import('@/server/db/analytics')
const { background } = await import('@/server/api/background')

const PHOTO = `${USER}/proofs/${CHECK_IN_ID}.jpg`
const path = `/api/app/v1/pacts/${PACT_ID}/check-ins`

let uploaded: Set<string>
let tasks: (() => Promise<unknown>)[]

const post = (body: unknown) =>
	send(checkIns.POST, path, { method: 'POST', body, params: { id: PACT_ID } })

const created = () =>
	fake.storeCalls.filter((c) => c.method === 'createCheckIn').map((c) => c.args[0] as NewCheckIn)
const events = () =>
	fake.storeCalls
		.filter((c) => c.method === 'insertEvent')
		.map((c) => c.args[0] as { name: string; metadata?: Record<string, unknown> })

mock.timers.enable({ apis: ['Date'], now: NOW })

beforeEach(() => {
	reset()
	// The crew-complete check reads the day's board; null here means "nothing to celebrate"
	// (its own suite is src/server/pacts/crew-complete.test.mts).
	fakeStore(pactStore, 'detail', () => null)
	mock.timers.setTime(NOW.getTime())
	uploaded = new Set([PHOTO])
	tasks = []
	background.run = (task) => {
		tasks.push(task)
	}
	fake.storage = ({ method, url }) => {
		if (method === 'HEAD') {
			const object = decodeURIComponent(
				url.pathname.replace('/storage/v1/object/user-uploads/', '')
			)
			return new Response(null, { status: uploaded.has(object) ? 200 : 400 })
		}
		const signed = decodeURIComponent(url.pathname.replace('/storage/v1/object/upload/sign/', ''))
		return Response.json({ url: `/object/upload/sign/${signed}?token=fake-upload-token` })
	}
	fakeStore(pactStore, 'membership', () => ({ pact: pactRow(), me: memberRow() }))
	fakeStore(pactStore, 'checkInOn', () => null)
	fakeStore(pactStore, 'activeMemberCount', () => 2)
	fakeStore(pactStore, 'createCheckIn', (input: NewCheckIn) => ({
		outcome: 'created',
		checkIn: checkInRow({
			kind: input.kind,
			challenge: input.challenge,
			photoPath: input.photoPath,
			verdict: input.verdict
		})
	}))
	fakeStore(profileStore, 'hasAiConsent', () => true)
	fakeStore(profileStore, 'regionOf', () => null)
	fakeStore(analyticsStore, 'hasDuplicate', () => false)
	fakeStore(analyticsStore, 'insertEvent', () => undefined)
})

test("a photo, with AI consent: 201, today's challenge, pending, judged after the response", async () => {
	const res = await post({ kind: 'photo', photo_path: PHOTO })
	assert.equal(res.status, 201)
	assert.ok(checkInResponse.safeParse(res.body).success)
	assert.equal(res.body.check_in.verdict, 'pending')
	assert.equal(res.body.check_in.challenge, challengeFor(PACT_ID, TODAY))

	assert.deepEqual(created(), [
		{
			id: undefined,
			pactId: PACT_ID,
			userId: USER,
			day: at(TODAY),
			kind: 'photo',
			challenge: challengeFor(PACT_ID, TODAY),
			photoPath: PHOTO,
			note: null,
			verdict: 'pending'
		}
	])
	assert.equal(tasks.length, 1, 'the judge is scheduled, not awaited')
	assert.deepEqual(
		events().map((e) => [e.name, e.metadata]),
		[
			['check_in_created', { pact_id: PACT_ID, kind: 'photo' }],
			['user_activated', { activation_type: 'first_group_check_in', pact_id: PACT_ID }]
		]
	)
	assert.ok(
		fake.fetchCalls.some((call) => call.url.host === 'platform.test'),
		'user_activated also goes to the Play Events API'
	)
})

test('the scheduled judge, with no AI provider configured, stores not_configured', async () => {
	await post({ kind: 'photo', photo_path: PHOTO })
	fakeStore(pactStore, 'forJudging', () => ({
		...checkInRow(),
		member: { pact: { habit: 'Run 3 km before 9' } }
	}))
	fakeStore(pactStore, 'setVerdict', () => true)
	await tasks[0]()
	const stored = fake.storeCalls.find((c) => c.method === 'setVerdict')
	assert.deepEqual(stored?.args.slice(0, 2), [
		CHECK_IN_ID,
		{ verdict: 'not_configured', aiReason: null, aiCaption: null }
	])
	assert.deepEqual(
		events()
			.filter((e) => e.name === 'check_in_judged')
			.map((e) => e.metadata),
		[{ pact_id: PACT_ID, verdict: 'not_configured' }]
	)
})

test('a photo without AI consent: skipped, and no judge is scheduled', async () => {
	fakeStore(profileStore, 'hasAiConsent', () => false)
	const res = await post({ kind: 'photo', photo_path: PHOTO })
	assert.equal(res.status, 201)
	assert.equal(res.body.check_in.verdict, 'skipped')
	assert.equal(tasks.length, 0)
})

test('the saver: no photo, no challenge, skipped, never judged', async () => {
	const res = await post({ kind: 'saver', note: 'Sick day' })
	assert.equal(res.status, 201)
	assert.equal(res.body.check_in.kind, 'saver')
	assert.equal(created()[0].challenge, null)
	assert.equal(created()[0].photoPath, null)
	assert.equal(created()[0].note, 'Sick day')
	assert.equal(created()[0].verdict, 'skipped')
	assert.equal(tasks.length, 0)
	assert.equal(fake.fetchCalls.filter((c) => c.url.pathname.startsWith('/storage/')).length, 0)
})

test("someone else's photo, or one never uploaded: 400, nothing stored", async () => {
	for (const photo of [`${OTHER}/proofs/${CHECK_IN_ID}.jpg`, `${USER}/proofs/${OTHER}.jpg`]) {
		const res = await post({ kind: 'photo', photo_path: photo })
		assert.equal(res.status, 400, photo)
		assert.equal(res.body.error.issues[0].path, 'photo_path')
	}
	assert.equal(created().length, 0)
})

test('not held today: a late joiner, the lobby, a member who left: not_held, nothing stored', async () => {
	for (const membership of [
		{ pact: pactRow(), me: memberRow({ joinedDay: at('2026-10-01') }) },
		{ pact: pactRow({ startDay: at('2026-10-05'), endDay: at('2026-10-25') }), me: memberRow() },
		{ pact: pactRow(), me: memberRow({ leftDay: at('2026-09-30') }) }
	]) {
		fakeStore(pactStore, 'membership', () => membership)
		const res = await post({ kind: 'saver' })
		assert.equal(res.status, 409)
		assert.equal(res.body.error.code, 'not_held')
	}
	assert.equal(created().length, 0)
})

test('not a member: 404', async () => {
	fakeStore(pactStore, 'membership', () => null)
	assert.equal((await post({ kind: 'saver' })).status, 404)
})

test('twice in a day, a second saver, an id that is not ours: 409s the app can tell apart', async () => {
	for (const [outcome, code] of [
		['already_checked_in', 'already_checked_in'],
		['saver_used', 'saver_used'],
		['conflict', 'conflict']
	]) {
		fakeStore(pactStore, 'createCheckIn', () => ({ outcome }))
		const res = await post({ kind: 'saver' })
		assert.equal(res.status, 409, outcome)
		assert.equal(res.body.error.code, code)
	}
	assert.equal(events().length, 0)
})

test('a retry by id: 200 with the same check-in, no second event', async () => {
	fakeStore(pactStore, 'createCheckIn', () => ({
		outcome: 'existing',
		checkIn: checkInRow({ verdict: 'pass' })
	}))
	const res = await post({ id: CHECK_IN_ID, kind: 'photo', photo_path: PHOTO })
	assert.equal(res.status, 200)
	assert.equal(res.body.check_in.verdict, 'pass')
	assert.equal(events().length, 0)
	assert.equal(tasks.length, 0, 'already judged: not judged again')
})

test('activation: not in a pact of one, and only once per person', async () => {
	fakeStore(pactStore, 'activeMemberCount', () => 1)
	await post({ kind: 'saver' })
	assert.deepEqual(
		events().map((e) => e.name),
		['check_in_created']
	)

	reset()
	fakeStore(analyticsStore, 'hasDuplicate', () => true)
	fakeStore(analyticsStore, 'insertEvent', () => undefined)
	await post({ kind: 'saver' })
	assert.ok(!events().some((e) => e.name === 'user_activated'))
	assert.ok(!fake.fetchCalls.some((call) => call.url.host === 'platform.test'))
})

test('upload: a signed URL under proofs/, refused when checked in already or not held', async () => {
	const url = `${path}/upload`
	const body = { content_type: 'image/jpeg', size_bytes: 200_000 }
	const ok = await send(upload.POST, url, { method: 'POST', body, params: { id: PACT_ID } })
	assert.equal(ok.status, 201)
	assert.ok(createUploadResponse.safeParse(ok.body).success)
	assert.match(ok.body.upload.path, new RegExp(`^${USER}/proofs/[0-9a-f-]{36}\\.jpg$`))

	fakeStore(pactStore, 'checkInOn', () => checkInRow())
	const twice = await send(upload.POST, url, { method: 'POST', body, params: { id: PACT_ID } })
	assert.equal(twice.body.error.code, 'already_checked_in')

	fakeStore(pactStore, 'membership', () => ({
		pact: pactRow(),
		me: memberRow({ joinedDay: at('2026-10-01') })
	}))
	const late = await send(upload.POST, url, { method: 'POST', body, params: { id: PACT_ID } })
	assert.equal(late.body.error.code, 'not_held')

	const signs = fake.fetchCalls.filter((c) => c.url.pathname.includes('/object/upload/sign/'))
	assert.equal(signs.length, 1, 'nothing signed for a refused upload')
})

test('poll: a member reads the check-in; anyone else gets the same 404 as a missing one', async () => {
	fakeStore(pactStore, 'checkIn', (id: string, userId: string) =>
		userId === USER ? checkInRow({ id, verdict: 'suspicious', aiReason: 'No fingers.' }) : null
	)
	const res = await send(getOne.GET, `/api/app/v1/check-ins/${CHECK_IN_ID}`, {
		params: { id: CHECK_IN_ID }
	})
	assert.equal(res.status, 200)
	assert.ok(checkInResponse.safeParse(res.body).success)
	assert.equal(res.body.check_in.ai_reason, 'No fingers.')

	fakeStore(pactStore, 'checkIn', () => null)
	const missing = await send(getOne.GET, `/api/app/v1/check-ins/${CHECK_IN_ID}`, {
		params: { id: CHECK_IN_ID }
	})
	assert.equal(missing.status, 404)
})
