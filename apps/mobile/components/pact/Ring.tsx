import { useEffect, type ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'
import Animated, { useAnimatedProps, useSharedValue, withSpring } from 'react-native-reanimated'
import Svg, { Circle } from 'react-native-svg'
import { Springs } from '@/lib/motion'

const AnimatedCircle = Animated.createAnimatedComponent(Circle)

/**
 * The brief's Apple Fitness ring: a track and a rounded arc for `value` of `max`.
 * The arc springs from empty on mount and from its last value on every change, so a
 * check-in visibly fills it; with Reduce Motion it is drawn at its value at once.
 */
export function Ring({
	value,
	max,
	size = 84,
	stroke = 10,
	color,
	track,
	children
}: {
	value: number
	max: number
	size?: number
	stroke?: number
	color: string
	track: string
	children?: ReactNode
}) {
	const r = (size - stroke) / 2
	const circumference = 2 * Math.PI * r
	const share = max > 0 ? Math.min(value / max, 1) : 0
	const shown = useSharedValue(0)

	useEffect(() => {
		shown.value = withSpring(share, Springs.gentle)
	}, [share, shown])

	const arc = useAnimatedProps(() => ({
		strokeDashoffset: circumference * (1 - shown.value),
		// A round cap draws a dot at zero length: hide the arc until it has length.
		strokeOpacity: shown.value > 0.001 ? 1 : 0
	}))

	return (
		<View style={{ width: size, height: size }}>
			<Svg width={size} height={size} style={s.svg}>
				<Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
				<AnimatedCircle
					cx={size / 2}
					cy={size / 2}
					r={r}
					stroke={color}
					strokeWidth={stroke}
					strokeLinecap="round"
					fill="none"
					strokeDasharray={`${circumference} ${circumference}`}
					animatedProps={arc}
					transform={`rotate(-90 ${size / 2} ${size / 2})`}
				/>
			</Svg>
			<View style={s.center}>{children}</View>
		</View>
	)
}

const s = StyleSheet.create({
	svg: { position: 'absolute' },
	center: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' }
})
