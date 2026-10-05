// Shared by the pact route suites (not a suite itself): store rows as ./db/pacts returns them,
// and a fixed "now". Every date column is a Date at UTC midnight, as Prisma reads `@db.Date`.
import type { CheckInRecord, MemberRecord, PactRecord } from '@/server/db/pacts'
import { OTHER, USER } from './app-test-kit.mts'

export const PACT_ID = '0b6a7c1e-4f3d-4c2a-9e8b-1d2c3b4a5f60'
export const CHECK_IN_ID = '7d1f2e3c-5b4a-4c6d-8e9f-0a1b2c3d4e5f'

/** 12:00 in Skopje (UTC+2) on Wednesday 2026-09-30. */
export const NOW = new Date('2026-09-30T10:00:00.000Z')
export const TODAY = '2026-09-30'

export const at = (day: string) => new Date(`${day}T00:00:00.000Z`)

export function pactRow(overrides: Partial<PactRecord> = {}): PactRecord {
	return {
		id: PACT_ID,
		ownerId: USER,
		name: 'Morning run crew',
		habit: 'Run 3 km before 9',
		color: 'coral',
		emoji: '🏃',
		cadence: 'daily',
		timezone: 'Europe/Skopje',
		startDay: at('2026-09-23'),
		endDay: at('2026-10-13'),
		stake: 'Loser buys coffee',
		inviteCode: 'STREAK',
		maxMembers: 8,
		cancelledAt: null,
		createdAt: new Date('2026-09-22T08:00:00.000Z'),
		...overrides
	}
}

export function memberRow(overrides: Partial<MemberRecord> = {}): MemberRecord {
	return {
		userId: USER,
		role: 'owner',
		joinedDay: at('2026-09-23'),
		leftDay: null,
		saverUsedDay: null,
		createdAt: new Date('2026-09-22T08:00:00.000Z'),
		displayName: 'Ana',
		...overrides
	}
}

export const otherMember = (overrides: Partial<MemberRecord> = {}) =>
	memberRow({ userId: OTHER, role: 'member', displayName: 'Ben', ...overrides })

export function checkInRow(overrides: Partial<CheckInRecord> = {}): CheckInRecord {
	return {
		id: CHECK_IN_ID,
		pactId: PACT_ID,
		userId: USER,
		day: at(TODAY),
		kind: 'photo',
		challenge: 'Hold up three fingers',
		photoPath: `${USER}/proofs/${CHECK_IN_ID}.jpg`,
		note: null,
		verdict: 'pending',
		aiReason: null,
		aiCaption: null,
		judgedAt: null,
		createdAt: new Date('2026-09-30T09:59:00.000Z'),
		...overrides
	}
}
