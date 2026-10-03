// The public join page's data (R27): who is in today, the inviter, the countdown and the streak,
// from the store's rows, and nothing a stranger shouldn't see. The clock is fixed at noon in
// Skopje on 2026-09-30.
import { test, beforeEach, mock } from 'node:test'
import assert from 'node:assert/strict'
import { fakeStore, OTHER, reset, USER } from '@/server/api/app-test-kit.mts'
import { at, memberRow, NOW, otherMember, pactRow, TODAY } from '@/server/api/pact-fixtures.mts'

const { getJoinPage } = await import('./join-page')
const { pactStore } = await import('@/server/db/pacts')

const LATE = '33333333-3333-4333-8333-333333333333'
const mark = (userId: string, day: string, kind: 'photo' | 'saver' = 'photo') => ({
	userId,
	day: at(day),
	kind
})

mock.timers.enable({ apis: ['Date'], now: NOW })

beforeEach(() => {
	reset()
	mock.timers.setTime(NOW.getTime())
})

test('an active pact: who is in today, the inviter, the countdown and the streak', async () => {
	fakeStore(pactStore, 'publicPage', () => ({
		pact: pactRow({ stake: 'Loser buys coffee' }),
		members: [
			memberRow({ displayName: 'Ana Petrova' }),
			otherMember(),
			memberRow({ userId: LATE, role: 'member', displayName: 'Cleo', joinedDay: at('2026-10-01') })
		],
		marks: [mark(USER, '2026-09-29'), mark(OTHER, '2026-09-29'), mark(USER, TODAY)]
	}))
	const page = await getJoinPage('STREAK')
	assert.ok(page)
	assert.equal(page.inviter, 'Ana Petrova')
	assert.equal(page.status, 'active')
	assert.equal(page.inCount, 1)
	assert.equal(page.heldCount, 2, 'the late joiner is held from tomorrow')
	assert.deepEqual(
		page.members.map((m) => [m.userId, m.state]),
		[
			[USER, 'in'],
			[OTHER, 'out'],
			[LATE, null]
		]
	)
	assert.equal(page.closesAt, '2026-09-30T22:00:00.000Z', 'midnight in Skopje')
	assert.equal(page.dayNumber, 8)
	assert.equal(page.currentStreak, 1, 'the 29th was kept; today is still open')
	assert.equal(page.stake, 'Loser buys coffee')
})

test('R27: nothing beyond names, dates, the stake and today’s states', async () => {
	fakeStore(pactStore, 'publicPage', () => ({
		pact: pactRow(),
		members: [memberRow()],
		marks: [mark(USER, TODAY)]
	}))
	const page = await getJoinPage('STREAK')
	const keys = JSON.stringify(page)
	for (const secret of ['photo', 'caption', 'verdict', 'reason', 'note', 'timezone', 'ownerId']) {
		assert.ok(!keys.includes(secret), `no ${secret} on the public page`)
	}
	assert.deepEqual(Object.keys(page!.members[0]).sort(), ['isOwner', 'name', 'state', 'userId'])
})

test('a lobby pact: no countdown, no board, every member listed', async () => {
	fakeStore(pactStore, 'publicPage', () => ({
		pact: pactRow({ startDay: at('2026-10-05'), endDay: at('2026-10-25') }),
		members: [memberRow(), otherMember()],
		marks: []
	}))
	const page = await getJoinPage('STREAK')
	assert.equal(page?.status, 'lobby')
	assert.equal(page?.closesAt, null)
	assert.equal(page?.heldCount, 0)
	assert.equal(page?.members.length, 2)
	assert.equal(page?.totalDays, 21)
})

test('an unknown code is null (the page answers 404)', async () => {
	fakeStore(pactStore, 'publicPage', () => null)
	assert.equal(await getJoinPage('ZZZZZZ'), null)
})
