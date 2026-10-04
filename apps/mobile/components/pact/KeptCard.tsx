import { useEffect, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import Animated, { ZoomIn } from 'react-native-reanimated'
import { Flame } from 'lucide-react-native'
import { Text } from '@/components/ui/Text'
import { useTheme } from '@/contexts/ThemeContext'
import { track } from '@/lib/analytics'
import { haptic } from '@/lib/haptics'

const seenKey = (pactId: string, day: string) => `pact:kept-seen:${pactId}:${day}`

/**
 * True the first time this device shows a pact-day as kept, then false for the rest of the day:
 * the confetti and the haptic happen once, the card stays.
 */
export function useFirstKeptView(pactId: string, day: string, kept: boolean): boolean {
	const [first, setFirst] = useState(false)
	useEffect(() => {
		if (!kept) return
		let cancelled = false
		void (async () => {
			let seen: string | null = null
			try {
				seen = await AsyncStorage.getItem(seenKey(pactId, day))
				await AsyncStorage.setItem(seenKey(pactId, day), '1')
			} catch {
				// Without storage the celebration may repeat; it never fails the board.
			}
			if (seen || cancelled) return
			setFirst(true)
			haptic.success()
			track('crew_day_kept_viewed', { pact_id: pactId })
		})()
		return () => {
			cancelled = true
		}
	}, [pactId, day, kept])
	return first
}

/** The board's payoff once everyone is in: the day kept by the whole crew, and the streak. */
export function KeptCard({ dayNumber, streak }: { dayNumber: number; streak: number }) {
	const { colors: c, elevation } = useTheme()
	return (
		<Animated.View
			entering={ZoomIn.springify().damping(14)}
			style={[s.card, { backgroundColor: c.brandFill }, elevation.raised]}
			accessibilityRole="summary"
		>
			<View style={[s.flame, { backgroundColor: c.onBrand }]}>
				<Flame size={26} color={c.warning} fill={c.warningSoft} strokeWidth={2} />
			</View>
			<View style={s.text}>
				<Text variant="h3" style={{ color: c.onBrand }}>
					Day {dayNumber} kept by the whole crew
				</Text>
				<Text variant="bodySm" style={{ color: c.onBrand, opacity: 0.85 }}>
					Everyone’s in. {streak} {streak === 1 ? 'day' : 'days'} in a row. See you tomorrow.
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
