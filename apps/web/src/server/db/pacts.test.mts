import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { after, before, describe, test } from 'node:test'
import { PrismaClient } from '@prisma/client'

// The pact store (./pacts) against a real database: the rules that only the database can
// enforce, run the way two phones would race them. The owner is held from the start day; a
// create by id is idempotent and never hands over someone else's pact; an invite code that
// collides is retried; the last seat goes to exactly one of two joiners; one check-in per
// member per day and one saver per pact, even concurrently; a refused check-in never spends
// the saver; a check-in is only readable by the pact's members; a verdict is written once.
//
// Run by `npm run test:db` against TEST_DATABASE_URL (see ./app-data.test.mts); skipped
// without it.
const url = process.env.TEST_DATABASE_URL

const day = (value: string) => new Date(`${value}T00:00:00Z`)

describe(
	'the pact store, on a real database',
	{ skip: url ? false : 'TEST_DATABASE_URL is not set' },
	() => {
		const base = new PrismaClient({ datasourceUrl: url })
		const people = Array.from({ length: 3 }, () => randomUUID())
		const [ana, ben, cleo] = people
		let pacts: import('./pacts').PactStore
		let createStore: typeof import('./pacts').createPactStore
		const created: string[] = []

		const pactInput = (overrides: Partial<import('./pacts').NewPact> = {}) => ({
			name: 'Morning run crew',
			habit: 'Run 3 km',
			cadence: 'daily' as const,
			timezone: 'Europe/Skopje',
			startDay: day('2026-09-28'),
			endDay: day('2026-10-18'),
			stake: null,
			...overrides
		})

		const newPact = async (ownerId = ana) => {
			const result = await pacts.create(ownerId, pactInput())
			assert.equal(result.outcome, 'created')
			if (result.outcome !== 'created') throw new Error('unreachable')
			created.push(result.pact.id)
			return result.pact
		}

		before(async () => {
			const pactsModule = await import('./pacts')
			createStore = pactsModule.createPactStore
			pacts = createStore(base)
			await Promise.all(
				people.map(
					(id) =>
						base.$executeRaw`insert into auth.users (id, email) values (${id}::uuid, ${`${id}@example.test`})`
				)
			)
		})

		after(async () => {
			// Pacts first: an owner's pact restricts deleting the owner (R28 hands it on first).
			await base.pact.deleteMany({ where: { id: { in: created } } })
			await base.$executeRaw`delete from auth.users where id = any(${people}::uuid[])`
			await base.$disconnect()
		})

		test('create: the owner is a member, held from the start day; a retry finds the pact', async () => {
			const id = randomUUID()
			const first = await pacts.create(ana, { ...pactInput(), id })
			created.push(id)
			assert.equal(first.outcome, 'created')
			const again = await pacts.create(ana, { ...pactInput({ name: 'Other' }), id })
			assert.equal(again.outcome, 'existing')
			assert.equal(again.outcome === 'existing' && again.pact.name, 'Morning run crew')
			assert.deepEqual(await pacts.create(ben, { ...pactInput(), id }), { outcome: 'conflict' })

			const detail = await pacts.detail(id, ana, day('2026-09-30'))
			assert.equal(detail?.members.length, 1)
			assert.equal(detail?.members[0].role, 'owner')
			assert.deepEqual(detail?.members[0].joinedDay, day('2026-09-28'))
			assert.equal(await pacts.detail(id, ben, day('2026-09-30')), null, 'not a member')
		})

		test('create: an invite code that collides is drawn again', async () => {
			const taken = (await newPact()).inviteCode
			const codes = [taken, taken, 'ZZZZ22']
			const store = createStore(base, () => codes.shift()!)
			const result = await store.create(ana, pactInput())
			assert.equal(result.outcome, 'created')
			if (result.outcome === 'created') {
				created.push(result.pact.id)
				assert.equal(result.pact.inviteCode, 'ZZZZ22')
			}
		})

		test('join: idempotent; the last seat goes to exactly one of two joiners', async () => {
			const pact = await newPact()
			await base.pact.update({ where: { id: pact.id }, data: { maxMembers: 2 } })

			const outcomes = await Promise.all([
				pacts.join(pact.id, ben, day('2026-10-01')),
				pacts.join(pact.id, cleo, day('2026-10-01'))
			])
			assert.deepEqual(outcomes.map((o) => o.outcome).sort(), ['full', 'joined'])

			const winner = outcomes[0].outcome === 'joined' ? ben : cleo
			const again = await pacts.join(pact.id, winner, day('2026-10-02'))
			assert.equal(again.outcome, 'existing')
			assert.deepEqual(
				again.outcome === 'existing' && again.member.joinedDay,
				day('2026-10-01'),
				'a re-join keeps the first joined day'
			)

			const invite = await pacts.byInviteCode(pact.inviteCode, winner)
			assert.equal(invite?.memberCount, 2)
			assert.equal(invite?.isMember, true)
			assert.equal(invite?.members.length, 2)
			assert.ok(invite?.members.some((m) => m.userId === winner))

			const page = await pacts.publicPage(pact.inviteCode)
			assert.equal(page?.members.length, 2)
			assert.deepEqual(page?.marks, [], 'no check-ins yet')
			assert.equal(await pacts.publicPage('ZZZZZZ'), null)
		})

		test('check-ins: one per member per day, even two at once', async () => {
			const pact = await newPact()
			const checkIn = (id?: string) =>
				pacts.createCheckIn({
					id,
					pactId: pact.id,
					userId: ana,
					day: day('2026-09-30'),
					kind: 'photo',
					challenge: 'Hold up three fingers',
					photoPath: `${ana}/proofs/${randomUUID()}.jpg`,
					note: null,
					verdict: 'pending'
				})
			const outcomes = await Promise.all([checkIn(), checkIn()])
			assert.deepEqual(outcomes.map((o) => o.outcome).sort(), ['already_checked_in', 'created'])

			const made = outcomes.find((o) => o.outcome === 'created')
			const id = made?.outcome === 'created' ? made.checkIn.id : ''
			assert.equal((await checkIn(id)).outcome, 'existing', 'a retry by id finds it')
			assert.equal(await pacts.checkIn(id, ben), null, 'not readable by a non-member')
			assert.equal((await pacts.checkIn(id, ana))?.id, id)
		})

		test('the saver: once per pact even concurrently, and never spent by a refused check-in', async () => {
			const pact = await newPact()
			const saver = (on: string) =>
				pacts.createCheckIn({
					pactId: pact.id,
					userId: ana,
					day: day(on),
					kind: 'saver',
					challenge: null,
					photoPath: null,
					note: null,
					verdict: 'skipped'
				})
			// A photo check-in on the 29th first: a saver the same day is refused as a duplicate.
			await pacts.createCheckIn({
				pactId: pact.id,
				userId: ana,
				day: day('2026-09-29'),
				kind: 'photo',
				challenge: 'x',
				photoPath: `${ana}/proofs/${randomUUID()}.jpg`,
				note: null,
				verdict: 'pending'
			})
			assert.equal((await saver('2026-09-29')).outcome, 'already_checked_in')
			const member = await pacts.membership(pact.id, ana)
			assert.equal(member?.me.saverUsedDay, null, 'the refused saver was not spent')

			const outcomes = await Promise.all([saver('2026-09-30'), saver('2026-10-01')])
			assert.deepEqual(outcomes.map((o) => o.outcome).sort(), ['created', 'saver_used'])
			assert.equal((await saver('2026-10-02')).outcome, 'saver_used')
		})

		test('a verdict is written once, only over pending', async () => {
			const pact = await newPact()
			const result = await pacts.createCheckIn({
				pactId: pact.id,
				userId: ana,
				day: day('2026-09-30'),
				kind: 'photo',
				challenge: 'x',
				photoPath: `${ana}/proofs/${randomUUID()}.jpg`,
				note: null,
				verdict: 'pending'
			})
			assert.equal(result.outcome, 'created')
			const id = result.outcome === 'created' ? result.checkIn.id : ''
			const at = new Date()
			assert.equal(
				await pacts.setVerdict(
					id,
					{ verdict: 'pass', aiReason: 'Looks right.', aiCaption: 'Fine.' },
					at
				),
				true
			)
			assert.equal(
				await pacts.setVerdict(id, { verdict: 'error', aiReason: null, aiCaption: null }, at),
				false
			)
			assert.equal((await pacts.checkIn(id, ana))?.verdict, 'pass')
		})
	}
)
