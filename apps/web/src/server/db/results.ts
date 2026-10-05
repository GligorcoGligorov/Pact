import type { CheckInKind, PrismaClient } from '@prisma/client'
import { Prisma, db } from './client'
import { MEMBER_FIELDS, PACT_FIELDS, toMember, type MemberRecord, type PactRecord } from './pacts'

// The end of a pact: what its results are computed from, and the closer's bookkeeping (R24,
// R26). Results are computed on read (src/lib/pacts/results.ts); the closer only writes
// `closed_through`, the inbox, and the photo cleanup.

/** A check-in as results read it: who, which day, what kind, and when it was made. */
export type TimedMark = { userId: string; day: Date; kind: CheckInKind; createdAt: Date }

export type PactForResults = {
	pact: PactRecord & { closedThrough: Date | null }
	members: MemberRecord[]
	marks: TimedMark[]
}

export type InboxLine = { userId: string; title: string; body: string | null; pactId: string }

const WITH_MARKS = {
	...PACT_FIELDS,
	closedThrough: true,
	members: {
		orderBy: [{ createdAt: 'asc' }, { userId: 'asc' }],
		select: {
			...MEMBER_FIELDS,
			checkIns: { select: { userId: true, day: true, kind: true, createdAt: true } }
		}
	}
} as const satisfies Prisma.PactSelect

function flatten(row: Prisma.PactGetPayload<{ select: typeof WITH_MARKS }>): PactForResults {
	const { members: rows, ...pact } = row
	const members: MemberRecord[] = []
	const marks: TimedMark[] = []
	for (const { checkIns, ...member } of rows) {
		members.push(toMember(member))
		marks.push(...checkIns)
	}
	return { pact, members, marks }
}

export function createResultStore(client: PrismaClient) {
	return {
		/** A pact, every member and every check-in, when the caller is or was a member. */
		async forMember(pactId: string, userId: string): Promise<PactForResults | null> {
			const row = await client.pact.findFirst({
				where: { id: pactId, members: { some: { userId } } },
				select: WITH_MARKS
			})
			return row ? flatten(row) : null
		},

		/**
		 * The public results page and its card: the same rows, for anyone with the pact's id. The
		 * caller shows only a finished pact, and never a photo, a verdict or a note.
		 */
		async forPublic(pactId: string): Promise<PactForResults | null> {
			const row = await client.pact.findUnique({ where: { id: pactId }, select: WITH_MARKS })
			return row ? flatten(row) : null
		},

		/**
		 * Pacts that may have a day to close: not cancelled, started before `startedBefore`, and
		 * not yet closed through their end day. Each pact's own clock decides what is due.
		 */
		async dueForClosing(startedBefore: Date): Promise<PactForResults[]> {
			const rows = await client.pact.findMany({
				where: {
					cancelledAt: null,
					startDay: { lt: startedBefore },
					OR: [{ closedThrough: null }, { closedThrough: { lt: client.pact.fields.endDay } }]
				},
				select: WITH_MARKS
			})
			return rows.map(flatten)
		},

		/**
		 * Moves `closed_through` from `from` to `to` and writes the inbox lines, in one
		 * transaction, only if nobody moved it first. False when another run already did: its
		 * messages were written once, by that run.
		 */
		async advance(
			pactId: string,
			from: Date | null,
			to: Date,
			lines: InboxLine[]
		): Promise<boolean> {
			return client.$transaction(async (tx) => {
				const { count } = await tx.pact.updateMany({
					where: { id: pactId, closedThrough: from },
					data: { closedThrough: to }
				})
				if (count === 0) return false
				if (lines.length > 0) {
					await tx.notification.createMany({
						data: lines.map((line) => ({ ...line, category: 'team' as const }))
					})
				}
				return true
			})
		},

		/** Proof photos still stored for pacts that ended before `endedBefore`, a batch at a time. */
		async expiredPhotos(endedBefore: Date, limit: number) {
			const rows = await client.checkIn.findMany({
				where: { photoPath: { not: null }, member: { pact: { endDay: { lt: endedBefore } } } },
				select: { id: true, photoPath: true },
				take: limit
			})
			return rows.map((row) => ({ id: row.id, photoPath: row.photoPath! }))
		},

		/** After their files are gone: the paths are cleared and the time recorded. */
		async markPhotosDeleted(ids: string[], at: Date): Promise<void> {
			if (ids.length === 0) return
			await client.checkIn.updateMany({
				where: { id: { in: ids } },
				data: { photoPath: null, photoDeletedAt: at }
			})
		}
	}
}

export type ResultStore = ReturnType<typeof createResultStore>

export const resultStore = createResultStore(db)
