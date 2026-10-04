import type { PrismaClient } from '@prisma/client'
import { db } from './client'

// Writes to people's inboxes (`notifications`): a nudge, a kept day. The app reads them through
// GET /api/app/v1/notifications and shows each new one as a banner (docs/pact-status.md, push).

export type InboxMessage = {
	userId: string
	title: string
	body: string | null
	pactId: string | null
}

export function createInboxStore(client: PrismaClient) {
	return {
		/** One `team` notification per message. */
		async notify(messages: InboxMessage[]): Promise<void> {
			if (messages.length === 0) return
			await client.notification.createMany({
				data: messages.map((m) => ({ ...m, category: 'team' as const }))
			})
		}
	}
}

export type InboxStore = ReturnType<typeof createInboxStore>

export const inboxStore = createInboxStore(db)
