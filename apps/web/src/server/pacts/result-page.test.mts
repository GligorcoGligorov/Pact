// The public results (R25): only a finished pact has a page, and it says who owes the stake in
// the same words as the app. The clock is fixed at noon in Skopje on 2026-09-30.
import { test, beforeEach, mock } from 'node:test'
import assert from 'node:assert/strict'
import { fakeStore, OTHER, reset, USER } from '@/server/api/app-test-kit.mts'
import { at, memberRow, NOW, otherMember, PACT_ID, pactRow } from '@/server/api/pact-fixtures.mts'
import type { PactForResults } from '@/server/db/results'

const { getResultPage } = await import('./result-page')
const { resultStore } = await import('@/server/db/results')

const DAYS = ['16', '17', '18'].map((d) => `2026-09-${d}`)

function row(endDay: string, missing: string[] = []): PactForResults {
	const members = [
		memberRow({ joinedDay: at(DAYS[0]) }),
		otherMember({ joinedDay: at(DAYS[0]), displayName: 'Dan' })
	]
	return {
		pact: { ...pactRow({ startDay: at(DAYS[0]), endDay: at(endDay) }), closedThrough: null },
		members,
		marks: members.flatMap((m) =>
			DAYS.filter((d) => !(m.userId === OTHER && missing.includes(d))).map((d) => ({
				userId: m.userId,
				day: at(d),
				kind: 'photo' as const,
				createdAt: new Date(`${d}T10:00:00Z`)
			}))
		),
		rematchId: null
	}
}

mock.timers.enable({ apis: ['Date'], now: NOW })

beforeEach(() => {
	reset()
	mock.timers.setTime(NOW.getTime())
})

test('a finished pact: the stake said about the loser, the chain, best first', async () => {
	fakeStore(resultStore, 'forPublic', () => row(DAYS[2], [DAYS[1]]))
	const page = await getResultPage(PACT_ID)
	assert.equal(page?.headline, 'Dan buys coffee.')
	assert.equal(page?.nobodyPays, false)
	assert.deepEqual(
		page?.chain.map((d) => d.status),
		['kept', 'broken', 'kept']
	)
	assert.deepEqual(
		page?.members.map((m) => [m.userId, m.isLoser]),
		[
			[USER, false],
			[OTHER, true]
		]
	)
})

test('everyone perfect: nobody pays', async () => {
	fakeStore(resultStore, 'forPublic', () => row(DAYS[2]))
	assert.equal((await getResultPage(PACT_ID))?.headline, 'Nobody pays.')
})

test('no page for a running pact, an unknown one, or an id that is not one', async () => {
	fakeStore(resultStore, 'forPublic', () => row('2026-10-13'))
	assert.equal(await getResultPage(PACT_ID), null)
	fakeStore(resultStore, 'forPublic', () => null)
	assert.equal(await getResultPage(PACT_ID), null)
	assert.equal(await getResultPage('not-a-uuid'), null)
})
