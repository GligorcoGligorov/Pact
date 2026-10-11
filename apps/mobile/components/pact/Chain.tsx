import { useEffect, useRef, useState } from 'react'
import { View, type LayoutChangeEvent } from 'react-native'
import Animated, {
	Easing,
	cancelAnimation,
	useAnimatedProps,
	useAnimatedStyle,
	useSharedValue,
	withDelay,
	withRepeat,
	withSequence,
	withTiming
} from 'react-native-reanimated'
import Svg, { Rect } from 'react-native-svg'
import type { DayStatus } from '@app/contract'
import { haptic } from '@/lib/haptics'
import { useReducedMotion } from '@/lib/motion'
import { CELEBRATION } from '@/lib/streaks'
import { addIsoDays } from '@/lib/pacts'

export type Tile = { day: string; status: DayStatus | 'future' }

const WEEKEND = new Set([0, 6])

function weekdayOf(iso: string): number {
	return new Date(`${iso}T12:00:00Z`).getUTCDay()
}

/** The chain plus the pact days still to come, through the end day (all of them in the lobby). */
export function chainTiles(
	chain: { day: string; status: DayStatus }[],
	startDay: string,
	endDay: string,
	cadence: 'daily' | 'weekdays'
): Tile[] {
	const tiles: Tile[] = [...chain]
	let day = chain.length > 0 ? addIsoDays(chain[chain.length - 1].day, 1) : startDay
	while (day <= endDay) {
		if (cadence === 'daily' || !WEEKEND.has(weekdayOf(day))) tiles.push({ day, status: 'future' })
		day = addIsoDays(day, 1)
	}
	return tiles
}

/** Each link starts this fraction of a link's width after the one before: they interlock. */
const STEP = 0.6
/** Every other link is seen edge-on, as a slim bar: this much of a face-on link's height. */
const EDGE = 0.36
/** Link height over width. */
const ASPECT = 0.62
/** The cut in a broken link, as a fraction of its perimeter (twice: top and bottom). */
const CUT = 0.07

const SIZES = {
	/** Links on show, links before today, the largest link, stroke over width. */
	hero: { count: 9, back: 5, maxW: 76, stroke: 0.11 },
	small: { count: 9, back: 5, maxW: 34, stroke: 0.12 }
} as const

/** The entrance: each link draws in this long, this far after the one before. */
const DRAW_MS = 240
const STAGGER_MS = 60
/** Today's link breathes on this period while it's still open. */
const BREATHE_MS = 1600

/** Perimeter of a stadium (a rect with fully rounded ends). */
function perimeter(w: number, h: number): number {
	return 2 * (w - h) + Math.PI * h
}

/** Where the window of days on show starts: a few behind today, today, the days to come. */
export function chainWindow(tiles: Tile[], count: number, back: number): number {
	const openAt = tiles.findIndex((t) => t.status === 'open')
	if (openAt >= 0) return Math.max(0, Math.min(openAt - back, tiles.length - count))
	const firstFuture = tiles.findIndex((t) => t.status === 'future')
	if (firstFuture === 0) return 0
	// Finished, or between days: end on the last day that happened.
	const last = firstFuture < 0 ? tiles.length : firstFuture
	return Math.max(0, last - count)
}

const AnimatedRect = Animated.createAnimatedComponent(Rect)

export type ChainColors = {
	/** The links. On a crew fill, its `onFill`. */
	ink: string
	/** Today's link before anyone is in. */
	track: string
	/** A halo around the links; none when left out. */
	glow?: string
}

/**
 * Pact's signature: the chain. One link per pact day, interlocking, as one row around today.
 * Kept days are closed links; a missed day is a cut link; the days to come are the same chain
 * fading out. On open the links draw in one by one. Today's link breathes while it's open and
 * draws closed as the crew checks in (`today.in` of `today.held`); when it closes it snaps shut
 * with a haptic and a pulse of the halo. That moment is the celebration.
 */
export function Chain({
	tiles,
	colors,
	today,
	size = 'hero'
}: {
	tiles: Tile[]
	colors: ChainColors
	today?: { in: number; held: number }
	size?: keyof typeof SIZES
}) {
	const spec = SIZES[size]
	const reduced = useReducedMotion()
	const [width, setWidth] = useState(0)
	const onLayout = (e: LayoutChangeEvent) => setWidth(Math.round(e.nativeEvent.layout.width))

	const start = chainWindow(tiles, spec.count, spec.back)
	const shown = tiles.slice(start, start + spec.count)
	const n = shown.length
	const w = width > 0 ? Math.min(width / (1 + (n - 1) * STEP), spec.maxW) : 0
	const h = w * ASPECT
	const stroke = Math.max(2, w * spec.stroke)
	const firstFuture = shown.findIndex((t) => t.status === 'future')

	// Links alternate face-on and edge-on, phased so today's link faces the viewer; today's and a
	// broken link always do, since their state is the point.
	const openAt = shown.findIndex((t) => t.status === 'open')
	const phase = openAt >= 0 ? openAt % 2 : 0
	const edgeAt = (i: number) =>
		(i + phase) % 2 === 1 && shown[i]?.status !== 'open' && shown[i]?.status !== 'broken'

	// The halo pulses once, with a haptic, when today's link closes while the board is open.
	const fraction = today && today.held > 0 ? today.in / today.held : 0
	const glow = useSharedValue(0.55)
	const wasClosed = useRef<boolean | null>(null)
	useEffect(() => {
		const closed = fraction >= 1
		if (wasClosed.current === false && closed) {
			haptic.snap()
			if (!reduced) {
				glow.value = withSequence(
					withTiming(1, { duration: CELEBRATION.landMs / 2 }),
					withTiming(0.55, { duration: CELEBRATION.landMs / 2 })
				)
			}
		}
		wasClosed.current = closed
	}, [fraction, glow, reduced])
	const hasGlow = !!colors.glow
	const glowStyle = useAnimatedStyle(() => ({ shadowOpacity: hasGlow ? glow.value : 0 }))

	const kept = tiles.filter((t) => t.status === 'kept').length
	const broken = tiles.filter((t) => t.status === 'broken').length
	const label =
		`Chain: ${kept} of ${tiles.length} days kept` +
		(broken ? `, ${broken} broken` : '') +
		(today ? `. Today ${today.in} of ${today.held} in.` : '.')

	return (
		<View onLayout={onLayout} accessible accessibilityLabel={label}>
			{w > 0 ? (
				<Animated.View
					style={[
						{
							shadowColor: colors.glow ?? colors.ink,
							shadowOffset: { width: 0, height: 0 },
							shadowRadius: stroke * 2.2
						},
						glowStyle
					]}
				>
					<Svg width={w + (n - 1) * STEP * w + stroke} height={h + stroke}>
						{shown.map((tile, i) => (
							<Link
								key={tile.day}
								tile={tile}
								index={i}
								x={i * STEP * w + stroke / 2}
								w={w}
								h={h}
								edge={edgeAt(i)}
								stroke={stroke}
								colors={colors}
								fraction={fraction}
								// A day before the window fades in from the left; the days to come fade out.
								opacity={
									tile.status === 'future'
										? Math.max(0.08, 0.42 * 0.68 ** (i - firstFuture))
										: i === 0 && start > 0
											? 0.45
											: 1
								}
							/>
						))}
					</Svg>
				</Animated.View>
			) : null}
		</View>
	)
}

function Link({
	tile,
	index,
	x,
	w,
	h,
	edge,
	stroke,
	colors,
	fraction,
	opacity
}: {
	tile: Tile
	index: number
	x: number
	w: number
	h: number
	edge: boolean
	stroke: number
	colors: ChainColors
	fraction: number
	opacity: number
}) {
	const reduced = useReducedMotion()
	const lh = edge ? h * EDGE : h
	const y = (h - lh) / 2 + stroke / 2
	// Edge-on links are drawn a little finer, so the eye reads them as further away.
	const common = {
		x,
		y,
		width: w,
		height: lh,
		rx: lh / 2,
		fill: 'none',
		strokeWidth: edge ? stroke * 0.7 : stroke
	}
	const p = perimeter(w, lh)
	const target = tile.status === 'open' ? fraction : 1

	// How much of the link is drawn: 0 → its target, staggered down the chain on open.
	const drawn = useSharedValue(reduced ? target : 0)
	const mounted = useRef(false)
	useEffect(() => {
		if (reduced) {
			drawn.value = target
		} else if (!mounted.current) {
			drawn.value = withDelay(
				index * STAGGER_MS,
				withTiming(target, { duration: DRAW_MS, easing: Easing.out(Easing.cubic) })
			)
		} else {
			// A later change is today's link moving as someone checks in: it snaps the rest of the way.
			drawn.value = withTiming(target, {
				duration: CELEBRATION.landMs / 2,
				easing: Easing.out(Easing.back(1.6))
			})
		}
		mounted.current = true
	}, [drawn, index, reduced, target])

	// Today's track breathes while the link is still open.
	const breath = useSharedValue(1)
	const open = tile.status === 'open' && fraction < 1
	useEffect(() => {
		if (!open || reduced) {
			cancelAnimation(breath)
			breath.value = 1
			return
		}
		breath.value = withRepeat(
			withTiming(0.35, { duration: BREATHE_MS / 2, easing: Easing.inOut(Easing.sin) }),
			-1,
			true
		)
		return () => cancelAnimation(breath)
	}, [breath, open, reduced])

	const drawProps = useAnimatedProps(() => ({ strokeDashoffset: p * (1 - drawn.value) }))
	const fadeProps = useAnimatedProps(() => ({ opacity: opacity * drawn.value }))
	const breathProps = useAnimatedProps(() => ({ opacity: breath.value }))

	switch (tile.status) {
		case 'kept':
			return (
				<AnimatedRect
					{...common}
					stroke={colors.ink}
					opacity={opacity}
					strokeDasharray={[p, p]}
					animatedProps={drawProps}
				/>
			)
		case 'broken': {
			// Cut through at the top and the bottom: two halves that no longer hold.
			const gap = p * CUT
			const topCentre = (w - lh) / 2
			return (
				<AnimatedRect
					{...common}
					stroke={colors.ink}
					strokeDasharray={[p / 2 - gap, gap]}
					strokeDashoffset={p / 2 - gap / 2 - topCentre}
					animatedProps={fadeProps}
				/>
			)
		}
		case 'future':
			return <AnimatedRect {...common} stroke={colors.ink} animatedProps={fadeProps} />
		case 'open':
			return (
				<>
					<AnimatedRect {...common} stroke={colors.track} animatedProps={breathProps} />
					<AnimatedRect
						{...common}
						stroke={colors.ink}
						strokeDasharray={[p, p]}
						animatedProps={drawProps}
					/>
				</>
			)
	}
}
