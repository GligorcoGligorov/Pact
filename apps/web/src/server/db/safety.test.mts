import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { after, before, describe, test } from 'node:test'
import { PrismaClient } from '@prisma/client'

// The safety store (./safety) against a real database: reports and blocks only inside shared
// pacts, a block works both ways, leaving never deletes history, an owner's pact passes to the
// earliest member left, the last one out ends it, and only the owner removes.
//
// Run by `npm run test:db` against TEST_DATABASE_URL (see ./app-data.test.mts); skipped
// without it.
const url = process.env.TEST_DATABASE_URL

const day = (value: string) => new Date(`${value}T00:00:00Z`)

describe(
	'the safety store, on a real database',
	{ skip: url ? false : 'TEST_DATABASE_URL is not set' },
	() => {
		const base = new PrismaClient({ datasourceUrl: url })
		const people = Array.from({ length: 4 }, () => randomUUID())
		const [ana, ben, cleo, stranger] = people
		const pacts: string[] = []
		let safety: import('./safety').SafetyStore
		let store: import('./pacts').PactStore

		const crew = async () => {
			const made = await store.create(ana, {
				name: 'Crew',
				habit: 'Run',
				cadence: 'daily',
				timezone: 'Europe/Skopje',
				startDay: day('2026-09-28'),
				endDay: day('2026-10-18'),
				stake: null
			})
			assert.ok(made.outcome === 'created')
			pacts.push(made.pact.id)
			await store.join(made.pact.id, ben, day('2026-09-28'))
			await store.join(made.pact.id, cleo, day('2026-09-28'))
			return made.pact.id
		}

		before(async () => {
			safety = (await import('./safety')).createSafetyStore(base)
			store = (await import('./pacts')).createPactStore(base)
			await Promise.all(
				people.map(
					(id) =>
						base.$executeRaw`insert into auth.users (id, email) values (${id}::uuid, ${`${id}@example.test`})`
				)
			)
		})

		after(async () => {
			await base.pact.deleteMany({ where: { id: { in: pacts } } })
			await base.$executeRaw`delete from auth.users where id = any(${people}::uuid[])`
			await base.$disconnect()
		})

		test('report: once per person, only inside a pact you are in', async () => {
			const pactId = await crew()
			const { id } = await base.checkIn.create({
				data: { pactId, userId: ana, day: day('2026-09-29'), kind: 'photo' },
				select: { id: true }
			})
			assert.deepEqual(await safety.report(ben, id, 'fake', null), { pactId })
			assert.deepEqual(
				await safety.report(ben, id, 'other', 'again'),
				{ pactId },
				'a repeat is fine'
			)
			assert.equal(await base.checkInReport.count({ where: { checkInId: id } }), 1)
			assert.deepEqual([...(await safety.reportedBy(ben, [id]))], [id])
			assert.equal(await safety.report(stranger, id, 'fake', null), null)
		})

		test('block: only someone you share a pact with, and it works both ways', async () => {
			await crew()
			assert.equal(await safety.block(ben, stranger), false, 'no shared pact')
			assert.equal(await safety.block(ben, ben), false)
			assert.equal(await safety.block(ben, cleo), true)
			assert.equal(await safety.block(ben, cleo), true, 'twice is once')
			assert.deepEqual([...(await safety.blockedEitherWay(ben))], [cleo])
			assert.deepEqual([...(await safety.blockedEitherWay(cleo))], [ben])
			await safety.unblock(ben, cleo)
			assert.equal((await safety.blockedEitherWay(cleo)).size, 0)
		})

		test('leave and remove: history kept, the owner hands over, the last one ends it', async () => {
			const pactId = await crew()
			assert.equal(await safety.remove(pactId, ben, cleo, day('2026-10-01')), 'not_owner')
			assert.equal(await safety.remove(pactId, ana, cleo, day('2026-10-01')), 'removed')
			assert.equal(await safety.remove(pactId, ana, cleo, day('2026-10-01')), 'not_member')

			assert.equal(await safety.leave(pactId, ana, day('2026-10-02')), 'left')
			const rows = await base.pactMember.findMany({
				where: { pactId },
				select: { userId: true, role: true, leftDay: true }
			})
			const by = new Map(rows.map((r) => [r.userId, r]))
			assert.equal(by.get(ben)?.role, 'owner', 'the earliest member left takes over')
			assert.equal(by.get(ana)?.role, 'member')
			assert.deepEqual(by.get(ana)?.leftDay, day('2026-10-02'))
			assert.equal((await base.pact.findUnique({ where: { id: pactId } }))?.ownerId, ben)

			assert.equal(await safety.leave(pactId, ben, day('2026-10-03')), 'left')
			assert.ok(
				(await base.pact.findUnique({ where: { id: pactId } }))?.cancelledAt,
				'the last one out ends it'
			)
			assert.equal(await safety.leave(pactId, ben, day('2026-10-03')), 'not_member')
		})
	}
)
