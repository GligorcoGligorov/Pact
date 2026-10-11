import { useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import Animated, { FadeIn } from 'react-native-reanimated'
import { Text } from '@/components/ui/Text'
import { track } from '@/lib/analytics'
import { haptic } from '@/lib/haptics'
import { CELEBRATION, type Milestone } from '@/lib/streaks'

/**
 * True the first time this device sees `key` while `active`, then false: a celebration's haptic,
 * burst and event happen once, the card stays. `onFirst` runs at that first time.
 */
function useFirstView(key: string, active: boolean, onFirst: () => void): boolean {
	const [first, setFirst] = useState(false)
	useEffect(() => {
		if (!active) return
		let cancelled = false
		void (async () => {
			let seen: string | null = null
			try {
				seen = await AsyncStorage.getItem(key)
				await AsyncStorage.setItem(key, '1')
			} catch {
				// Without storage the celebration may repeat; it never fails the board.
			}
			if (seen || cancelled) return
			setFirst(true)
			onFirst()
		})()
		return () => {
			cancelled = true
		}
		// onFirst is a fresh closure each render; the key and `active` decide when it runs.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [key, active])
	return first
}

/** The first view of a pact-day kept by the whole crew, on this device. */
export function useFirstKeptView(pactId: string, day: string, kept: boolean): boolean {
	return useFirstView(`pact:kept-seen:${pactId}:${day}`, kept, () => {
		haptic.success()
		track('crew_day_kept_viewed', { pact_id: pactId })
	})
}

/** The first view of a streak milestone (3, 7, 14) for a pact, on this device. */
export function useFirstMilestoneView(pactId: string, milestone: Milestone | null): boolean {
	return useFirstView(`pact:milestone-seen:${pactId}:${milestone}`, milestone !== null, () => {
		haptic.success()
		track('streak_milestone_viewed', { pact_id: pactId, days: milestone })
	})
}

const MILESTONE_COPY: Record<Milestone, { title: string; body: string }> = {
	3: { title: 'Three in a row.', body: 'The habit’s catching. Keep the chain going.' },
	7: { title: 'A whole week.', body: 'Seven days, nobody missed one.' },
	14: { title: 'Two weeks strong.', body: 'Fourteen days straight. This is just who you are now.' }
}

/**
 * The board's line once everyone is in, under the chain whose link for today just closed: the
 * day kept by the whole crew, or the milestone it reached. Two-tone, no card: the chain is the
 * celebration, this only names it.
 */
export function KeptLine({
	dayNumber,
	milestone
}: {
	dayNumber: number
	milestone: Milestone | null
}) {
	const copy = milestone ? MILESTONE_COPY[milestone] : null
	return (
		<Animated.View entering={FadeIn.duration(CELEBRATION.landMs)} accessibilityRole="summary">
			<Text variant="h2">{copy ? copy.title : `Day ${dayNumber} kept.`}</Text>
			<Text variant="h2" tone="tertiary">
				{copy ? copy.body : 'The whole crew is in. See you tomorrow.'}
			</Text>
		</Animated.View>
	)
}
