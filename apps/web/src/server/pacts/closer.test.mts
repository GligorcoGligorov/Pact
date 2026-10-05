// The closer (R26) against an in-memory store that behaves like the real one: `advance` is a
// conditional update, so a second run, or a run racing this one, writes nothing twice.
import { test } from 'node:test'
import assert from 'node:assert/strict'

process.env.DATABASE_URL ??= 'postgresql://user:password@db.test:5432/app'

const { closePacts, finishedTitle, brokenTitle } = await import('./closer')
const { parseNowOverride } = await import('./clock')

type Row = Parameters<typeof closePacts>[1] extends infer D
	? D extends { store: { dueForClosing: (d: Date) => Promise<(infer R)[]> } }
		? R
		: never
	: never

const d = (day: string) => new Date(`${day}T00:00:00Z`)
const at = (day: string, hour = 9) => new Date(`${day}T${String(hour).padStart(2, '0')}:00:00Z`)
const DAYS = ['05', '06', '07', '08', '09', '10', '11'].map((n) => `2026-10-${n}`)

function pactRow(overrides: Partial<Row['pact']> = {}): Row {
	const member = (userId: string, joined = DAYS[0]) => ({
		userId,
		role: 'member' as const,
		joinedDay: d(joined),
		leftDay: null,
		saverUsedDay: null,
		createdAt: at(DAYS[0]),
		displayName: userId
	})
	const marks = [
		...DAYS.map((day) => ({
			userId: 'ana',
			day: d(day),
			kind: 'photo' as const,
			createdAt: at(day)
		})),
		// Ben misses day 6.
		...DAYS.filter((day) => day !== DAYS[5]).map((day) => ({
			userId: 'ben',
			day: d(day),
			kind: 'photo' as const,
			createdAt: at(day)
		}))
	]
	return {
		pact: {
			id: 'pact-1',
			ownerId: 'ana',
			name: 'Run Club',
			habit: 'Run',
			color: 'coral',
			emoji: '🏃',
			cadence: 'daily',
			timezone: 'UTC',
			startDay: d(DAYS[0]),
			endDay: d(DAYS[6]),
			stake: 'Loser buys the coffees',
			inviteCode: 'STREAK',
			maxMembers: 8,
			cancelledAt: null,
			createdAt: at(DAYS[0]),
			closedThrough: null,
			...overrides
		},
		members: [member('ana'), member('ben')],
		marks
	}
}

function fakeDeps(rows: Row[], photos: { id: string; photoPath: string }[] = []) {
	const inbox: { userId: string; title: string }[] = []
	const events: { name: string; metadata: unknown }[] = []
	const deleted: string[] = []
	let stored = [...photos]
	const deps = {
		store: {
			async dueForClosing() {
				return rows.map((r) => structuredClone(r))
			},
			async advance(pactId: string, from: Date | null, to: Date, lines: typeof inbox) {
				const row = rows.find((r) => r.pact.id === pactId)!
				if ((row.pact.closedThrough?.getTime() ?? null) !== (from?.getTime() ?? null)) return false
				row.pact.closedThrough = to
				inbox.push(...lines)
				return true
			},
			async expiredPhotos(_before: Date, limit: number) {
				return stored.slice(0, limit)
			},
			async markPhotosDeleted(ids: string[]) {
				stored = stored.filter((p) => !ids.includes(p.id))
			}
		},
		async deletePhotos(paths: string[]) {
			deleted.push(...paths)
		},
		async record(_user: string | null, name: string, opts?: { metadata?: unknown }) {
			events.push({ name, metadata: opts?.metadata })
		}
	}
	return { deps: deps as never, inbox, events, deleted }
}

test('mid-pact: closes through yesterday, announces a broken yesterday, once', async () => {
	const rows = [pactRow()]
	const { deps, inbox } = fakeDeps(rows)
	const first = await closePacts(at(DAYS[6], 12), deps)
	assert.deepEqual([first.pacts, first.daysClosed, first.finished], [1, 6, 0])
	assert.deepEqual(
		inbox.map((m) => [m.userId, m.title]),
		[
			['ana', brokenTitle(6)],
			['ben', brokenTitle(6)]
		]
	)
	const again = await closePacts(at(DAYS[6], 18), deps)
	assert.deepEqual([again.pacts, again.messages], [0, 0])
	assert.equal(inbox.length, 2)
})

test('the end day: one "results are in" per member and pact_completed, then never again', async () => {
	const rows = [pactRow({ closedThrough: d(DAYS[5]) })]
	const { deps, inbox, events } = fakeDeps(rows)
	const s = await closePacts(at('2026-10-12'), deps)
	assert.deepEqual([s.finished, s.messages], [1, 2])
	assert.deepEqual(
		inbox.map((m) => m.title),
		[finishedTitle('Run Club'), finishedTitle('Run Club')]
	)
	assert.deepEqual(events, [
		{
			name: 'pact_completed',
			metadata: { pact_id: 'pact-1', outcome: 'loser', kept_days: 6, total_days: 7 }
		}
	])
	await closePacts(at('2026-10-13'), deps)
	await closePacts(at('2026-11-30'), deps)
	assert.equal(inbox.length, 2)
	assert.equal(events.length, 1)
})

test('two runs racing: only one writes the messages', async () => {
	const rows = [pactRow({ closedThrough: d(DAYS[5]) })]
	const { deps, inbox, events } = fakeDeps(rows)
	await Promise.all([closePacts(at('2026-10-12'), deps), closePacts(at('2026-10-12'), deps)])
	assert.equal(inbox.length, 2)
	assert.equal(events.length, 1)
})

test('expired photos are deleted from storage and cleared, in batches', async () => {
	const photos = Array.from({ length: 450 }, (_, i) => ({
		id: `c${i}`,
		photoPath: `u/proofs/${i}.jpg`
	}))
	const { deps, deleted } = fakeDeps([], photos)
	const s = await closePacts(at('2026-12-01'), deps)
	assert.equal(s.photosDeleted, 450)
	assert.equal(deleted.length, 450)
	assert.equal((await closePacts(at('2026-12-02'), deps)).photosDeleted, 0)
})

test('the time override: a day or an instant, never in production', () => {
	assert.deepEqual(parseNowOverride(null, 'development'), { now: null })
	assert.equal(
		parseNowOverride('2026-10-20', 'development').now?.toISOString(),
		'2026-10-20T12:00:00.000Z'
	)
	assert.ok(parseNowOverride('2026-10-20', 'production').error)
	assert.ok(parseNowOverride('soon', 'development').error)
})
