import { z } from 'zod'
import { isoDateTime, nextCursor, pageQuery, uuid } from './common'

// GET /api/app/v1/notifications: the person's notifications, newest first.

export const NOTIFICATION_CATEGORIES = ['billing', 'system', 'product', 'team'] as const
export const notificationCategorySchema = z.enum(NOTIFICATION_CATEGORIES)

export const notificationSchema = z.object({
	id: uuid,
	title: z.string(),
	body: z.string().nullable(),
	category: notificationCategorySchema,
	read: z.boolean(),
	/** The pact it is about (a nudge, a kept day), so the app can open it; null otherwise. */
	pact_id: uuid.nullable(),
	created_at: isoDateTime
})

export const listNotificationsQuery = pageQuery

export const listNotificationsResponse = z.object({
	notifications: z.array(notificationSchema),
	next_cursor: nextCursor
})

export type Notification = z.infer<typeof notificationSchema>
