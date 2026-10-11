import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { Image } from 'expo-image'
import Animated, { FadeIn } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { CrewTone } from '@app/brand'
import type { TodayBoard, Verdict } from '@app/contract'
import { CountUp } from '@/components/motion/CountUp'
import { Button } from '@/components/ui/Button'
import { Text } from '@/components/ui/Text'
import { useColors } from '@/contexts/ThemeContext'
import { crewTone } from '@/lib/crew'
import { haptic } from '@/lib/haptics'
import { CELEBRATION } from '@/lib/streaks'
import { crewLine } from './Avatars'
import { Chain, type Tile } from './Chain'
import { CrewHero, OnFill } from './CrewHero'
import { CrewWall } from './CrewWall'

/** What shows in the caption's place when the AI has no caption (R14, R16). */
const FALLBACK: Record<Exclude<Verdict, 'pass' | 'suspicious'>, string> = {
	pending: 'The judge is still thinking. Your check-in counts either way.',
	error: "The AI judge couldn't look at this one. Your check-in still counts.",
	not_configured: 'AI judge not configured.',
	skipped: 'No AI judge on this one, as you chose.'
}

/** The print's tilt; the flight to the wall starts at it. None: the print sits square. */
const PRINT_TILT = 0

/** The print flies to the wall once the block is in. */
const WALL_FLIGHT_DELAY_MS = 480

/** Today's link waits for the block to land, then moves to where this check-in leaves it. */
const LINK_DELAY_MS = 420

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
	/** The chain through the end day, today open. */
	tiles: Tile[]
}

/**
 * The verdict: one block in the crew's colour with the photo square on it, the day and the AI's
 * line as a two-tone headline, and the chain. Today's link starts where it stood before this
 * check-in and moves to where it stands now; if this check-in closed the day, the link snaps
 * shut with the haptic and the halo pulse, and that is the celebration. Below, on paper, your
 * print flies onto the crew wall. A suspicious one says so in mono and still counts (R15).
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
	const judging = verdict === undefined
	const viewed = useRef(false)
	const print = useRef<View>(null)
	const tone = crewTone(c, progress.color ?? '')

	useEffect(() => {
		if (!verdict || viewed.current) return
		viewed.current = true
		onViewed(verdict)
		if (verdict === 'suspicious') haptic.warning()
		else if (verdict !== 'pass') haptic.snap()
		// A pass's haptic is the chain's: it fires when today's link closes, or as a success here.
		else if (!progress.dayKept) haptic.success()
	}, [verdict, onViewed, progress.dayKept])

	const isFlag = verdict === 'suspicious'
	const day = progress.dayNumber ? `Day ${progress.dayNumber}` : 'Today'
	const title = !isFlag && progress.dayKept ? `${day} kept.` : `${day}. You’re in.`
	const fallback = verdict && verdict !== 'pass' && !isFlag ? FALLBACK[verdict] : null
	const line = caption ? `“${caption}”` : (fallback ?? '')
	const board = progress.board

	// Today's link: one short of now (this check-in) until the block has landed, then now.
	const [moved, setMoved] = useState(false)
	useEffect(() => {
		if (judging || !board) return
		const timer = setTimeout(() => setMoved(true), LINK_DELAY_MS)
		return () => clearTimeout(timer)
	}, [judging, board])
	const today =
		board && board.held_count > 0
			? { in: moved ? board.in_count : Math.max(0, board.in_count - 1), held: board.held_count }
			: undefined

	return (
		<View style={[s.root, { backgroundColor: c.bg, paddingTop: insets.top + 16 }]}>
			<CrewHero tone={tone} compact>
				<View style={s.metaRow}>
					<OnFill tone={tone} muted variant="mono">
						{judging ? 'Judging…' : isFlag ? 'Flagged · still counts' : 'Checked in'}
					</OnFill>
					{judging ? <ActivityIndicator color={tone.onFill} /> : null}
				</View>
				<View ref={print} collapsable={false} style={s.printSlot}>
					<Image source={{ uri: photoUri }} style={s.photo} contentFit="cover" />
				</View>
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
				{progress.tiles.length > 0 && !judging ? (
					<Chain
						tiles={progress.tiles}
						size="small"
						colors={{ ink: tone.onFill, track: tone.onFillTrack, glow: tone.glow }}
						today={today}
					/>
				) : null}
				{!judging ? (
					<Streak tone={tone} before={progress.streakBefore} after={progress.streakAfter} />
				) : null}
			</CrewHero>

			{!judging && board && board.members.length > 0 ? (
				<Animated.View entering={FadeIn.delay(CELEBRATION.landMs)} style={s.crew}>
					<CrewWall
						members={board.members}
						myId={progress.myId}
						photoUri={photoUri}
						land={!judging}
						delayMs={WALL_FLIGHT_DELAY_MS}
						from={print}
						fromTilt={PRINT_TILT}
					/>
					{board.members.length > 1 ? (
						<Text variant="mono" tone="secondary" style={s.center} numberOfLines={2}>
							{crewLine(board.members, progress.myId)}
						</Text>
					) : null}
				</Animated.View>
			) : null}

			<View style={[s.footer, { paddingBottom: insets.bottom + 12 }]}>
				<Button label="Done" size="lg" fullWidth onPress={onDone} disabled={judging} />
			</View>
		</View>
	)
}

/** "STREAK 05 → 06", the new number counting up once this check-in kept the day. */
function Streak({ tone, before, after }: { tone: CrewTone; before: number; after: number }) {
	const pad = (n: number) => String(n).padStart(2, '0')
	return (
		<View style={[s.streak, { borderTopColor: tone.onFillTrack }]}>
			<OnFill tone={tone} muted variant="mono">
				Streak
			</OnFill>
			<View style={s.streakNumbers}>
				{after > before ? (
					<OnFill tone={tone} muted variant="h2">
						{`${pad(before)} →`}
					</OnFill>
				) : null}
				<CountUp value={after} format={pad} color={tone.onFill} />
			</View>
		</View>
	)
}

const s = StyleSheet.create({
	root: { flex: 1, paddingHorizontal: 16, gap: 24 },
	metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
	printSlot: { width: '100%' },
	photo: { width: '100%', aspectRatio: 4 / 3, borderRadius: 4 },
	copy: { gap: 4 },
	center: { textAlign: 'center' },
	streak: {
		flexDirection: 'row',
		alignItems: 'baseline',
		justifyContent: 'space-between',
		paddingTop: 12,
		borderTopWidth: StyleSheet.hairlineWidth
	},
	streakNumbers: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
	crew: { gap: 12 },
	footer: { marginTop: 'auto' }
})
