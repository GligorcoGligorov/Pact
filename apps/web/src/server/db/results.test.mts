import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { after, before, describe, test } from 'node:test'
import { PrismaClient } from '@prisma/client'

// The end-of-pact store (./results) against a real database, raced the way two runs or two
// phones would: the closer's `closed_through` moves once and its inbox lines are written once;
// round 2 is one pact per finished pact, with the whole crew in it, however many tap at once.
//
// Run by `npm run test:db` against TEST_DATABASE_URL (see ./app-data.test.mts); skipped
// without it.
const url = process.env.TEST_DATABASE_URL

const day = (value: string) => new Date(`${value}T00:00:00Z`)

describe(
	'the results store, on a real database',
	{ skip: url ? false : 'TEST_DATABASE_URL is not set' },
	() => {
		const base = new PrismaClient({ datasourceUrl: url })
		const people = Array.from({ length: 3 }, () => randomUUID())
		const [ana, ben, cleo] = people
		let results: import('./results').ResultStore
		let finishedId: string

		before(async () => {
			const { createResultStore } = await import('./results')
			results = createResultStore(base)
			await Promise.all(
				people.map(
					(id) =>
						base.$executeRaw`insert into auth.users (id, email) values (${id}::uuid, ${`${id}@example.test`})`
				)
			)
			const pact = await base.pact.create({
				data: {
					ownerId: ana,
					name: 'Sunrise Yoga',
					habit: 'Ten minutes of yoga',
					color: 'violet',
					emoji: '🧘',
					timezone: 'Europe/Skopje',
					startDay: day('2026-09-01'),
					endDay: day('2026-09-07'),
					stake: 'Loser buys the coffees',
					inviteCode: `T${randomUUID().slice(0, 5).toUpperCase()}`,
					members: {
						create: people.map((userId, i) => ({
							userId,
							role: i === 0 ? ('owner' as const) : ('member' as const),
							joinedDay: day('2026-09-01')
						}))
					}
				}
			})
			finishedId = pact.id
			await base.checkIn.create({
				data: { pactId: pact.id, userId: ben, day: day('2026-09-02'), kind: 'photo' }
			})
		})

		after(async () => {
			await base.pact.deleteMany({ where: { rematchOf: finishedId } })
			await base.pact.deleteMany({ where: { id: finishedId } })
			await base.$executeRaw`delete from auth.users where id = any(${people}::uuid[])`
			await base.$disconnect()
		})

		test('forMember: the pact, every member and every timed check-in; never for a stranger', async () => {
			const row = await results.forMember(finishedId, ben)
			assert.equal(row?.members.length, 3)
			assert.equal(row?.marks.length, 1)
			assert.ok(row?.marks[0].createdAt instanceof Date)
			assert.equal(row?.rematchId, null)
			assert.equal(await results.forMember(finishedId, randomUUID()), null)
		})

		test('advance: two closers racing from the same point write the lines once', async () => {
			const line = (userId: string) => ({
				userId,
				title: `🏁 test ${finishedId}`,
				body: null,
				pactId: finishedId
			})
			const outcomes = await Promise.all([
				results.advance(finishedId, null, day('2026-09-07'), [line(ana), line(ben)]),
				results.advance(finishedId, null, day('2026-09-07'), [line(ana), line(ben)])
			])
			assert.deepEqual(outcomes.sort(), [false, true])
			const written = await base.notification.count({ where: { title: `🏁 test ${finishedId}` } })
			assert.equal(written, 2)
			assert.equal(await results.advance(finishedId, null, day('2026-09-07'), [line(cleo)]), false)
		})

		test('round 2: one pact, the whole crew held from day one, even when three tap at once', async () => {
			const input = (ownerId: string) => ({
				fromPactId: finishedId,
				ownerId,
				pact: {
					name: 'Sunrise Yoga · Round 2',
					habit: 'Ten minutes of yoga',
					color: 'violet' as const,
					emoji: '🧘',
					cadence: 'daily' as const,
					timezone: 'Europe/Skopje',
					stake: 'Loser buys the coffees',
					startDay: day('2026-10-07'),
					endDay: day('2026-10-13')
				},
				memberIds: people.filter((id) => id !== ownerId)
			})
			const raced = await Promise.all([
				results.createRematch(input(ana)),
				results.createRematch(input(ben)),
				results.createRematch(input(cleo))
			])
			assert.equal(raced.filter((r) => r.outcome === 'created').length, 1)
			assert.equal(new Set(raced.map((r) => r.pact.id)).size, 1)
			const members = await base.pactMember.findMany({ where: { pactId: raced[0].pact.id } })
			assert.equal(members.length, 3)
			assert.ok(members.every((m) => m.joinedDay.getTime() === day('2026-10-07').getTime()))
			assert.equal(members.filter((m) => m.role === 'owner').length, 1)
			assert.equal((await results.forMember(finishedId, ana))?.rematchId, raced[0].pact.id)
		})
	}
)
