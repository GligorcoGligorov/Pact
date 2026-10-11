// GET /api/app/v1/pacts/:id/wall: the Crew Wall, every pact day so far by every member held,
// newest first, with signed photo URLs. The clock is fixed at noon in Skopje on 2026-09-30;
// the pact runs from 2026-09-23.
import { test, beforeEach, mock } from 'node:test'
import assert from 'node:assert/strict'
import { wallResponse } from '@app/contract'
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
import type { CheckInRecord, MemberRecord } from '@/server/db/pacts'

const route = await import('./route')
const { pactStore } = await import('@/server/db/pacts')
const { crewFeedStore } = await import('@/server/db/crew-feed')
const { safetyStore } = await import('@/server/db/safety')

const LATE = '33333333-3333-4333-8333-333333333333'
const get = () => send(route.GET, `/api/app/v1/pacts/${PACT_ID}/wall`, { params: { id: PACT_ID } })

const mine = (day: string, id: string) =>
	checkInRow({ id, day: at(day), photoPath: `${USER}/proofs/${id}.jpg` })
const bens = (day: string, id: string) =>
	checkInRow({ id, userId: OTHER, day: at(day), photoPath: `${OTHER}/proofs/${id}.jpg` })

function serve(members: MemberRecord[], checkIns: CheckInRecord[]) {
	fakeStore(pactStore, 'wall', () => ({ pact: pactRow(), members, checkIns }))
}

/** Storage signs every path it's asked for. */
function signEverything() {
	fake.storage = (req) => {
		const { paths } = req.body as { paths: string[] }
		return Response.json(
			paths.map((path) => ({ path, signedURL: `/object/sign/x/${path}?token=t`, error: null }))
		)
	}
}

mock.timers.enable({ apis: ['Date'], now: NOW })

beforeEach(() => {
	reset()
	mock.timers.setTime(NOW.getTime())
	fakeStore(safetyStore, 'blockedEitherWay', () => new Set())
	fakeStore(safetyStore, 'reportedBy', () => new Set())
	fakeStore(crewFeedStore, 'tallies', () => new Map())
	signEverything()
})

test('one row per pact day, today first, each cell with its photo; a full row is kept', async () => {
	const ids = ['a1', 'a2', 'b1'].map((s, i) => `${'0'.repeat(8)}-0000-4000-8000-00000000000${i}`)
	serve(
		[memberRow(), otherMember()],
		[mine('2026-09-23', ids[0]!), bens('2026-09-23', ids[2]!), mine(TODAY, ids[1]!)]
	)
	const res = await get()
	assert.equal(res.status, 200)
	assert.ok(wallResponse.safeParse(res.body).success)
	assert.deepEqual(
		res.body.members.map((m: { user_id: string }) => m.user_id),
		[USER, OTHER]
	)
	assert.equal(res.body.days.length, 8, '23 September through today')

	const [today, ...rest] = res.body.days
	const first = rest[rest.length - 1]
	assert.equal(today.day, TODAY)
	assert.equal(today.status, 'open')
	assert.equal(today.kept, false, 'Ben is still out today')
	assert.match(today.cells[0].check_in.photo_url, /token=t/)
	assert.equal(today.cells[1].check_in, null)

	assert.equal(first.day, '2026-09-23')
	assert.equal(first.status, 'kept')
	assert.equal(first.kept, true)
	assert.equal(rest[0].status, 'broken', 'yesterday nobody checked in')
	assert.equal(rest[0].kept, false)
})

test('a late joiner is held only from the day they joined', async () => {
	serve([memberRow(), memberRow({ userId: LATE, role: 'member', joinedDay: at('2026-09-29') })], [])
	const res = await get()
	const held = res.body.days.map((d: { cells: { held: boolean }[] }) => d.cells[1]!.held)
	assert.deepEqual(held, [true, true, false, false, false, false, false, false])
})

test('a photo by someone blocked, or one the caller reported, comes back without its URL', async () => {
	const theirs = '00000000-0000-4000-8000-0000000000b1'
	const reported = '00000000-0000-4000-8000-0000000000a1'
	serve([memberRow(), otherMember()], [bens(TODAY, theirs), mine('2026-09-29', reported)])
	fakeStore(safetyStore, 'blockedEitherWay', () => new Set([OTHER]))
	fakeStore(safetyStore, 'reportedBy', () => new Set([reported]))
	const res = await get()
	const [today, yesterday] = res.body.days
	assert.equal(today.cells[1].check_in.photo_url, null)
	assert.equal(yesterday.cells[0].check_in.photo_url, null)
	assert.equal(yesterday.cells[0].check_in.reported_by_me, true)
})

test('404 for anyone who was never a member', async () => {
	fakeStore(pactStore, 'wall', () => null)
	const res = await get()
	assert.equal(res.status, 404)
})
