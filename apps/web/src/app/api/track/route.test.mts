// The beacon records any registered event a browser posts, except the ones only server code may
// record: this play's activation and completion numbers. These tests drive the real handler with
// Supabase unconfigured, so a name that gets past the guards answers `skipped: not_configured`
// and nothing touches a database.
import { test } from 'node:test'
import assert from 'node:assert/strict'

delete process.env.NEXT_PUBLIC_SUPABASE_URL

const { POST } = await import('./route')
const { NextRequest } = await import('next/server')

const beacon = (name: string) =>
	POST(
		new NextRequest('http://localhost/api/track', {
			method: 'POST',
			body: JSON.stringify({ name, sessionId: 'session-1' })
		})
	)

test('refuses an unregistered event', async () => {
	const res = await beacon('not_an_event')
	assert.equal(res.status, 400)
	assert.deepEqual(await res.json(), { ok: false, error: 'unregistered_event' })
})

test('refuses every server-only event, so the pact metrics cannot be forged', async () => {
	for (const name of ['check_in_created', 'pact_created', 'pact_joined', 'user_activated']) {
		const res = await beacon(name)
		assert.equal(res.status, 400, name)
		assert.deepEqual(await res.json(), { ok: false, error: 'server_only_event' }, name)
	}
})

test('accepts a registered browser event', async () => {
	const res = await beacon('join_open_app_clicked')
	assert.equal(res.status, 200)
	assert.deepEqual(await res.json(), { ok: true, skipped: 'not_configured' })
})
