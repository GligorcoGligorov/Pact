import { useEffect, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import Animated, { ZoomIn } from 'react-native-reanimated'
import { Text } from '@/components/ui/Text'
import { useTheme } from '@/contexts/ThemeContext'
import { track } from '@/lib/analytics'
import { haptic } from '@/lib/haptics'
import type { Milestone } from '@/lib/streaks'
import { StreakFlame } from './StreakFlame'

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
	3: { title: '3 days in a row', body: 'The habit’s catching. Keep the chain going.' },
	7: { title: 'A whole week!', body: 'Seven days, nobody missed one. That’s a crew.' },
	14: { title: 'Two weeks strong', body: 'Fourteen days straight. This is just who you are now.' }
}

/**
 * The board's payoff once everyone is in: the day kept by the whole crew, and the streak. On a
 * milestone day it says so instead.
 */
export function KeptCard({
	dayNumber,
	streak,
	milestone
}: {
	dayNumber: number
	streak: number
	milestone: Milestone | null
}) {
	const { colors: c, elevation } = useTheme()
	const copy = milestone ? MILESTONE_COPY[milestone] : null
	return (
		<Animated.View
			entering={ZoomIn.springify().damping(14)}
			style={[s.card, { backgroundColor: c.brandFill }, elevation.raised]}
			accessibilityRole="summary"
		>
			<View style={[s.flame, { backgroundColor: c.onBrand }]}>
				<StreakFlame streak={streak} size={26} />
			</View>
			<View style={s.text}>
				<Text variant="h3" style={{ color: c.onBrand }}>
					{copy ? copy.title : `Day ${dayNumber} kept by the whole crew`}
				</Text>
				<Text variant="bodySm" style={{ color: c.onBrand, opacity: 0.85 }}>
					{copy
						? copy.body
						: `Everyone’s in. ${streak} ${streak === 1 ? 'day' : 'days'} in a row. See you tomorrow.`}
				</Text>
			</View>
		</Animated.View>
	)
}

const s = StyleSheet.create({
	card: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 24, padding: 18 },
	flame: {
		width: 48,
		height: 48,
		borderRadius: 16,
		alignItems: 'center',
		justifyContent: 'center'
	},
	text: { flex: 1, gap: 3 }
})
