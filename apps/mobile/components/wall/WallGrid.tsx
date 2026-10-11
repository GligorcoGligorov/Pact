import { useEffect, useState } from 'react'
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native'
import { Image } from 'expo-image'
import Animated, {
	cancelAnimation,
	Easing,
	FadeIn,
	useAnimatedStyle,
	useSharedValue,
	withRepeat,
	withTiming
} from 'react-native-reanimated'
import type { CrewTone } from '@app/brand'
import type { Wall, WallCell, WallDay } from '@app/contract'
import { PressableScale } from '@/components/motion/PressableScale'
import { Text } from '@/components/ui/Text'
import { useColors } from '@/contexts/ThemeContext'
import { useReducedMotion } from '@/lib/motion'
import { getInitials } from '@/lib/utils'

/** Gap between tiles, and between rows. */
const GAP = 4
const ROW_GAP = 10
/** The day label's column. */
const LABEL_W = 30
/** A kept row's frame: its padding inside the crew-colour border. */
const FRAME = 3
/** An empty tile today breathes on this period. */
const PULSE_MS = 1600
/** Rows fade in one after another on open, capped so a long pact doesn't wait. */
const ROW_STAGGER_MS = 40
const STAGGER_CAP = 8

export type OpenTile = { day: WallDay; cell: WallCell; name: string; dayNumber: number }

/**
 * The Crew Wall: Pact's signature. The crew's real check-in photos as a grid, one column per
 * member and one row per day, newest on top. A row where everyone held was in is a kept day: it
 * gets a frame in the crew's colour and a soft glow. A held member with no photo is a dashed
 * tile with their initials, breathing on today's row ("waiting on"). A saver is an ink tile.
 * Tap a photo to open it.
 *
 * `mini` is home's card: the last few days, small square tiles, no names, no taps.
 */
export function WallGrid({
	wall,
	myId,
	tone,
	mini,
	rows,
	onOpen
}: {
	wall: Wall
	myId: string | null
	tone: CrewTone
	mini?: boolean
	/** How many days to show, newest first; all of them when left out. */
	rows?: number
	onOpen?: (tile: OpenTile) => void
}) {
	const c = useColors()
	const [width, setWidth] = useState(0)
	const onLayout = (e: LayoutChangeEvent) => setWidth(Math.round(e.nativeEvent.layout.width))

	const days = rows ? wall.days.slice(0, rows) : wall.days
	const n = Math.max(wall.members.length, 1)
	const label = mini ? 0 : LABEL_W
	// Every row reserves the frame, kept or not, so the columns line up.
	const inner = width - label - FRAME * 2 - (label > 0 ? GAP : 0)
	const tileW = width > 0 ? (inner - GAP * (n - 1)) / n : 0
	const tileH = mini ? tileW : tileW * (4 / 3)
	const total = wall.days.length
	const names = new Map(wall.members.map((m) => [m.user_id, m.display_name?.trim() || 'A member']))

	return (
		<View onLayout={onLayout} style={s.wrap}>
			{!mini && width > 0 ? (
				<View style={[s.row, { paddingLeft: label + GAP + FRAME, paddingRight: FRAME }]}>
					{wall.members.map((m) => (
						<Text
							key={m.user_id}
							variant="mono"
							tone="secondary"
							numberOfLines={1}
							style={{ width: tileW, marginRight: GAP }}
						>
							{m.user_id === myId ? 'You' : (names.get(m.user_id) ?? '').split(' ')[0]}
						</Text>
					))}
				</View>
			) : null}
			{width > 0
				? days.map((day, i) => {
						const dayNumber = total - i
						return (
							<Animated.View
								key={day.day}
								entering={FadeIn.delay(Math.min(i, STAGGER_CAP) * ROW_STAGGER_MS).duration(240)}
								style={[s.row, { marginTop: i === 0 && mini ? 0 : ROW_GAP - FRAME }]}
							>
								{label > 0 ? (
									<View style={[s.label, { width: label, marginRight: GAP }]}>
										<Text variant="mono" tone={day.status === 'open' ? 'primary' : 'tertiary'}>
											{day.status === 'open' ? 'Now' : String(dayNumber).padStart(2, '0')}
										</Text>
									</View>
								) : null}
								<View
									style={[
										s.frame,
										day.kept
											? {
													borderColor: tone.fill,
													shadowColor: tone.fill,
													shadowOpacity: 0.55,
													shadowRadius: 10,
													shadowOffset: { width: 0, height: 0 }
												}
											: { borderColor: 'transparent' }
									]}
								>
									{day.cells.map((cell, j) => (
										<Tile
											key={cell.user_id}
											cell={cell}
											name={names.get(cell.user_id) ?? ''}
											today={day.status === 'open'}
											width={tileW}
											height={tileH}
											last={j === day.cells.length - 1}
											ground={c.surface2}
											onPress={
												onOpen && cell.check_in?.photo_url
													? () =>
															onOpen({
																day,
																cell,
																name:
																	cell.user_id === myId ? 'You' : (names.get(cell.user_id) ?? ''),
																dayNumber
															})
													: undefined
											}
										/>
									))}
								</View>
							</Animated.View>
						)
					})
				: null}
		</View>
	)
}

function Tile({
	cell,
	name,
	today,
	width,
	height,
	last,
	ground,
	onPress
}: {
	cell: WallCell
	name: string
	today: boolean
	width: number
	height: number
	last: boolean
	ground: string
	onPress?: () => void
}) {
	const c = useColors()
	const box = { width, height, marginRight: last ? 0 : GAP }
	const checkIn = cell.check_in

	if (!cell.held) return <View style={box} />

	if (!checkIn) {
		return <WaitingTile name={name} today={today} style={box} />
	}

	if (checkIn.kind === 'saver' || !checkIn.photo_url) {
		return (
			<View
				style={[s.tile, s.center, box, { backgroundColor: ground }]}
				accessibilityLabel={`${name}: ${checkIn.kind === 'saver' ? 'saver' : 'photo hidden'}`}
			>
				<Text variant="mono" tone="secondary">
					{checkIn.kind === 'saver' ? 'Saver' : 'Hidden'}
				</Text>
			</View>
		)
	}

	const photo = (
		<View style={[s.tile, box, { backgroundColor: ground }]}>
			<Image
				source={{ uri: checkIn.photo_url }}
				style={StyleSheet.absoluteFill}
				contentFit="cover"
				transition={160}
				recyclingKey={checkIn.id}
			/>
			{checkIn.verdict === 'suspicious' ? (
				<View style={[s.flag, { backgroundColor: c.warning }]}>
					<Text variant="mono" style={{ color: c.onWarning, fontSize: 9, lineHeight: 12 }}>
						Flag
					</Text>
				</View>
			) : null}
		</View>
	)
	return onPress ? (
		<PressableScale
			scaleTo="card"
			haptic="press"
			onPress={onPress}
			accessibilityRole="imagebutton"
			accessibilityLabel={`${name}'s photo${checkIn.ai_caption ? `: ${checkIn.ai_caption}` : ''}`}
		>
			{photo}
		</PressableScale>
	) : (
		photo
	)
}

/** A held member with no photo: a dashed tile with their initials, breathing while today is open. */
function WaitingTile({
	name,
	today,
	style
}: {
	name: string
	today: boolean
	style: { width: number; height: number; marginRight: number }
}) {
	const c = useColors()
	const reduced = useReducedMotion()
	const breath = useSharedValue(1)
	useEffect(() => {
		if (!today || reduced) {
			cancelAnimation(breath)
			breath.value = 1
			return
		}
		breath.value = withRepeat(
			withTiming(0.4, { duration: PULSE_MS / 2, easing: Easing.inOut(Easing.sin) }),
			-1,
			true
		)
		return () => cancelAnimation(breath)
	}, [breath, today, reduced])
	const pulse = useAnimatedStyle(() => ({ opacity: breath.value }))
	return (
		<Animated.View
			style={[s.tile, s.center, s.dashed, style, { borderColor: c.borderActive }, pulse]}
			accessibilityLabel={`${name}: ${today ? 'not in yet' : 'missed'}`}
		>
			<Text variant="mono" tone={today ? 'secondary' : 'tertiary'}>
				{getInitials(name)}
			</Text>
		</Animated.View>
	)
}

const s = StyleSheet.create({
	wrap: { width: '100%' },
	row: { flexDirection: 'row', alignItems: 'center' },
	label: { alignItems: 'flex-start' },
	frame: {
		flexDirection: 'row',
		padding: FRAME - 1,
		borderWidth: 1,
		borderRadius: 7
	},
	tile: { borderRadius: 4, overflow: 'hidden' },
	center: { alignItems: 'center', justifyContent: 'center' },
	dashed: { borderWidth: 1.5, borderStyle: 'dashed' },
	flag: { position: 'absolute', left: 4, top: 4, borderRadius: 2, paddingHorizontal: 3 }
})
