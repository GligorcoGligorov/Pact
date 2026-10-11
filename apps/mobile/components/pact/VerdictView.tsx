import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { Image } from 'expo-image'
import Animated, {
	Easing,
	FadeIn,
	useAnimatedStyle,
	useSharedValue,
	withDelay,
	withSequence,
	withTiming
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { TodayBoard, Verdict, Wall } from '@app/contract'
import { Button } from '@/components/ui/Button'
import { Text } from '@/components/ui/Text'
import { useColors } from '@/contexts/ThemeContext'
import { crewTone } from '@/lib/crew'
import { haptic } from '@/lib/haptics'
import { useReducedMotion } from '@/lib/motion'
import { CELEBRATION } from '@/lib/streaks'
import { WallGrid } from '@/components/wall/WallGrid'
import { crewLine } from './Avatars'
import { CrewHero, OnFill } from './CrewHero'

/** What shows in the caption's place when the AI has no caption (R14, R16). */
const FALLBACK: Record<Exclude<Verdict, 'pass' | 'suspicious'>, string> = {
	pending: 'The judge is still thinking. Your check-in counts either way.',
	error: "The AI judge couldn't look at this one. Your check-in still counts.",
	not_configured: 'AI judge not configured.',
	skipped: 'No AI judge on this one, as you chose.'
}

/** The photo lands on the wall once the block is in and the eye has read the verdict. */
const LAND_DELAY_MS = 700
/** The big print dips, like a send, as its tile pops in on the wall. */
const FLY_MS = 300

export interface VerdictProgress {
	/** The pact day this check-in is for, counted from 1. */
	dayNumber: number | null
	/** Everyone held today is in, so the day is kept. */
	dayKept: boolean
	streakBefore: number
	streakAfter: number
	board: TodayBoard | null
	myId: string | null
	/** The crew's colour key, for the block. */
	color: string | null
	/** The Crew Wall as read after this check-in. */
	wall: Wall | null
}

/**
 * The verdict, on the crew's colour: the photo, the day and the AI's line as a two-tone
 * headline, the streak. Below, today's row of the Crew Wall with this check-in's tile still
 * waiting; then the photo lands: the big print dips like a send, its tile pops in
 * with a haptic, and if it completed the row the row lights up as a kept day, with the success
 * haptic. A suspicious one says so in mono and still counts (R15).
 */
export function VerdictView({
	photoUri,
	verdict,
	caption,
	reason,
	progress,
	onDone,
	onViewed
}: {
	photoUri: string
	/** `undefined` while judging; `pending` once the wait has run out. */
	verdict: Verdict | undefined
	caption: string | null
	reason: string | null
	progress: VerdictProgress
	onDone: () => void
	/** Once, when a verdict first shows. */
	onViewed: (verdict: Verdict) => void
}) {
	const c = useColors()
	const insets = useSafeAreaInsets()
	const reduced = useReducedMotion()
	const judging = verdict === undefined
	const viewed = useRef(false)
	const tone = crewTone(c, progress.color ?? '')
	const [landed, setLanded] = useState(false)

	useEffect(() => {
		if (!verdict || viewed.current) return
		viewed.current = true
		onViewed(verdict)
		if (verdict === 'suspicious') haptic.warning()
	}, [verdict, onViewed])

	// The landing: once judged and the wall is in, the photo flies into its tile.
	const fly = useSharedValue(0)
	const canLand = !judging && !!progress.wall && !!progress.myId
	useEffect(() => {
		if (!canLand || landed) return
		const timer = setTimeout(
			() => {
				setLanded(true)
				haptic.snap()
				if (progress.dayKept) setTimeout(() => haptic.success(), CELEBRATION.landMs / 2)
			},
			reduced ? 0 : LAND_DELAY_MS
		)
		if (!reduced) {
			// The print starts shrinking just before its tile pops, so the two read as one move.
			fly.value = withDelay(
				LAND_DELAY_MS - FLY_MS / 2,
				withSequence(
					withTiming(1, { duration: FLY_MS / 2, easing: Easing.in(Easing.cubic) }),
					withTiming(0, { duration: FLY_MS / 2, easing: Easing.out(Easing.cubic) })
				)
			)
		}
		return () => clearTimeout(timer)
		// The landing runs once.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [canLand])
	const printStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 - 0.05 * fly.value }] }))

	const isFlag = verdict === 'suspicious'
	const day = progress.dayNumber ? `Day ${progress.dayNumber}` : 'Today'
	const title = !isFlag && progress.dayKept ? `${day} kept.` : `${day}. You’re in.`
	const fallback = verdict && verdict !== 'pass' && !isFlag ? FALLBACK[verdict] : null
	const line = caption ? `“${caption}”` : (fallback ?? '')
	const board = progress.board
	const pad = (n: number) => String(n).padStart(2, '0')

	return (
		<View
			style={[
				s.root,
				{
					backgroundColor: tone.deep,
					paddingTop: insets.top + 16,
					paddingBottom: insets.bottom + 12
				}
			]}
		>
			<CrewHero tone={tone} compact glow>
				<View style={s.metaRow}>
					<OnFill tone={tone} muted variant="mono">
						{judging ? 'Judging…' : isFlag ? 'Flagged · still counts' : 'Checked in'}
					</OnFill>
					{judging ? (
						<ActivityIndicator color={tone.onFill} />
					) : (
						<OnFill tone={tone} muted variant="mono">
							{progress.streakAfter > progress.streakBefore
								? `Streak ${pad(progress.streakBefore)} → ${pad(progress.streakAfter)}`
								: `Streak ${pad(progress.streakAfter)}`}
						</OnFill>
					)}
				</View>
				<Animated.View style={printStyle}>
					<Image source={{ uri: photoUri }} style={s.photo} contentFit="cover" />
				</Animated.View>
				{judging ? null : (
					<Animated.View entering={FadeIn.duration(CELEBRATION.landMs)} style={s.copy}>
						<OnFill tone={tone} variant="h1">
							{title}
						</OnFill>
						{line ? (
							<OnFill tone={tone} muted variant="h2" numberOfLines={3}>
								{line}
							</OnFill>
						) : null}
						{reason ? (
							<OnFill tone={tone} muted variant="bodySm" numberOfLines={2}>
								{reason}
							</OnFill>
						) : null}
					</Animated.View>
				)}
			</CrewHero>

			{!judging && progress.wall && progress.wall.days.length > 0 ? (
				<Animated.View entering={FadeIn.delay(CELEBRATION.landMs)} style={s.wall}>
					<Text variant="mono" tone="secondary">
						{board && board.members.length > 1
							? crewLine(board.members, progress.myId)
							: 'Today on the wall'}
					</Text>
					<WallGrid
						wall={progress.wall}
						myId={progress.myId}
						tone={tone}
						rows={1}
						pending={landed ? null : progress.myId}
						landed={landed ? progress.myId : null}
					/>
				</Animated.View>
			) : null}

			<View style={s.footer}>
				<Button label="Done" size="lg" fullWidth onPress={onDone} disabled={judging} />
			</View>
		</View>
	)
}

const s = StyleSheet.create({
	root: { flex: 1, paddingHorizontal: 16, gap: 24 },
	metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
	photo: { width: '100%', aspectRatio: 4 / 3, borderRadius: 4 },
	copy: { gap: 4 },
	wall: { gap: 12 },
	footer: { marginTop: 'auto' }
})
