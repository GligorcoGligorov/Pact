import { useEffect } from 'react'
import * as Notifications from 'expo-notifications'
import { router } from 'expo-router'
import type { PactListItem } from '@app/contract'
import { track } from './analytics'
import { log } from './logger'
import './notifications'

/**
 * R21: a local notification at 22:00 pact-local time ("2h left") for every active pact the person
 * hasn't checked into today. Rebuilt from the pact list whenever it changes, which is on every
 * foreground and after every check-in, so a check-in cancels its reminder and a new day brings
 * a fresh one. Local only: the trial's build can't sign remote push.
 */

const PREFIX = 'pact-reminder:'
/** 22:00 local: two hours before the day closes at midnight. */
const BEFORE_CLOSE_MS = 2 * 60 * 60 * 1000

/** When the reminder for this pact fires today, or null when there is nothing to remind. */
export function reminderAt(pact: PactListItem, now = Date.now()): Date | null {
	if (pact.status !== 'active' || pact.my_state_today !== 'out' || !pact.today) return null
	const at = Date.parse(pact.today.closes_at) - BEFORE_CLOSE_MS
	return at > now ? new Date(at) : null
}

async function reschedule(pacts: PactListItem[]) {
	const scheduled = await Notifications.getAllScheduledNotificationsAsync()
	await Promise.all(
		scheduled
			.filter((n) => n.identifier.startsWith(PREFIX))
			.map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
	)
	const { granted } = await Notifications.getPermissionsAsync()
	if (!granted) return
	for (const pact of pacts) {
		const at = reminderAt(pact)
		if (!at) continue
		await Notifications.scheduleNotificationAsync({
			identifier: `${PREFIX}${pact.id}`,
			content: {
				title: `2h left · ${pact.name}`,
				body: `${pact.habit}. Your crew is waiting on you.`,
				data: { pactId: pact.id, kind: 'reminder' }
			},
			trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at }
		})
	}
}

/** Mounted once, in the signed-in tabs, with the person's pact list. */
export function useReminders(pacts: PactListItem[] | undefined) {
	useEffect(() => {
		if (!pacts) return
		reschedule(pacts).catch((error) => log.warn('Reminders could not be scheduled', { error }))
	}, [pacts])

	useEffect(() => {
		const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
			const data = response.notification.request.content.data as {
				pactId?: unknown
				kind?: unknown
			}
			if (data?.kind !== 'reminder' || typeof data.pactId !== 'string') return
			track('reminder_opened', { pact_id: data.pactId })
			router.push(`/pact/${data.pactId}`)
		})
		return () => subscription.remove()
	}, [])
}
