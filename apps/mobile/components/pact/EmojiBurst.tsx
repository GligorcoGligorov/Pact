import { useEffect, useMemo } from 'react'
import { StyleSheet, useWindowDimensions, View } from 'react-native'
import Animated, {
	Easing,
	useAnimatedStyle,
	useSharedValue,
	withDelay,
	withTiming
} from 'react-native-reanimated'
import { useReducedMotion } from '@/lib/motion'
import { CELEBRATION } from '@/lib/streaks'

const PIECES = 14
const FONT = 30

type Piece = { emoji: string; dx: number; dy: number; spin: number; scale: number }

/**
 * A celebration: a handful of emoji burst out from a point and are gone (lib/streaks'
 * CELEBRATION: landed by 400ms, gone by 700ms), so it is a beat, never something to wait out.
 * Skipped under Reduce Motion. Never blocks touches.
 */
export function EmojiBurst({
	emoji,
	originY = 0.32
}: {
	/** What bursts: the crew's own emoji first, then a couple of cheers. */
	emoji: readonly string[]
	/** Where it bursts from, as a share of the screen's height. */
	originY?: number
}) {
	const reduceMotion = useReducedMotion()
	const { width, height } = useWindowDimensions()
	const pieces = useMemo<Piece[]>(
		() =>
			Array.from({ length: PIECES }, (_, i) => {
				const angle = (i / PIECES) * Math.PI * 2 + Math.random() * 0.4
				const distance = 90 + Math.random() * 80
				return {
					emoji: emoji[i % emoji.length]!,
					dx: Math.cos(angle) * distance,
					// A little lift, so the burst reads as up and out.
					dy: Math.sin(angle) * distance - 30,
					spin: (Math.random() - 0.5) * 60,
					scale: 0.8 + Math.random() * 0.5
				}
			}),
		[emoji]
	)

	if (reduceMotion || emoji.length === 0) return null
	return (
		<View pointerEvents="none" style={StyleSheet.absoluteFill}>
			{pieces.map((piece, i) => (
				<BurstPiece key={i} piece={piece} x={width / 2} y={height * originY} />
			))}
		</View>
	)
}

function BurstPiece({ piece, x, y }: { piece: Piece; x: number; y: number }) {
	const out = useSharedValue(0)
	const opacity = useSharedValue(1)
	useEffect(() => {
		out.value = withTiming(1, { duration: CELEBRATION.landMs, easing: Easing.out(Easing.cubic) })
		opacity.value = withDelay(
			CELEBRATION.landMs + CELEBRATION.holdMs,
			withTiming(0, { duration: CELEBRATION.fadeMs, easing: Easing.in(Easing.quad) })
		)
	}, [opacity, out])

	const style = useAnimatedStyle(() => ({
		opacity: opacity.value,
		transform: [
			{ translateX: x - FONT / 2 + piece.dx * out.value },
			{ translateY: y - FONT / 2 + piece.dy * out.value },
			{ rotate: `${piece.spin * out.value}deg` },
			{ scale: (0.3 + 0.7 * out.value) * piece.scale }
		]
	}))

	return (
		<Animated.Text style={[s.piece, style]} allowFontScaling={false}>
			{piece.emoji}
		</Animated.Text>
	)
}

const s = StyleSheet.create({
	piece: { position: 'absolute', top: 0, left: 0, fontSize: FONT, lineHeight: FONT * 1.2 }
})
