import { randomInt, randomUUID } from 'node:crypto'
import type {
	AiVerdict,
	CheckIn,
	CheckInKind,
	Pact,
	PactCadence,
	PactMember,
	PrismaClient
} from '@prisma/client'
import { INVITE_CODE_ALPHABET, INVITE_CODE_LENGTH } from '@app/contract'
import { Prisma, db } from './client'

// Pacts, their members and their check-ins (prisma/schema/pacts.prisma), for /api/app/v1.
//
// The store knows rows, not days: every pact-local day it takes (`day`, `joinedDay`, …) comes
// from src/lib/pacts/day.ts in the route, as a `@db.Date` at UTC midnight. The board, the
// chain and the result are computed from what these queries return (R10).
//
// Scoped by the verified user id: a pact is only reached through the caller's membership, and
// a check-in only through a pact the caller belongs to.

export type PactRecord = Pick<
	Pact,
	| 'id'
	| 'ownerId'
	| 'name'
	| 'habit'
	| 'cadence'
	| 'timezone'
	| 'startDay'
	| 'endDay'
	| 'stake'
	| 'inviteCode'
	| 'maxMembers'
	| 'cancelledAt'
	| 'createdAt'
>

export type MemberRecord = Pick<
	PactMember,
	'userId' | 'role' | 'joinedDay' | 'leftDay' | 'saverUsedDay' | 'createdAt'
> & { displayName: string | null }

export type CheckInRecord = Pick<
	CheckIn,
	| 'id'
	| 'pactId'
	| 'userId'
	| 'day'
	| 'kind'
	| 'challenge'
	| 'photoPath'
	| 'note'
	| 'verdict'
	| 'aiReason'
	| 'aiCaption'
	| 'judgedAt'
	| 'createdAt'
>

export type NewPact = {
	/** Generated on the device, so a retry of the same create finds its pact. */
	id?: string
	name: string
	habit: string
	cadence: PactCadence
	/** Already canonical (canonicalTimeZone). */
	timezone: string
	startDay: Date
	endDay: Date
	stake: string | null
}

export type NewCheckIn = {
	id?: string
	pactId: string
	userId: string
	day: Date
	kind: CheckInKind
	challenge: string | null
	photoPath: string | null
	note: string | null
	verdict: AiVerdict
}

export type Verdict = {
	verdict: Extract<AiVerdict, 'pass' | 'suspicious' | 'error' | 'not_configured' | 'skipped'>
	aiReason: string | null
	aiCaption: string | null
}

const PACT = {
	id: true,
	ownerId: true,
	name: true,
	habit: true,
	cadence: true,
	timezone: true,
	startDay: true,
	endDay: true,
	stake: true,
	inviteCode: true,
	maxMembers: true,
	cancelledAt: true,
	createdAt: true
} as const satisfies Prisma.PactSelect

const MEMBER = {
	userId: true,
	role: true,
	joinedDay: true,
	leftDay: true,
	saverUsedDay: true,
	createdAt: true,
	profile: { select: { displayName: true } }
} as const satisfies Prisma.PactMemberSelect

const CHECK_IN = {
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
	judgedAt: true,
	createdAt: true
} as const satisfies Prisma.CheckInSelect

// A collision in a 31^6 space is rare; a handful of retries makes one practically impossible
// without looping forever on a bug.
const INVITE_CODE_ATTEMPTS = 5

export function newInviteCode(): string {
	let code = ''
	for (let i = 0; i < INVITE_CODE_LENGTH; i++) {
		code += INVITE_CODE_ALPHABET[randomInt(INVITE_CODE_ALPHABET.length)]
	}
	return code
}

function isUniqueViolation(err: unknown, field?: string): boolean {
	if (!(err instanceof Prisma.PrismaClientKnownRequestError) || err.code !== 'P2002') return false
	if (!field) return true
	const target = err.meta?.target
	return Array.isArray(target) ? target.includes(field) : String(target ?? '').includes(field)
}

const toMember = ({
	profile,
	...member
}: Prisma.PactMemberGetPayload<{ select: typeof MEMBER }>): MemberRecord => ({
	...member,
	displayName: profile.displayName
})

export type CreatePactResult =
	{ outcome: 'created' | 'existing'; pact: PactRecord } | { outcome: 'conflict' }

export type JoinResult =
	| { outcome: 'joined' | 'existing'; member: MemberRecord }
	| { outcome: 'full' }
	| { outcome: 'left' }

export type CreateCheckInResult =
	| { outcome: 'created' | 'existing'; checkIn: CheckInRecord }
	| { outcome: 'already_checked_in' }
	| { outcome: 'saver_used' }
	| { outcome: 'conflict' }

export function createPactStore(client: PrismaClient, codes: () => string = newInviteCode) {
	return {
		/**
		 * The pacts the person is a member of and hasn't left, newest first, each with their
		 * membership and their check-ins from `sinceDay` on (enough to know their state today in
		 * any timezone).
		 */
		async listForUser(userId: string, sinceDay: Date) {
			const memberships = await client.pactMember.findMany({
				where: { userId, leftDay: null },
				orderBy: { createdAt: 'desc' },
				select: {
					...MEMBER,
					pact: { select: PACT },
					checkIns: { where: { day: { gte: sinceDay } }, select: CHECK_IN }
				}
			})
			return memberships.map(({ pact, checkIns, ...member }) => ({
				pact,
				me: toMember(member),
				checkIns
			}))
		},

		/**
		 * R1, R2: a pact, with its creator as the owner, held from the start day. Idempotent by
		 * id: a retry finds its pact; an id another person's pact already has is a conflict.
		 */
		async create(userId: string, input: NewPact): Promise<CreatePactResult> {
			const id = input.id ?? randomUUID()
			const existing = await client.pact.findUnique({ where: { id }, select: PACT })
			if (existing) {
				return existing.ownerId === userId
					? { outcome: 'existing', pact: existing }
					: { outcome: 'conflict' }
			}
			for (let attempt = 1; ; attempt++) {
				try {
					const pact = await client.$transaction(async (tx) => {
						const created = await tx.pact.create({
							data: {
								id,
								ownerId: userId,
								name: input.name,
								habit: input.habit,
								cadence: input.cadence,
								timezone: input.timezone,
								startDay: input.startDay,
								endDay: input.endDay,
								stake: input.stake,
								inviteCode: codes()
							},
							select: PACT
						})
						await tx.pactMember.create({
							data: { pactId: id, userId, role: 'owner', joinedDay: input.startDay }
						})
						return created
					})
					return { outcome: 'created', pact }
				} catch (err) {
					if (isUniqueViolation(err, 'invite_code') && attempt < INVITE_CODE_ATTEMPTS) continue
					// Two retries of the same create at once: the other one made it.
					if (isUniqueViolation(err)) {
						const raced = await client.pact.findUnique({ where: { id }, select: PACT })
						if (raced) {
							return raced.ownerId === userId
								? { outcome: 'existing', pact: raced }
								: { outcome: 'conflict' }
						}
					}
					throw err
				}
			}
		},

		/**
		 * The pact, every member (those who left included), and the check-ins on `day`. Null
		 * when the person has never been a member.
		 */
		async detail(pactId: string, userId: string, day: Date) {
			const pact = await client.pact.findFirst({
				where: { id: pactId, members: { some: { userId } } },
				select: {
					...PACT,
					members: { orderBy: [{ createdAt: 'asc' }, { userId: 'asc' }], select: MEMBER }
				}
			})
			if (!pact) return null
			const checkIns = await client.checkIn.findMany({
				where: { pactId, day },
				select: CHECK_IN
			})
			const { members, ...rest } = pact
			return { pact: rest, members: members.map(toMember), checkIns }
		},

		/** What an invite code joins: the pact, its active member count, whether the caller is in. */
		async byInviteCode(code: string, userId: string) {
			const pact = await client.pact.findUnique({ where: { inviteCode: code }, select: PACT })
			if (!pact) return null
			const [memberCount, mine] = await Promise.all([
				client.pactMember.count({ where: { pactId: pact.id, leftDay: null } }),
				client.pactMember.findUnique({
					where: { pactId_userId: { pactId: pact.id, userId } },
					select: { leftDay: true }
				})
			])
			return {
				pact,
				memberCount,
				isMember: !!mine && mine.leftDay === null,
				hasLeft: !!mine?.leftDay
			}
		},

		/**
		 * R4, R5, R6: adds the person, held from `joinedDay`. Idempotent: a member joining again
		 * gets their membership back. The capacity check and the insert run under a lock on the
		 * pact's row, so two people joining the last seat at once can't both get it.
		 */
		async join(pactId: string, userId: string, joinedDay: Date): Promise<JoinResult> {
			return client.$transaction(async (tx) => {
				// Prisma has no SELECT … FOR UPDATE. The lock serializes joins to one pact.
				await tx.$executeRaw`select 1 from public.pacts where id = ${pactId}::uuid for update`
				const existing = await tx.pactMember.findUnique({
					where: { pactId_userId: { pactId, userId } },
					select: MEMBER
				})
				if (existing) {
					return existing.leftDay === null
						? { outcome: 'existing', member: toMember(existing) }
						: { outcome: 'left' }
				}
				const [active, pact] = await Promise.all([
					tx.pactMember.count({ where: { pactId, leftDay: null } }),
					tx.pact.findUniqueOrThrow({ where: { id: pactId }, select: { maxMembers: true } })
				])
				if (active >= pact.maxMembers) return { outcome: 'full' }
				const member = await tx.pactMember.create({
					data: { pactId, userId, role: 'member', joinedDay },
					select: MEMBER
				})
				return { outcome: 'joined', member: toMember(member) }
			})
		},

		/** The pact and the caller's membership, or null when they have never been a member. */
		async membership(pactId: string, userId: string) {
			const member = await client.pactMember.findUnique({
				where: { pactId_userId: { pactId, userId } },
				select: { ...MEMBER, pact: { select: PACT } }
			})
			if (!member) return null
			const { pact, ...rest } = member
			return { pact, me: toMember(rest) }
		},

		/** The caller's check-in on `day` in this pact, if any. */
		async checkInOn(pactId: string, userId: string, day: Date): Promise<CheckInRecord | null> {
			return client.checkIn.findUnique({
				where: { pactId_userId_day: { pactId, userId, day } },
				select: CHECK_IN
			})
		},

		/**
		 * R11, R17: today's check-in. One per member per day (the unique key decides between two
		 * at once). A saver first claims the member's one saver with a conditional update, in the
		 * same transaction, so concurrent savers can't both succeed and a refused check-in never
		 * spends it. Idempotent by id, like create.
		 */
		async createCheckIn(input: NewCheckIn): Promise<CreateCheckInResult> {
			const id = input.id ?? randomUUID()
			const mine = (row: CheckInRecord): CreateCheckInResult =>
				row.userId === input.userId && row.pactId === input.pactId
					? { outcome: 'existing', checkIn: row }
					: { outcome: 'conflict' }

			const existing = await client.checkIn.findUnique({ where: { id }, select: CHECK_IN })
			if (existing) return mine(existing)
			try {
				return await client.$transaction(async (tx) => {
					if (input.kind === 'saver') {
						const { count } = await tx.pactMember.updateMany({
							where: { pactId: input.pactId, userId: input.userId, saverUsedDay: null },
							data: { saverUsedDay: input.day }
						})
						if (count === 0) return { outcome: 'saver_used' } as const
					}
					const checkIn = await tx.checkIn.create({
						data: {
							id,
							pactId: input.pactId,
							userId: input.userId,
							day: input.day,
							kind: input.kind,
							challenge: input.challenge,
							photoPath: input.photoPath,
							note: input.note,
							verdict: input.verdict
						},
						select: CHECK_IN
					})
					return { outcome: 'created', checkIn } as const
				})
			} catch (err) {
				if (!isUniqueViolation(err)) throw err
				const raced = await client.checkIn.findUnique({ where: { id }, select: CHECK_IN })
				if (raced) return mine(raced)
				return { outcome: 'already_checked_in' }
			}
		},

		/** One check-in, when the caller is (or was) a member of its pact. */
		async checkIn(id: string, userId: string): Promise<CheckInRecord | null> {
			return client.checkIn.findFirst({
				where: { id, member: { pact: { members: { some: { userId } } } } },
				select: CHECK_IN
			})
		},

		/** What the judge needs: the photo, the habit and the challenge it was taken against. */
		async forJudging(id: string) {
			return client.checkIn.findUnique({
				where: { id },
				select: {
					id: true,
					pactId: true,
					userId: true,
					kind: true,
					challenge: true,
					photoPath: true,
					verdict: true,
					member: { select: { pact: { select: { habit: true } } } }
				}
			})
		},

		/**
		 * Stores the judge's verdict, once: only a check-in still `pending` takes one, so a late
		 * or repeated judgement never overwrites the first. False when it was already judged.
		 */
		async setVerdict(id: string, verdict: Verdict, judgedAt: Date): Promise<boolean> {
			const { count } = await client.checkIn.updateMany({
				where: { id, verdict: 'pending' },
				data: { ...verdict, judgedAt }
			})
			return count === 1
		},

		/** How many check-ins the person has, across every pact: 1 means this was their first. */
		async checkInCount(userId: string): Promise<number> {
			return client.checkIn.count({ where: { userId } })
		}
	}
}

export type PactStore = ReturnType<typeof createPactStore>

export const pactStore = createPactStore(db)
