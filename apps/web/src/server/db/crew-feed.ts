import type { PrismaClient, ReactionKind } from '@prisma/client'
import { db } from './client'
import { pageArgs, toPage, type Page, type PageRequest } from './page'

// The crew feed (R22) and its reactions: the check-ins of every pact a person is in, newest
// first, and the quick 🔥 👏 😂 on each. Only a pact's current members read its check-ins or
// react to them; everyone else gets nothing, the same as a check-in that doesn't exist.

const FEED_ROW = {
	id: true,
	pactId: true,
	userId: true,
	day: true,
	kind: true,
	challenge: true,
	photoPath: true,
	note: true,
	verdict: true,
	aiReason: true,
	aiCaption: true,
	createdAt: true,
	member: {
		select: {
			profile: { select: { displayName: true } },
			pact: { select: { name: true, habit: true } }
		}
	}
} as const

export type ReactionCounts = Record<ReactionKind, number>

export interface ReactionTally {
	counts: ReactionCounts
	mine: ReactionKind[]
}

const NO_REACTIONS: ReactionCounts = { fire: 0, clap: 0, laugh: 0 }

export function createCrewFeedStore(client: PrismaClient) {
	/** The ids of the pacts the person is a current member of. */
	async function myPactIds(userId: string): Promise<string[]> {
		const rows = await client.pactMember.findMany({
			where: { userId, leftDay: null },
			select: { pactId: true }
		})
		return rows.map((row) => row.pactId)
	}

	/** Each check-in's counts and the person's own reactions, for the given check-ins. */
	async function tallies(
		checkInIds: string[],
		userId: string
	): Promise<Map<string, ReactionTally>> {
		const out = new Map<string, ReactionTally>(
			checkInIds.map((id) => [id, { counts: { ...NO_REACTIONS }, mine: [] }])
		)
		if (checkInIds.length === 0) return out
		const [grouped, mine] = await Promise.all([
			client.checkInReaction.groupBy({
				by: ['checkInId', 'reaction'],
				where: { checkInId: { in: checkInIds } },
				_count: { _all: true }
			}),
			client.checkInReaction.findMany({
				where: { checkInId: { in: checkInIds }, userId },
				select: { checkInId: true, reaction: true }
			})
		])
		for (const row of grouped) {
			const tally = out.get(row.checkInId)
			if (tally) tally.counts[row.reaction] = row._count._all
		}
		for (const row of mine) out.get(row.checkInId)?.mine.push(row.reaction)
		return out
	}

	return {
		/**
		 * One page of the person's feed, newest first, with each check-in's reactions. `hidden`
		 * are people never shown (blocked either way).
		 */
		async page(userId: string, request: PageRequest, hidden: ReadonlySet<string> = new Set()) {
			const pactIds = await myPactIds(userId)
			if (pactIds.length === 0) return { rows: [], nextAfter: null, tallies: new Map() }
			const rows = await client.checkIn.findMany({
				where: { pactId: { in: pactIds }, userId: { notIn: [...hidden] } },
				orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
				select: FEED_ROW,
				...pageArgs(request)
			})
			const page: Page<(typeof rows)[number]> = toPage(rows, request)
			return {
				...page,
				tallies: await tallies(
					page.rows.map((row) => row.id),
					userId
				)
			}
		},

		/**
		 * Adds (`on`) or takes back the person's reaction. Null when the check-in doesn't exist
		 * or isn't in one of their pacts. `added` is true only when a new row was written.
		 */
		async react(
			userId: string,
			checkInId: string,
			reaction: ReactionKind,
			on: boolean
		): Promise<{ pactId: string; added: boolean; tally: ReactionTally } | null> {
			const checkIn = await client.checkIn.findFirst({
				where: {
					id: checkInId,
					member: { pact: { members: { some: { userId, leftDay: null } } } }
				},
				select: { pactId: true }
			})
			if (!checkIn) return null
			let added = false
			if (on) {
				const { count } = await client.checkInReaction.createMany({
					data: [{ checkInId, userId, reaction }],
					skipDuplicates: true
				})
				added = count === 1
			} else {
				await client.checkInReaction.deleteMany({ where: { checkInId, userId, reaction } })
			}
			const tally = (await tallies([checkInId], userId)).get(checkInId) ?? {
				counts: { ...NO_REACTIONS },
				mine: []
			}
			return { pactId: checkIn.pactId, added, tally }
		}
	}
}

export type CrewFeedStore = ReturnType<typeof createCrewFeedStore>

export const crewFeedStore = createCrewFeedStore(db)
