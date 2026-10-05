import { useEffect } from 'react'
import { StyleSheet, View } from 'react-native'
import Animated, {
	cancelAnimation,
	Easing,
	useAnimatedStyle,
	useSharedValue,
	withRepeat,
	withSequence,
	withTiming
} from 'react-native-reanimated'
import { Flame } from 'lucide-react-native'
import { useColors } from '@/contexts/ThemeContext'
import { useReducedMotion } from '@/lib/motion'
import { flameLevel, type FlameLevel } from '@/lib/streaks'

/** Per level: how far it sways and swells, how fast it breathes, and its glow. */
const LIFE: Record<FlameLevel, { sway: number; swell: number; ms: number; glow: number }> = {
	0: { sway: 0, swell: 0, ms: 0, glow: 0 },
	1: { sway: 2, swell: 0.03, ms: 1400, glow: 0 },
	2: { sway: 4, swell: 0.06, ms: 1100, glow: 0.18 },
	3: { sway: 6, swell: 0.09, ms: 850, glow: 0.3 }
}

/**
 * The streak's flame, alive: it flickers once the streak is lit and burns brighter as it grows
 * (3 and 7 days are the steps). Out, it is a grey outline. A loop is movement Reduce Motion
 * can't turn into an instant change, so with it the flame holds still at its level's size.
 */
export function StreakFlame({ streak, size = 24 }: { streak: number; size?: number }) {
	const c = useColors()
	const reduced = useReducedMotion()
	const level = flameLevel(streak)
	const life = LIFE[level]
	const t = useSharedValue(0)

	useEffect(() => {
		if (reduced || level === 0) {
			cancelAnimation(t)
			t.value = 0
			return
		}
		const half = { duration: life.ms / 2, easing: Easing.inOut(Easing.sin) }
		t.value = withRepeat(withSequence(withTiming(1, half), withTiming(-1, half)), -1, true)
		return () => cancelAnimation(t)
	}, [level, life.ms, reduced, t])

	const flicker = useAnimatedStyle(() => ({
		transform: [
			{ translateY: size * 0.08 },
			{ rotate: `${t.value * life.sway}deg` },
			{ scaleY: 1 + Math.abs(t.value) * life.swell },
			{ translateY: -size * 0.08 }
		]
	}))
	const glow = useAnimatedStyle(() => ({
		opacity: life.glow * (0.75 + 0.25 * Math.abs(t.value))
	}))

	const lit = level > 0
	// Each step up the streak makes the flame a little bigger, never past 20%.
	const drawn = size * (1 + 0.07 * level)
	return (
		<View style={{ width: drawn, height: drawn }} accessibilityElementsHidden>
			{life.glow > 0 ? (
				<Animated.View
					style={[
						s.glow,
						{
							backgroundColor: c.warning,
							borderRadius: drawn,
							shadowColor: c.warning
						},
						glow
					]}
				/>
			) : null}
			<Animated.View style={flicker}>
				<Flame
					size={drawn}
					color={lit ? c.warning : c.textDisabled}
					fill={lit ? (level === 3 ? c.warning : c.warningSoft) : 'none'}
					strokeWidth={2}
				/>
			</Animated.View>
		</View>
	)
}

const s = StyleSheet.create({
	glow: {
		...StyleSheet.absoluteFillObject,
		transform: [{ scale: 0.7 }],
		shadowOpacity: 1,
		shadowRadius: 10,
		shadowOffset: { width: 0, height: 0 }
	}
})
