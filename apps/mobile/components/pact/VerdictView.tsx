import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { Image } from 'expo-image'
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Check, Flame, Info, TriangleAlert } from 'lucide-react-native'
import type { TodayBoard, Verdict } from '@app/contract'
import { NumberTicker } from '@/components/motion/NumberTicker'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Text } from '@/components/ui/Text'
import { useTheme } from '@/contexts/ThemeContext'
import { haptic } from '@/lib/haptics'
import { AvatarStack, crewLine } from './Avatars'
import { Confetti } from './Confetti'

/** What shows in the caption's place when the AI has no caption (R14, R16). */
const FALLBACK: Record<Exclude<Verdict, 'pass' | 'suspicious'>, string> = {
	pending: 'The judge is still thinking. Your check-in counts either way.',
	error: "The AI judge couldn't look at this one. Your check-in still counts.",
	not_configured: 'AI judge not configured.',
	skipped: 'No AI judge on this one, as you chose.'
}

/** How long the streak waits before it ticks up, so the eye lands on it first. */
const STREAK_TICK_DELAY_MS = 700

export interface VerdictProgress {
	/** The pact day this check-in is for, counted from 1. */
	dayNumber: number | null
	/** Everyone held today is in, so the day is kept. */
	dayKept: boolean
	streakBefore: number
	streakAfter: number
	board: TodayBoard | null
	myId: string | null
}

/**
 * The verdict, in ref 01's style: a light page, the proof photo as a tilted polaroid (never
 * text over it), the day's result, the AI's caption, then the payoff: the streak ticking up and
 * the crew, with who is still to come. A pass gets confetti and a success haptic; a suspicious
 * one is amber, with no confetti, and still counts (R15).
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
	const { colors: c, elevation } = useTheme()
	const insets = useSafeAreaInsets()
	const judging = verdict === undefined
	const viewed = useRef(false)

	useEffect(() => {
		if (!verdict || viewed.current) return
		viewed.current = true
		onViewed(verdict)
		if (verdict === 'pass') haptic.success()
		else if (verdict === 'suspicious') haptic.warning()
		else haptic.snap()
	}, [verdict, onViewed])

	const isPass = verdict === 'pass'
	const isFlag = verdict === 'suspicious'
	const tone = isFlag
		? { fill: c.warning, on: c.onWarning, icon: TriangleAlert }
		: isPass
			? { fill: c.brandFill, on: c.onBrand, icon: Check }
			: { fill: c.surface3, on: c.textPrimary, icon: Info }
	const ToneIcon = tone.icon
	const day = progress.dayNumber ? `Day ${progress.dayNumber}` : 'Today'
	const title = !isFlag && progress.dayKept ? `${day} kept` : `${day} · you're in`
	const fallback = verdict && !isPass && !isFlag ? FALLBACK[verdict] : null

	return (
		<View style={[s.root, { backgroundColor: c.bg, paddingTop: insets.top + 28 }]}>
			{/* The entering animation owns the outer transform, so the tilt lives on the inner card. */}
			<Animated.View entering={ZoomIn.springify().damping(13)} style={s.polaroidSlot}>
				<View style={[s.polaroid, { backgroundColor: c.surface }, elevation.raised]}>
					<Image source={{ uri: photoUri }} style={s.photo} contentFit="cover" />
				</View>
			</Animated.View>

			{judging ? (
				<Animated.View entering={FadeIn.delay(150)} style={s.judging}>
					<View style={[s.judgingPill, { backgroundColor: c.surface2, borderColor: c.borderSoft }]}>
						<ActivityIndicator color={c.brandInk} />
						<Text variant="label" tone="secondary">
							Judging…
						</Text>
					</View>
				</Animated.View>
			) : (
				<View style={s.body}>
					<Animated.View entering={FadeInDown.delay(120).duration(360)} style={s.titleRow}>
						<View style={[s.tick, { backgroundColor: tone.fill }]}>
							<ToneIcon size={18} color={tone.on} strokeWidth={3} />
						</View>
						<Text variant="h1">{title}</Text>
					</Animated.View>

					<Animated.View entering={FadeInDown.delay(220).duration(380)} style={s.copy}>
						<Text variant="lead" tone="body" numberOfLines={3} style={s.caption}>
							{caption ? `“${caption}”` : (fallback ?? '')}
						</Text>
						{isFlag ? (
							<Text variant="bodySm" tone="warning" style={s.center}>
								Your crew will take a look. It still counts.
							</Text>
						) : null}
						{reason ? (
							<Text variant="caption" tone="tertiary" numberOfLines={2} style={s.center}>
								{reason}
							</Text>
						) : null}
					</Animated.View>

					<Animated.View entering={FadeInDown.delay(380).duration(400)}>
						<Card padding="normal" style={s.payoff}>
							<Streak before={progress.streakBefore} after={progress.streakAfter} />
							{progress.board && progress.board.members.length > 1 ? (
								<View style={[s.crew, { borderTopColor: c.borderHairline }]}>
									<AvatarStack members={progress.board.members} size={34} />
									<Text variant="bodySm" tone="secondary" style={s.crewText} numberOfLines={2}>
										{crewLine(progress.board.members, progress.myId)}
									</Text>
								</View>
							) : null}
						</Card>
					</Animated.View>
				</View>
			)}

			<Animated.View
				entering={FadeIn.delay(judging ? 0 : 520)}
				style={[s.footer, { paddingBottom: insets.bottom + 12 }]}
			>
				<Button label="Done" size="lg" fullWidth onPress={onDone} disabled={judging} />
			</Animated.View>

			{isPass ? <Confetti /> : null}
		</View>
	)
}

/** "5 → 6" when this check-in kept the day, ticking up; otherwise the streak as it stands. */
function Streak({ before, after }: { before: number; after: number }) {
	const { colors: c } = useTheme()
	const grew = after > before
	const [shown, setShown] = useState(before)
	useEffect(() => {
		if (!grew) return
		const timer = setTimeout(() => {
			setShown(after)
			haptic.select()
		}, STREAK_TICK_DELAY_MS)
		return () => clearTimeout(timer)
	}, [grew, after])

	const lit = after > 0
	return (
		<View style={s.streak}>
			<Flame
				size={30}
				color={lit ? c.warning : c.textDisabled}
				fill={lit ? c.warningSoft : 'none'}
				strokeWidth={2}
			/>
			{grew ? (
				<View style={s.streakNumbers}>
					<Text variant="h2" tone="tertiary" tabular>
						{before}
					</Text>
					<Text variant="h3" tone="tertiary">
						→
					</Text>
					<NumberTicker value={shown} variant="display" />
				</View>
			) : (
				<Text variant="display" tabular>
					{after}
				</Text>
			)}
			<View style={s.streakLabel}>
				<Text variant="label">day streak</Text>
				<Text variant="caption" tone="tertiary">
					{grew ? 'You kept it going.' : 'Grows when everyone’s in.'}
				</Text>
			</View>
		</View>
	)
}

const s = StyleSheet.create({
	root: { flex: 1, paddingHorizontal: 24 },
	polaroidSlot: { width: '60%', alignSelf: 'center' },
	polaroid: {
		padding: 10,
		paddingBottom: 32,
		borderRadius: 6,
		transform: [{ rotate: '-3deg' }]
	},
	photo: { width: '100%', aspectRatio: 4 / 5, borderRadius: 3 },
	judging: { flex: 1, alignItems: 'center', justifyContent: 'center' },
	judgingPill: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		paddingHorizontal: 18,
		paddingVertical: 12,
		borderRadius: 999,
		borderWidth: StyleSheet.hairlineWidth
	},
	body: { flex: 1, justifyContent: 'center', gap: 18 },
	titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
	tick: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
	copy: { gap: 8 },
	caption: { textAlign: 'center', fontStyle: 'italic' },
	center: { textAlign: 'center' },
	payoff: { gap: 14 },
	streak: { flexDirection: 'row', alignItems: 'center', gap: 10 },
	streakNumbers: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
	streakLabel: { flex: 1, gap: 2 },
	crew: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		paddingTop: 14,
		borderTopWidth: StyleSheet.hairlineWidth
	},
	crewText: { flex: 1 },
	footer: { paddingTop: 12 }
})
