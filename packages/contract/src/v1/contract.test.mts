// The v1 contract's promises, as tests: what each schema accepts, what it
// refuses, and the evolution rules (docs/rules/mobile-data.md): a response may
// gain a field, never an enum value; a request body names only what it allows.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
	appConfigSchema,
	createItemBody,
	createTaskBody,
	createCheckInBody,
	createCheckInUploadBody,
	createPactBody,
	createUploadBody,
	endpoints,
	ERROR_CODES,
	inviteCodeSchema,
	pactDetailResponse,
	errorBodySchema,
	itemSchema,
	listItemsResponse,
	MAX_AVATAR_BYTES,
	pageQuery,
	profileResponse,
	updateProfileBody
} from '../../index'

const ID = '0b6a7c1e-4f3d-4c2a-9e8b-1d2c3b4a5f60'
const USER = '00000000-0000-4000-8000-000000000001'
const NOW = '2026-09-24T09:14:11.831Z'

const item = {
	id: ID,
	name: 'Launch',
	owner: 'Sam',
	status: 'active',
	completion: 40,
	health: 90,
	active_users: 3,
	summary: null,
	created_at: NOW,
	updated_at: NOW
}

test('config: the shape every installed build reads, byte for byte', () => {
	const body = {
		min_supported_version: { ios: '1.3.0', android: '1.3' },
		store_url: {
			ios: 'https://apps.apple.com/app/id1234567890',
			android: 'https://play.google.com/store/apps/details?id=com.example.app'
		}
	}
	assert.deepEqual(appConfigSchema.parse(body), body)
	const none = {
		min_supported_version: { ios: null, android: null },
		store_url: { ios: null, android: null }
	}
	assert.deepEqual(appConfigSchema.parse(none), none)
})

test('config: refuses what the app would refuse', () => {
	const base = {
		min_supported_version: { ios: null, android: null },
		store_url: { ios: null, android: null }
	}
	for (const [name, body] of [
		[
			'a minimum with no store URL',
			{ ...base, min_supported_version: { ios: '2', android: null } }
		],
		['four version parts', { ...base, min_supported_version: { ios: '1.2.3.4', android: null } }],
		[
			'an http store URL',
			{ ...base, store_url: { ios: 'http://apps.apple.com/x', android: null } }
		],
		['a missing key', { min_supported_version: base.min_supported_version }]
	] as const) {
		assert.equal(appConfigSchema.safeParse(body).success, false, name)
	}
})

test('a response may gain a field: unknown keys are dropped, not refused', () => {
	const parsed = listItemsResponse.parse({
		items: [{ ...item, color: 'blue' }],
		next_cursor: null,
		total: 1
	})
	assert.deepEqual(parsed, { items: [item], next_cursor: null })
})

test('a response never gains an enum value: an unknown one fails the parse', () => {
	assert.equal(itemSchema.safeParse({ ...item, status: 'blocked' }).success, false)
})

test('profile: plan is read-only, and nothing server-controlled can be sent', () => {
	for (const field of ['plan', 'plan_type', 'premium_status', 'is_admin', 'region', 'id']) {
		const result = updateProfileBody.safeParse({ display_name: 'Sam', [field]: 'premium' })
		assert.equal(result.success, false, field)
	}
})

test('profile: an update names at least one field, trimmed and bounded', () => {
	assert.equal(updateProfileBody.safeParse({}).success, false)
	assert.deepEqual(updateProfileBody.parse({ display_name: '  Sam  ' }), { display_name: 'Sam' })
	assert.equal(updateProfileBody.safeParse({ display_name: 'x'.repeat(81) }).success, false)
	assert.equal(updateProfileBody.safeParse({ display_name: '   ' }).success, false)
	assert.deepEqual(updateProfileBody.parse({ display_name: null }), { display_name: null })
	assert.equal(updateProfileBody.safeParse({ locale: 'pt-BR' }).success, true)
	assert.equal(updateProfileBody.safeParse({ locale: 'not a locale' }).success, false)
})

test('profile: avatar_path only in the shape uploads hands out', () => {
	const ok = `${USER}/avatar/${ID}.jpg`
	assert.equal(updateProfileBody.safeParse({ avatar_path: ok }).success, true)
	for (const bad of [
		`../${USER}/avatar/${ID}.jpg`,
		`${USER}/avatar/${ID}.exe`,
		`${USER}/other/${ID}.jpg`,
		`https://example.com/${ID}.jpg`
	]) {
		assert.equal(updateProfileBody.safeParse({ avatar_path: bad }).success, false, bad)
	}
})

test('profile response parses a complete profile', () => {
	const profile = {
		id: USER,
		email: 'sam@example.com',
		display_name: null,
		avatar_url: null,
		plan: 'free',
		locale: null,
		marketing_consent: false,
		created_at: NOW
	}
	assert.deepEqual(profileResponse.parse({ profile }), { profile })
})

test('create bodies: strict, trimmed, a device id optional', () => {
	assert.deepEqual(createItemBody.parse({ name: ' Launch ' }), { name: 'Launch' })
	assert.equal(createItemBody.safeParse({ name: 'x', user_id: USER }).success, false)
	assert.equal(createItemBody.safeParse({ id: 'not-a-uuid', name: 'x' }).success, false)
	assert.equal(
		createTaskBody.safeParse({ item_id: ID, title: 'Ship', due_date: '2026-10-01' }).success,
		true
	)
	assert.equal(
		createTaskBody.safeParse({ item_id: ID, title: 'Ship', due_date: '01/10/2026' }).success,
		false
	)
})

test('uploads: avatars only, by content type and size', () => {
	const ok = { purpose: 'avatar', content_type: 'image/png', size_bytes: 1024 }
	assert.equal(createUploadBody.safeParse(ok).success, true)
	assert.equal(createUploadBody.safeParse({ ...ok, content_type: 'image/gif' }).success, false)
	assert.equal(
		createUploadBody.safeParse({ ...ok, size_bytes: MAX_AVATAR_BYTES + 1 }).success,
		false
	)
	assert.equal(createUploadBody.safeParse({ ...ok, purpose: 'video' }).success, false)
})

test('pages: limit from the query string, bounded', () => {
	assert.deepEqual(pageQuery.parse({ limit: '20', cursor: 'abc' }), { limit: 20, cursor: 'abc' })
	assert.deepEqual(pageQuery.parse({ unrelated: 'x' }), {})
	for (const limit of ['0', '101', '1.5', 'many']) {
		assert.equal(pageQuery.safeParse({ limit }).success, false, limit)
	}
})

test('an error body parses a code the app does not know yet', () => {
	const body = { error: { code: 'rate_limited', message: 'Slow down.' } }
	assert.deepEqual(errorBodySchema.parse(body), body)
})

test('every endpoint: under /api/app/v1, one per method and path, a body only on writes', () => {
	const seen = new Set<string>()
	for (const [name, endpoint] of Object.entries(endpoints)) {
		// Lowercase segments, kebab-case where a name has two words (`check-ins`).
		assert.match(endpoint.path, /^\/api\/app\/v1\/[a-z/:-]+$/, name)
		const key = `${endpoint.method} ${endpoint.path}`
		assert.equal(seen.has(key), false, key)
		seen.add(key)
		const hasBody = 'body' in endpoint
		assert.equal(hasBody, endpoint.method === 'POST' || endpoint.method === 'PATCH', name)
		if (endpoint.status === 201) assert.equal(endpoint.method, 'POST', name)
	}
	assert.equal(endpoints.getConfig.auth, 'public')
	for (const [name, endpoint] of Object.entries(endpoints)) {
		if (name !== 'getConfig') assert.equal(endpoint.auth, 'user', name)
	}
})

// ── Pacts ─────────────────────────────────────────────────────────────────────

const pactBody = {
	name: 'Morning run crew',
	habit: 'Run 3 km before 9',
	cadence: 'daily',
	days: 21,
	start_day: '2026-10-01',
	timezone: 'Europe/Skopje'
}

test('create pact: 7 to 90 days, a bounded habit and stake, nothing else', () => {
	assert.ok(createPactBody.safeParse(pactBody).success)
	assert.ok(createPactBody.safeParse({ ...pactBody, stake: 'Loser buys coffee', id: ID }).success)
	for (const bad of [
		{ ...pactBody, days: 6 },
		{ ...pactBody, days: 91 },
		{ ...pactBody, habit: 'x'.repeat(81) },
		{ ...pactBody, stake: 'x'.repeat(81) },
		{ ...pactBody, habit: '   ' },
		{ ...pactBody, cadence: 'weekly' },
		{ ...pactBody, start_day: '2026-10-01T00:00:00Z' },
		{ ...pactBody, owner_id: USER },
		{ ...pactBody, invite_code: 'STREAK' }
	]) {
		assert.equal(createPactBody.safeParse(bad).success, false, JSON.stringify(bad))
	}
})

test('invite codes: six unambiguous characters, typed in any case', () => {
	assert.equal(inviteCodeSchema.parse('streak'), 'STREAK')
	assert.equal(inviteCodeSchema.parse(' Streak '), 'STREAK')
	for (const bad of ['STREA', 'STREAKS', 'STRE0K', 'STREOK', 'STRE1K', 'STREIK', 'STRELK']) {
		assert.equal(inviteCodeSchema.safeParse(bad).success, false, bad)
	}
})

test('check-ins: a photo names its own proof path, a saver names none', () => {
	const photoPath = `${USER}/proofs/${ID}.jpg`
	assert.ok(createCheckInBody.safeParse({ kind: 'photo', photo_path: photoPath }).success)
	assert.ok(createCheckInBody.safeParse({ kind: 'saver', note: 'sick day' }).success)
	for (const bad of [
		{ kind: 'photo' },
		{ kind: 'photo', photo_path: `${USER}/avatar/${ID}.jpg` },
		{ kind: 'photo', photo_path: `${USER}/proofs/../avatar/${ID}.jpg` },
		{ kind: 'saver', photo_path: photoPath },
		{ kind: 'photo', photo_path: photoPath, day: '2026-10-01' },
		{ kind: 'photo', photo_path: photoPath, verdict: 'pass' }
	]) {
		assert.equal(createCheckInBody.safeParse(bad).success, false, JSON.stringify(bad))
	}
	assert.ok(
		createCheckInUploadBody.safeParse({ content_type: 'image/jpeg', size_bytes: 1 }).success
	)
	assert.equal(
		createCheckInUploadBody.safeParse({ content_type: 'image/gif', size_bytes: 1 }).success,
		false
	)
})

test("pact detail parses a pact with today's board, and one with none", () => {
	const pact = {
		id: ID,
		name: 'Morning run crew',
		habit: 'Run 3 km before 9',
		cadence: 'daily',
		timezone: 'Europe/Skopje',
		start_day: '2026-09-23',
		end_day: '2026-10-13',
		stake: null,
		invite_code: 'STREAK',
		max_members: 8,
		status: 'active',
		role: 'owner',
		created_at: NOW
	}
	const today = {
		day: '2026-09-30',
		challenge: 'Hold up three fingers',
		closes_at: '2026-09-30T22:00:00.000Z',
		in_count: 1,
		held_count: 2,
		members: [
			{
				user_id: USER,
				display_name: 'Ana',
				state: 'in',
				check_in: { id: ID, kind: 'photo', verdict: 'pass', ai_reason: null, ai_caption: 'Fine.' }
			}
		],
		me: { held: true, state: 'in', saver_available: true }
	}
	assert.ok(pactDetailResponse.safeParse({ pact, members: [], today }).success)
	assert.ok(pactDetailResponse.safeParse({ pact, members: [], today: null }).success)
	assert.equal(
		pactDetailResponse.safeParse({ pact: { ...pact, status: 'paused' }, members: [], today: null })
			.success,
		false
	)
})

test('the pact error codes are 409s the app can tell apart', () => {
	for (const code of ['pact_full', 'pact_closed', 'not_held', 'already_checked_in', 'saver_used']) {
		assert.equal(ERROR_CODES[code as keyof typeof ERROR_CODES], 409, code)
	}
})
