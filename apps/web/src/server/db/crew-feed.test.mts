import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { after, before, describe, test } from 'node:test'
import { PrismaClient } from '@prisma/client'

// The crew feed store (./crew-feed) against a real database: a person sees the check-ins of the
// pacts they're in and nothing else, newest first and paged without gaps; reactions count once
// per person and kind, are taken back cleanly, and are refused outside the person's pacts.
//
// Run by `npm run test:db` against TEST_DATABASE_URL (see ./app-data.test.mts); skipped
// without it.
const url = process.env.TEST_DATABASE_URL

const day = (value: string) => new Date(`${value}T00:00:00Z`)

describe(
	'the crew feed store, on a real database',
	{ skip: url ? false : 'TEST_DATABASE_URL is not set' },
	() => {
		const base = new PrismaClient({ datasourceUrl: url })
		const people = Array.from({ length: 3 }, () => randomUUID())
		const [ana, ben, cleo] = people
		const pacts: string[] = []
		let feed: import('./crew-feed').CrewFeedStore
		let shared: string
		let anaCheckIn: string

		before(async () => {
			feed = (await import('./crew-feed')).createCrewFeedStore(base)
			const store = (await import('./pacts')).createPactStore(base)
			await Promise.all(
				people.map(
					(id) =>
						base.$executeRaw`insert into auth.users (id, email) values (${id}::uuid, ${`${id}@example.test`})`
				)
			)
			const input = {
				name: 'Crew',
				habit: 'Run',
				cadence: 'daily' as const,
				timezone: 'Europe/Skopje',
				startDay: day('2026-09-28'),
				endDay: day('2026-10-18'),
				stake: null
			}
			const one = await store.create(ana, input)
			const other = await store.create(cleo, { ...input, name: 'Cleo alone' })
			assert.ok(one.outcome === 'created' && other.outcome === 'created')
			shared = one.pact.id
			pacts.push(one.pact.id, other.pact.id)
			await store.join(shared, ben, day('2026-09-28'))

			const checkIn = (pactId: string, userId: string, d: string) =>
				base.checkIn.create({
					data: { pactId, userId, day: day(d), kind: 'photo', challenge: 'Wave' },
					select: { id: true }
				})
			anaCheckIn = (await checkIn(shared, ana, '2026-09-29')).id
			await checkIn(shared, ben, '2026-09-29')
			await checkIn(shared, ben, '2026-09-30')
			await checkIn(other.pact.id, cleo, '2026-09-29')
		})

		after(async () => {
			await base.pact.deleteMany({ where: { id: { in: pacts } } })
			await base.$executeRaw`delete from auth.users where id = any(${people}::uuid[])`
			await base.$disconnect()
		})

		test('the feed: only my pacts, newest first, paged with no gap or repeat', async () => {
			const first = await feed.page(ben, { limit: 2 })
			assert.equal(first.rows.length, 2)
			assert.ok(first.nextAfter)
			const second = await feed.page(ben, { limit: 2, after: first.nextAfter })
			const all = [...first.rows, ...second.rows]
			assert.equal(all.length, 3, "Cleo's pact isn't Ben's, so her check-in isn't in his feed")
			assert.equal(new Set(all.map((r) => r.id)).size, 3)
			for (let i = 1; i < all.length; i++) assert.ok(all[i - 1].createdAt >= all[i].createdAt)
			assert.equal(all[0].member.pact.name, 'Crew')
			assert.deepEqual((await feed.page(cleo, { limit: 10 })).rows.length, 1)
		})

		test('reactions: once per person and kind, counted, taken back, and only in my pacts', async () => {
			const fire = await feed.react(ben, anaCheckIn, 'fire', true)
			assert.equal(fire?.added, true)
			const again = await feed.react(ben, anaCheckIn, 'fire', true)
			assert.equal(again?.added, false, 'a repeat writes nothing')
			await feed.react(ana, anaCheckIn, 'fire', true)
			const clap = await feed.react(ana, anaCheckIn, 'clap', true)
			assert.deepEqual(clap?.tally, {
				counts: { fire: 2, clap: 1, laugh: 0 },
				mine: ['fire', 'clap']
			})

			const page = await feed.page(ben, { limit: 10 })
			assert.deepEqual(page.tallies.get(anaCheckIn), {
				counts: { fire: 2, clap: 1, laugh: 0 },
				mine: ['fire']
			})

			const back = await feed.react(ben, anaCheckIn, 'fire', false)
			assert.deepEqual(back?.tally, { counts: { fire: 1, clap: 1, laugh: 0 }, mine: [] })
			assert.equal(await feed.react(cleo, anaCheckIn, 'fire', true), null, 'not her pact')
			assert.equal(await feed.react(ben, randomUUID(), 'fire', true), null)
		})
	}
)
