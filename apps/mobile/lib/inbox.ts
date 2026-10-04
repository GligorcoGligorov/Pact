import { useEffect } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Notifications from 'expo-notifications'
import { router } from 'expo-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { track } from './analytics'
import { api } from './api'
import { log } from './logger'
import './notifications'
import { pactKeys } from './pacts'

/**
 * The crew's messages (a nudge, a kept day) as real iOS banners. The trial can't sign remote push
 * (a free Apple ID; docs/pact-status.md), so the app reads its own inbox: every 15 s while it is
 * open and whenever it comes back, and shows each NEW `team` message as a local notification,
 * which iOS presents like a push. Tapping one opens its pact.
 */

const SEEN_KEY = 'pact:inbox:seen-at:v1'
const POLL_MS = 15_000
const LATEST = 10

async function seenAt(): Promise<string | null> {
	try {
		return await AsyncStorage.getItem(SEEN_KEY)
	} catch {
		return null
	}
}

async function markSeen(at: string): Promise<void> {
	try {
		await AsyncStorage.setItem(SEEN_KEY, at)
	} catch {
		// Worst case a banner shows twice; never worth failing the poll for.
	}
}

/** Mounted once, in the signed-in tabs. */
export function useInboxBanners() {
	const queryClient = useQueryClient()
	const latest = useQuery({
		queryKey: ['inbox', 'latest'],
		queryFn: async ({ signal }) =>
			(await api('listNotifications', { query: { limit: LATEST }, signal })).notifications,
		refetchInterval: POLL_MS,
		refetchIntervalInBackground: false
	})

	useEffect(() => {
		const rows = latest.data
		if (!rows || rows.length === 0) return
		let cancelled = false
		void (async () => {
			const newest = rows[0].created_at
			const seen = await seenAt()
			// First run on this device: everything already there counts as seen, so a new
			// install never floods the screen with old nudges.
			if (!seen) return void (await markSeen(newest))
			const fresh = rows.filter((row) => row.category === 'team' && row.created_at > seen).reverse()
			if (fresh.length === 0 || cancelled) return
			await markSeen(newest)
			await queryClient.invalidateQueries({ queryKey: pactKeys.all })
			const { granted } = await Notifications.getPermissionsAsync()
			if (!granted) return
			for (const row of fresh) {
				try {
					await Notifications.scheduleNotificationAsync({
						content: {
							title: row.title,
							body: row.body ?? undefined,
							data: { pactId: row.pact_id, kind: 'crew' }
						},
						trigger: null
					})
				} catch (error) {
					log.warn('A crew banner could not be shown', { error })
				}
			}
		})()
		return () => {
			cancelled = true
		}
	}, [latest.data, queryClient])

	// A tapped banner opens its pact.
	useEffect(() => {
		const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
			const data = response.notification.request.content.data as {
				pactId?: unknown
				kind?: unknown
			}
			if (data?.kind !== 'crew' || typeof data.pactId !== 'string') return
			track('nudge_opened', { pact_id: data.pactId })
			router.push(`/pact/${data.pactId}`)
		})
		return () => subscription.remove()
	}, [])
}
