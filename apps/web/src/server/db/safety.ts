import type { PrismaClient, ReportReason } from '@prisma/client'
import { db } from './client'

// The store rules for user content (App Review 1.2, R7, R23): reports, blocks, and leaving or
// removing a member. Everything here acts only inside pacts the caller is in: you can't report
// a check-in, block a person or touch a membership you have no pact with.

/** Whether two people share a pact they're both currently in. */
async function shareAPact(client: PrismaClient, a: string, b: string): Promise<boolean> {
	const shared = await client.pactMember.findFirst({
		where: { userId: b, leftDay: null, pact: { members: { some: { userId: a, leftDay: null } } } },
		select: { pactId: true }
	})
	return shared !== null
}

export function createSafetyStore(client: PrismaClient) {
	return {
		/**
		 * R23: a report on a check-in in one of the reporter's pacts, stored for an admin. Once
		 * per reporter and check-in; a repeat is fine. Null when it isn't theirs to report.
		 */
		async report(
			reporterId: string,
			checkInId: string,
			reason: ReportReason,
			detail: string | null
		): Promise<{ pactId: string } | null> {
			const checkIn = await client.checkIn.findFirst({
				where: {
					id: checkInId,
					member: { pact: { members: { some: { userId: reporterId, leftDay: null } } } }
				},
				select: { pactId: true }
			})
			if (!checkIn) return null
			await client.checkInReport.createMany({
				data: [{ checkInId, reporterId, reason, detail }],
				skipDuplicates: true
			})
			return checkIn
		},

		/** The check-ins, of these, the person has reported. */
		async reportedBy(reporterId: string, checkInIds: string[]): Promise<Set<string>> {
			if (checkInIds.length === 0) return new Set()
			const rows = await client.checkInReport.findMany({
				where: { reporterId, checkInId: { in: checkInIds } },
				select: { checkInId: true }
			})
			return new Set(rows.map((row) => row.checkInId))
		},

		/** Blocks someone the person shares a pact with. False when there's no such person. */
		async block(blockerId: string, blockedId: string): Promise<boolean> {
			if (blockerId === blockedId || !(await shareAPact(client, blockerId, blockedId))) return false
			await client.userBlock.createMany({ data: [{ blockerId, blockedId }], skipDuplicates: true })
			return true
		},

		async unblock(blockerId: string, blockedId: string): Promise<void> {
			await client.userBlock.deleteMany({ where: { blockerId, blockedId } })
		},

		/** Everyone the person blocked, and everyone who blocked them: neither sees the other. */
		async blockedEitherWay(userId: string): Promise<Set<string>> {
			const rows = await client.userBlock.findMany({
				where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
				select: { blockerId: true, blockedId: true }
			})
			return new Set(rows.map((row) => (row.blockerId === userId ? row.blockedId : row.blockerId)))
		},

		/** The people the person has blocked (for the app's Block / Unblock label). */
		async blockedBy(userId: string): Promise<string[]> {
			const rows = await client.userBlock.findMany({
				where: { blockerId: userId },
				select: { blockedId: true }
			})
			return rows.map((row) => row.blockedId)
		},

		/**
		 * R7: the person leaves the pact from `day`, the first day they aren't held, so leaving
		 * never breaks a day and their days before still count. An owner hands the pact to the
		 * earliest member still in it; the last one out ends the pact (cancelled).
		 */
		async leave(pactId: string, userId: string, day: Date): Promise<'left' | 'not_member'> {
			return client.$transaction(async (tx) => {
				const me = await tx.pactMember.findUnique({
					where: { pactId_userId: { pactId, userId } },
					select: { role: true, leftDay: true }
				})
				if (!me || me.leftDay !== null) return 'not_member'
				await tx.pactMember.update({
					where: { pactId_userId: { pactId, userId } },
					data: { leftDay: day, leftAt: new Date(), role: 'member' }
				})
				if (me.role === 'owner') {
					const next = await tx.pactMember.findFirst({
						where: { pactId, leftDay: null },
						orderBy: [{ createdAt: 'asc' }, { userId: 'asc' }],
						select: { userId: true }
					})
					if (next) {
						await tx.pactMember.update({
							where: { pactId_userId: { pactId, userId: next.userId } },
							data: { role: 'owner' }
						})
						await tx.pact.update({ where: { id: pactId }, data: { ownerId: next.userId } })
					} else {
						await tx.pact.update({ where: { id: pactId }, data: { cancelledAt: new Date() } })
					}
				}
				return 'left'
			})
		},

		/** R7: the owner removes a member from `day`, the same way leaving works. */
		async remove(
			pactId: string,
			ownerId: string,
			memberId: string,
			day: Date
		): Promise<'removed' | 'not_owner' | 'not_member'> {
			return client.$transaction(async (tx) => {
				const owner = await tx.pactMember.findUnique({
					where: { pactId_userId: { pactId, userId: ownerId } },
					select: { role: true, leftDay: true }
				})
				if (!owner || owner.leftDay !== null || owner.role !== 'owner') return 'not_owner'
				const member = await tx.pactMember.findUnique({
					where: { pactId_userId: { pactId, userId: memberId } },
					select: { leftDay: true }
				})
				if (!member || member.leftDay !== null || memberId === ownerId) return 'not_member'
				await tx.pactMember.update({
					where: { pactId_userId: { pactId, userId: memberId } },
					data: { leftDay: day, leftAt: new Date() }
				})
				return 'removed'
			})
		}
	}
}

export type SafetyStore = ReturnType<typeof createSafetyStore>

export const safetyStore = createSafetyStore(db)
