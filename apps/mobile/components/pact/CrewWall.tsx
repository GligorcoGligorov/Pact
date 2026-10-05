import { useEffect } from 'react'
import { StyleSheet, View } from 'react-native'
import { Image } from 'expo-image'
import Animated, {
	Easing,
	useAnimatedStyle,
	useSharedValue,
	withDelay,
	withSequence,
	withSpring,
	withTiming
} from 'react-native-reanimated'
import type { TodayBoard } from '@app/contract'
import { Text } from '@/components/ui/Text'
import { useTheme } from '@/contexts/ThemeContext'
import { haptic } from '@/lib/haptics'
import { Springs, useReducedMotion } from '@/lib/motion'
import { CELEBRATION } from '@/lib/streaks'
import { Avatar, displayName } from './Avatars'

type BoardMember = TodayBoard['members'][number]

const TILE_W = 54
const PHOTO_H = 56
/** Each polaroid sits a little crooked, the same way every time for the same slot. */
const TILTS = [-4, 3, -2, 5, -5, 2, -3, 4]
/** Where the flying polaroid starts, relative to its slot: up where the big photo is, and bigger. */
const FLY_FROM = { y: -320, scale: 3.2, rotate: -10 }

/**
 * Today's crew wall: a polaroid per member held today. Your photo flies off the big print and
 * lands in your slot once the verdict is in (within 400ms, lib/streaks' CELEBRATION); whoever
 * is in shows a checked print, whoever isn't, their breathing ring. Under Reduce Motion your
 * print is simply there.
 */
export function CrewWall({
	members,
	myId,
	photoUri,
	land,
	delayMs = 0
}: {
	members: BoardMember[]
	myId: string | null
	photoUri: string
	/** True once the verdict is in: the moment your print flies. */
	land: boolean
	/** Waits out the entrance of whatever holds the wall, so the flight is seen. */
	delayMs?: number
}) {
	// You first, then whoever's in, then whoever isn't.
	const order = [...members].sort(
		(a, b) =>
			Number(b.user_id === myId) - Number(a.user_id === myId) ||
			Number(a.state === 'out') - Number(b.state === 'out')
	)
	return (
		<View style={s.wall} accessibilityLabel="Today's crew wall">
			{order.map((m, i) => (
				<Slot
					key={m.user_id}
					member={m}
					tilt={TILTS[i % TILTS.length]!}
					mine={m.user_id === myId}
					photoUri={photoUri}
					land={land}
					delayMs={delayMs}
				/>
			))}
		</View>
	)
}

function Slot({
	member,
	tilt,
	mine,
	photoUri,
	land,
	delayMs
}: {
	member: BoardMember
	tilt: number
	mine: boolean
	photoUri: string
	land: boolean
	delayMs: number
}) {
	const { colors: c, elevation } = useTheme()
	const name = displayName(member)
	const inToday = member.state !== 'out'
	return (
		<View style={s.slot}>
			{mine ? (
				<FlyingPrint uri={photoUri} tilt={tilt} land={land} delayMs={delayMs} />
			) : (
				<View
					style={[
						s.print,
						{ backgroundColor: c.surface, transform: [{ rotate: `${tilt}deg` }] },
						inToday ? elevation.card : { borderColor: c.borderSoft, borderWidth: 1 },
						!inToday && s.empty
					]}
				>
					<View style={[s.photo, s.face, { backgroundColor: inToday ? c.surface2 : c.well }]}>
						<Avatar userId={member.user_id} name={name} state={member.state} size={34} />
					</View>
				</View>
			)}
			<Text variant="caption" tone="secondary" numberOfLines={1} style={s.name}>
				{mine ? 'You' : name.split(' ')[0]}
			</Text>
		</View>
	)
}

function FlyingPrint({
	uri,
	tilt,
	land,
	delayMs
}: {
	uri: string
	tilt: number
	land: boolean
	delayMs: number
}) {
	const { colors: c, elevation } = useTheme()
	const reduced = useReducedMotion()
	const t = useSharedValue(reduced ? 1 : 0)
	const shown = useSharedValue(reduced ? 1 : 0)

	useEffect(() => {
		if (!land || reduced) return
		shown.value = withDelay(delayMs, withTiming(1, { duration: 1 }))
		// Flies in on an ease-out, then the pop spring settles it into the slot.
		t.value = withDelay(
			delayMs,
			withSequence(
				withTiming(0.92, { duration: CELEBRATION.landMs - 80, easing: Easing.out(Easing.cubic) }),
				withSpring(1, Springs.pop)
			)
		)
		const timer = setTimeout(() => haptic.snap(), delayMs + CELEBRATION.landMs - 80)
		return () => clearTimeout(timer)
	}, [delayMs, land, reduced, shown, t])

	const fly = useAnimatedStyle(() => {
		const k = 1 - t.value
		return {
			opacity: shown.value,
			transform: [
				{ translateY: FLY_FROM.y * k },
				{ scale: 1 + (FLY_FROM.scale - 1) * k },
				{ rotate: `${tilt + (FLY_FROM.rotate - tilt) * k}deg` }
			]
		}
	})

	return (
		<View>
			{/* The empty slot your print lands in. */}
			<View style={[s.print, s.empty, { borderColor: c.borderSoft, borderWidth: 1 }]}>
				<View style={[s.photo, { backgroundColor: c.well }]} />
			</View>
			<Animated.View
				style={[s.print, s.flying, { backgroundColor: c.surface }, elevation.raised, fly]}
			>
				<Image source={{ uri }} style={s.photo} contentFit="cover" />
			</Animated.View>
		</View>
	)
}

const s = StyleSheet.create({
	wall: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' },
	slot: { width: TILE_W + 6, alignItems: 'center', gap: 6 },
	print: { width: TILE_W, padding: 4, paddingBottom: 12, borderRadius: 6 },
	flying: { position: 'absolute', top: 0, left: 0, zIndex: 2 },
	empty: { opacity: 0.85 },
	photo: { width: '100%', height: PHOTO_H, borderRadius: 3 },
	face: { alignItems: 'center', justifyContent: 'center' },
	name: { textAlign: 'center', maxWidth: TILE_W + 6 }
})
