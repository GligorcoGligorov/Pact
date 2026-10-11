import { useEffect, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Camera, X } from 'lucide-react-native'
import type { CrewTone } from '@app/brand'
import { PressableScale } from '@/components/motion/PressableScale'
import { CornerMarks } from '@/components/ui/CornerMarks'
import { Text } from '@/components/ui/Text'
import { useReducedMotion } from '@/lib/motion'
import { clockLeft } from './Countdown'

const SHUTTER = 88

/**
 * Today's challenge, as the day's moment: the whole screen in the crew's colour, the time left
 * ticking big, the challenge in big type, and the camera one tap away. The challenge is what
 * proves the photo is from today (R12), so it gets the screen to itself before the camera opens.
 */
export function ChallengeMoment({
	tone,
	challenge,
	closesAt,
	dayLabel,
	onCapture,
	onClose
}: {
	tone: CrewTone
	challenge: string
	closesAt: string
	/** "Day 08 / 21". */
	dayLabel: string
	onCapture: () => void
	onClose: () => void
}) {
	const insets = useSafeAreaInsets()
	const reduced = useReducedMotion()
	const [now, setNow] = useState(Date.now())
	useEffect(() => {
		const timer = setInterval(() => setNow(Date.now()), 1000)
		return () => clearInterval(timer)
	}, [])
	const ink = { color: tone.onFill }
	const muted = { color: tone.onFillLarge }

	return (
		<View
			style={[
				s.root,
				{
					backgroundColor: tone.fill,
					paddingTop: insets.top + 8,
					paddingBottom: insets.bottom + 24
				}
			]}
		>
			<View style={s.top}>
				<Text variant="mono" style={{ color: tone.onFillMuted }}>
					{dayLabel} · today’s challenge
				</Text>
				<PressableScale
					onPress={onClose}
					scaleTo={0.9}
					haptic="select"
					accessibilityRole="button"
					accessibilityLabel="Close"
					hitSlop={12}
					style={[s.close, { borderColor: tone.onFillTrack }]}
				>
					<X size={20} color={tone.onFill} strokeWidth={2} />
				</PressableScale>
			</View>

			<Animated.View entering={reduced ? undefined : FadeIn.duration(240)} style={s.clock}>
				<Text variant="mono" style={{ color: tone.onFillMuted }}>
					Left today
				</Text>
				<Text
					variant="displayHero"
					tabular
					style={[s.time, ink]}
					accessibilityLabel={`${clockLeft(closesAt, now)} left today`}
				>
					{clockLeft(closesAt, now)}
				</Text>
			</Animated.View>

			<Animated.View
				entering={reduced ? undefined : FadeInDown.delay(80).duration(320)}
				style={s.challenge}
			>
				<Text variant="displayHero" style={ink}>
					{challenge}.
				</Text>
				<Text variant="h2" style={muted}>
					Show it in your photo, so the crew knows it’s from today.
				</Text>
			</Animated.View>

			<View style={s.shutterRow}>
				<CornerMarks color={tone.onFill}>
					<PressableScale
						onPress={onCapture}
						scaleTo="button"
						haptic="snap"
						accessibilityRole="button"
						accessibilityLabel="Open the camera"
						style={[s.shutter, { backgroundColor: tone.onFill }]}
					>
						<Camera size={34} color={tone.fill} strokeWidth={1.8} />
					</PressableScale>
				</CornerMarks>
			</View>
		</View>
	)
}

const s = StyleSheet.create({
	root: { flex: 1, paddingHorizontal: 20, gap: 28 },
	top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
	close: {
		width: 40,
		height: 40,
		borderRadius: 20,
		borderWidth: 1.5,
		alignItems: 'center',
		justifyContent: 'center'
	},
	clock: { gap: 4, marginTop: 12 },
	time: { fontSize: 76, lineHeight: 78 },
	challenge: { flex: 1, gap: 12 },
	shutterRow: { alignItems: 'center' },
	shutter: {
		width: SHUTTER,
		height: SHUTTER,
		borderRadius: SHUTTER / 2,
		alignItems: 'center',
		justifyContent: 'center'
	}
})
