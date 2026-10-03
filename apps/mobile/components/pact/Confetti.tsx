import { useEffect, useMemo } from 'react'
import { StyleSheet, useWindowDimensions, View } from 'react-native'
import Animated, {
	Easing,
	useAnimatedStyle,
	useSharedValue,
	withDelay,
	withTiming,
	type SharedValue
} from 'react-native-reanimated'
import { useColors } from '@/contexts/ThemeContext'
import { useReducedMotion } from '@/lib/motion'

const PIECES = 46
const FALL_MS = 2600

type Piece = {
	x: number
	drift: number
	delay: number
	spin: number
	size: number
	round: boolean
	color: string
}

/**
 * The brief's "Good job!" burst: brand-coloured pieces that fall once across the screen. Skipped
 * entirely when the person has asked for reduced motion. Never blocks touches.
 */
export function Confetti() {
	const c = useColors()
	const reduceMotion = useReducedMotion()
	const { width, height } = useWindowDimensions()
	const progress = useSharedValue(0)

	const pieces = useMemo<Piece[]>(() => {
		const colors = [c.brandFill, c.warning, c.info, c.error, c.success, c.heroText]
		return Array.from({ length: PIECES }, (_, i) => ({
			x: Math.random() * width,
			drift: (Math.random() - 0.5) * 120,
			delay: Math.random() * 0.25,
			spin: (Math.random() - 0.5) * 900,
			size: 7 + Math.random() * 7,
			round: i % 3 === 0,
			color: colors[i % colors.length]
		}))
	}, [c, width])

	useEffect(() => {
		if (reduceMotion) return
		progress.value = withTiming(1, { duration: FALL_MS, easing: Easing.out(Easing.quad) })
	}, [progress, reduceMotion])

	if (reduceMotion) return null
	return (
		<View pointerEvents="none" style={StyleSheet.absoluteFill}>
			{pieces.map((piece, i) => (
				<ConfettiPiece key={i} piece={piece} progress={progress} height={height} />
			))}
		</View>
	)
}

function ConfettiPiece({
	piece,
	progress,
	height
}: {
	piece: Piece
	progress: SharedValue<number>
	height: number
}) {
	const local = useSharedValue(0)
	useEffect(() => {
		local.value = withDelay(
			piece.delay * FALL_MS,
			withTiming(1, { duration: FALL_MS * (1 - piece.delay), easing: Easing.in(Easing.quad) })
		)
	}, [local, piece.delay])

	const style = useAnimatedStyle(() => {
		const t = local.value
		return {
			opacity: progress.value < 0.92 ? 1 : (1 - progress.value) * 12.5,
			transform: [
				{ translateX: piece.x + piece.drift * t },
				{ translateY: -40 + t * (height + 80) },
				{ rotate: `${piece.spin * t}deg` }
			]
		}
	})

	return (
		<Animated.View
			style={[
				s.piece,
				{
					width: piece.size,
					height: piece.round ? piece.size : piece.size * 0.45,
					borderRadius: piece.round ? piece.size / 2 : 2,
					backgroundColor: piece.color
				},
				style
			]}
		/>
	)
}

const s = StyleSheet.create({
	piece: { position: 'absolute', top: 0, left: 0 }
})
