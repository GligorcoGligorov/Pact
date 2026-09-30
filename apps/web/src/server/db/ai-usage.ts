import type { AiUsageOutcome, PrismaClient } from '@prisma/client'
import { db } from './client'

// One row per AI model call (prisma/schema/ai.prisma). Written by src/server/ai/ only.

export type AiUsageRow = {
	userId: string | null
	feature: string
	provider: string
	model: string
	outcome: AiUsageOutcome
	errorCode?: string | null
	inputTokens?: number | null
	outputTokens?: number | null
	latencyMs: number
	checkInId?: string | null
}

export function createAiUsageStore(client: PrismaClient) {
	return {
		async record(row: AiUsageRow): Promise<void> {
			await client.aiUsage.create({ data: row })
		}
	}
}

export type AiUsageStore = ReturnType<typeof createAiUsageStore>

export const aiUsageStore = createAiUsageStore(db)
