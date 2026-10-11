import { useEffect, useState } from 'react'
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native'
import { Image } from 'expo-image'
import Animated, {
	cancelAnimation,
	Easing,
	FadeInDown,
	useAnimatedStyle,
	useSharedValue,
	withRepeat,
	withTiming
} from 'react-native-reanimated'
import type { CrewTone } from '@app/brand'
import { Text } from '@/components/ui/Text'
import { useReducedMotion } from '@/lib/motion'

/** The onboarding photos (assets/intro/README.md). */
export const DEMO_PHOTOS = [
	require('@/assets/intro/1.jpg'),
	require('@/assets/intro/2.jpg'),
	require('@/assets/intro/3.jpg'),
	require('@/assets/intro/4.jpg'),
	require('@/assets/intro/5.jpg'),
	require('@/assets/intro/6.jpg'),
	require('@/assets/intro/7.jpg'),
	require('@/assets/intro/8.jpg'),
	require('@/assets/intro/9.jpg'),
	require('@/assets/intro/10.jpg'),
	require('@/assets/intro/11.jpg'),
	require('@/assets/intro/12.jpg')
] as const

/** A tile: a photo by index into DEMO_PHOTOS, or someone still out (their initials). */
export type DemoTile = number | { waiting: string }
export type DemoRow = { tiles: DemoTile[]; kept?: boolean }

const GAP = 4
const FRAME = 3
const PULSE_MS = 1600
const ROW_STAGGER_MS = 70

/**
 * A Crew Wall drawn from bundled photos, for screens before there is a pact (welcome, the
 * intro): the same look as the real one, kept rows framed in the crew's colour and glowing,
 * an empty tile breathing.
 */
export function DemoWall({
	rows,
	tone,
	aspect = 1,
	onFill
}: {
	rows: DemoRow[]
	tone: CrewTone
	/** Tile height over width. */
	aspect?: number
	/** Drawn on the crew's own fill: frames in its ink. */
	onFill?: boolean
}) {
	const [width, setWidth] = useState(0)
	const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)
	const n = Math.max(...rows.map((r) => r.tiles.length), 1)
	const tileW = width > 0 ? (width - FRAME * 2 - GAP * (n - 1)) / n : 0
	const frame = onFill ? tone.onFill : tone.fill

	return (
		<View onLayout={onLayout} style={s.wrap} accessibilityElementsHidden>
			{tileW > 0
				? rows.map((row, r) => (
						<Animated.View
							key={r}
							entering={FadeInDown.delay(r * ROW_STAGGER_MS).duration(280)}
							style={[
								s.frame,
								row.kept
									? {
											borderColor: frame,
											...(!onFill && {
												shadowColor: tone.fill,
												shadowOpacity: 0.6,
												shadowRadius: 12,
												shadowOffset: { width: 0, height: 0 }
											})
										}
									: { borderColor: 'transparent' }
							]}
						>
							{row.tiles.map((tile, i) => {
								const box = {
									width: tileW,
									height: tileW * aspect,
									marginRight: i === n - 1 ? 0 : GAP
								}
								return typeof tile === 'number' ? (
									<Image
										key={i}
										source={DEMO_PHOTOS[tile % DEMO_PHOTOS.length]}
										style={[s.tile, box]}
										contentFit="cover"
									/>
								) : (
									<Waiting
										key={i}
										initials={tile.waiting}
										style={box}
										color={onFill ? tone.onFill : tone.line}
									/>
								)
							})}
						</Animated.View>
					))
				: null}
		</View>
	)
}

function Waiting({
	initials,
	style,
	color
}: {
	initials: string
	style: { width: number; height: number; marginRight: number }
	color: string
}) {
	const reduced = useReducedMotion()
	const breath = useSharedValue(1)
	useEffect(() => {
		if (reduced) return
		breath.value = withRepeat(
			withTiming(0.4, { duration: PULSE_MS / 2, easing: Easing.inOut(Easing.sin) }),
			-1,
			true
		)
		return () => cancelAnimation(breath)
	}, [breath, reduced])
	const pulse = useAnimatedStyle(() => ({ opacity: breath.value }))
	return (
		<Animated.View style={[s.tile, s.dashed, style, { borderColor: color }, pulse]}>
			<Text variant="mono" style={{ color }}>
				{initials}
			</Text>
		</Animated.View>
	)
}

const s = StyleSheet.create({
	wrap: { width: '100%', gap: GAP + 2 },
	frame: { flexDirection: 'row', padding: FRAME - 1, borderWidth: 1, borderRadius: 7 },
	tile: { borderRadius: 4, overflow: 'hidden' },
	dashed: {
		borderWidth: 1.5,
		borderStyle: 'dashed',
		alignItems: 'center',
		justifyContent: 'center'
	}
})
