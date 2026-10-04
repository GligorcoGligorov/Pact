// The crew-complete moment: when the last member held today checks in, everyone else gets "Day 8
// kept by the whole crew 🔥", once per pact-day, and never for a crew of one. The clock is fixed
// at noon in Skopje on 2026-09-30.
import { test, beforeEach, mock } from 'node:test'
import assert from 'node:assert/strict'
import { fake, fakeStore, OTHER, reset, USER } from '@/server/api/app-test-kit.mts'
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

const { celebrateIfKept, keptTitle } = await import('./crew-complete')
const { pactStore } = await import('@/server/db/pacts')
const { inboxStore } = await import('@/server/db/inbox')
const { analyticsStore } = await import('@/server/db/analytics')
const { profileStore } = await import('@/server/db/profiles')

const both = (day: string) => [
	checkInRow({ day: at(day) }),
	checkInRow({ userId: OTHER, day: at(day) })
]

function serve(
	todays: ReturnType<typeof checkInRow>[],
	members = [memberRow(), otherMember()],
	sent = false
) {
	fakeStore(pactStore, 'detail', () => ({
		pact: pactRow(),
		members,
		checkIns: todays,
		marks: [...both('2026-09-29'), ...todays]
	}))
	fakeStore(inboxStore, 'sentSince', () => sent)
	fakeStore(inboxStore, 'notify', () => undefined)
}

const notified = () =>
	fake.storeCalls.find((c) => c.method === 'notify')?.args[0] as
		{ userId: string; title: string; body: string; pactId: string }[] | undefined

mock.timers.enable({ apis: ['Date'], now: NOW })

beforeEach(() => {
	reset()
	mock.timers.setTime(NOW.getTime())
	fakeStore(profileStore, 'regionOf', () => null)
	fakeStore(analyticsStore, 'hasDuplicate', () => false)
	fakeStore(analyticsStore, 'insertEvent', () => undefined)
})

test('the last check-in keeps the day: everyone else is told, with the day and the streak', async () => {
	serve(both(TODAY))
	assert.equal(await celebrateIfKept(pactRow(), TODAY, USER), true)
	assert.deepEqual(notified(), [
		{
			userId: OTHER,
			title: 'Day 8 kept by the whole crew 🔥',
			body: 'Morning run crew: everyone checked in. 2 days in a row.',
			pactId: PACT_ID
		}
	])
	const event = fake.storeCalls.find((c) => c.method === 'insertEvent')?.args[0] as {
		name: string
		metadata: Record<string, unknown>
	}
	assert.equal(event.name, 'pact_day_kept')
	assert.deepEqual(event.metadata, { pact_id: PACT_ID, day_number: 8, streak: 2 })
})

test('nothing while someone is still out, for a crew of one, or a second time', async () => {
	serve([checkInRow()])
	assert.equal(await celebrateIfKept(pactRow(), TODAY, USER), false)

	serve([checkInRow()], [memberRow()])
	assert.equal(await celebrateIfKept(pactRow(), TODAY, USER), false, 'a crew of one')

	serve(both(TODAY), undefined, true)
	assert.equal(await celebrateIfKept(pactRow(), TODAY, USER), false, 'already celebrated')
	assert.equal(notified(), undefined)
	assert.equal(keptTitle(3), 'Day 3 kept by the whole crew 🔥')
})
