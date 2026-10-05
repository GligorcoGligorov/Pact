import { useEffect, useRef } from 'react'
import { StyleSheet, View } from 'react-native'
import Animated, {
	cancelAnimation,
	Easing,
	useAnimatedStyle,
	useSharedValue,
	withRepeat,
	withSequence,
	withTiming
} from 'react-native-reanimated'
import { joinNames, stakeLine, type PactResult } from '@app/contract'
import { FadeSlideIn } from '@/components/motion/FadeSlideIn'
import { Pop } from '@/components/motion/Pop'
import { Avatar, displayName } from '@/components/pact/Avatars'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Text } from '@/components/ui/Text'
import { useTheme } from '@/contexts/ThemeContext'
import { crewTone } from '@/lib/crew'
import { haptic } from '@/lib/haptics'
import { useReducedMotion } from '@/lib/motion'
import { drumrollMs, REVEAL } from '@/lib/reveal'

export type RevealPhase = 'idle' | 'rolling' | 'revealed'

/**
 * The loser reveal: a card that asks who's on the hook, a short drumroll (a few quick beats,
 * each a light tap), then the answer: the loser's face and the stake said about them ("Dan buys
 * the coffees ☕"), or "Nobody pays, everybody wins". Playful, never mean: the line after it
 * is always on their side. Reduce Motion skips the drumroll and shows the answer at once.
 */
export function LoserReveal({
	result,
	stake,
	color,
	myId,
	phase,
	onPhase
}: {
	result: PactResult
	stake: string | null
	color: string
	myId: string | null
	phase: RevealPhase
	onPhase: (phase: RevealPhase) => void
}) {
	const { colors: c, elevation } = useTheme()
	const tone = crewTone(c, color)
	const reduceMotion = useReducedMotion()
	const timers = useRef<ReturnType<typeof setTimeout>[]>([])

	useEffect(() => () => timers.current.forEach(clearTimeout), [])

	function reveal() {
		if (reduceMotion) {
			haptic.success()
			return onPhase('revealed')
		}
		onPhase('rolling')
		for (let beat = 0; beat < REVEAL.beats; beat++) {
			timers.current.push(setTimeout(() => haptic.press(), beat * REVEAL.beatMs))
		}
		timers.current.push(
			setTimeout(() => {
				haptic.success()
				onPhase('revealed')
			}, drumrollMs)
		)
	}

	if (phase !== 'revealed') {
		return (
			<Card padding="spacious" style={[s.card, elevation.card]}>
				<Drum rolling={phase === 'rolling'} />
				<Text variant="h2" style={s.center}>
					{phase === 'rolling' ? 'Drumroll…' : stake ? "Who's on the hook?" : 'Who came last?'}
				</Text>
				{stake ? (
					<Text variant="body" tone="secondary" style={s.center}>
						The stake: {stake}
					</Text>
				) : null}
				<Button
					label={phase === 'rolling' ? 'And it’s…' : 'Reveal'}
					size="lg"
					fullWidth
					haptic="snap"
					disabled={phase === 'rolling'}
					onPress={reveal}
					accessibilityHint="Shows who owes the stake"
				/>
			</Card>
		)
	}

	const losers = result.members.filter((m) => m.is_loser)
	const nobody = result.outcome !== 'loser' || losers.length === 0
	const faces = nobody ? result.members : losers
	const names = losers.map((m) => (m.user_id === myId ? 'You' : displayName(m)))
	const perfect = result.members.every((m) => m.days_done === m.days_held)

	let headline: string
	let line: string
	if (nobody) {
		headline = 'Nobody pays, everybody wins 🎉'
		line = perfect
			? 'Every single day, kept by every single one of you. Frame this.'
			: 'All tied up. Nobody can claim the high ground, so nobody pays.'
	} else {
		const you = names.length === 1 && names[0] === 'You'
		headline = stakeLine(names, stake)
		line =
			losers.length > 1
				? `Tied at the bottom: ${joinNames(names)} split it, fair and square 🤝`
				: `${losers[0].days_done} of ${losers[0].days_held} days. Next round is ${you ? 'yours' : `${names[0]}'s`} 💪`
	}

	return (
		<Card
			padding="spacious"
			style={[s.card, elevation.card, { borderColor: tone.fill, borderWidth: 2 }]}
			accessibilityLiveRegion="polite"
		>
			<View style={s.faces}>
				{faces.map((m, i) => (
					<Pop key={m.user_id} delay={i * 50} style={i > 0 ? s.overlap : undefined}>
						<Avatar userId={m.user_id} name={displayName(m)} size={nobody ? 56 : 84} />
						{nobody ? null : (
							// A sticker, slapped on a beat after the face lands.
							<Pop delay={180 + i * 50} style={s.sticker}>
								<Text style={s.stickerEmoji} accessibilityElementsHidden>
									😅
								</Text>
							</Pop>
						)}
					</Pop>
				))}
			</View>
			<FadeSlideIn index={1}>
				<Text variant="h1" style={s.center}>
					{headline}
				</Text>
			</FadeSlideIn>
			<FadeSlideIn index={2}>
				<Text variant="body" tone="secondary" style={s.center}>
					{line}
				</Text>
			</FadeSlideIn>
		</Card>
	)
}

/** 🥁, hit on every beat while rolling; still otherwise. */
function Drum({ rolling }: { rolling: boolean }) {
	const hit = useSharedValue(0)
	useEffect(() => {
		if (!rolling) return
		const up = { duration: REVEAL.beatUpMs, easing: Easing.out(Easing.quad) }
		const down = { duration: REVEAL.beatMs - REVEAL.beatUpMs, easing: Easing.in(Easing.quad) }
		hit.value = withRepeat(withSequence(withTiming(1, up), withTiming(0, down)), REVEAL.beats)
		return () => cancelAnimation(hit)
	}, [hit, rolling])
	const style = useAnimatedStyle(() => ({
		transform: [{ scale: 1 + 0.18 * hit.value }, { rotate: `${-8 * hit.value}deg` }]
	}))
	return (
		<Animated.Text style={[s.drum, style]} allowFontScaling={false} accessibilityElementsHidden>
			🥁
		</Animated.Text>
	)
}

const s = StyleSheet.create({
	card: { alignItems: 'center', gap: 14 },
	center: { textAlign: 'center' },
	drum: { fontSize: 56, lineHeight: 68 },
	faces: { flexDirection: 'row', justifyContent: 'center', marginBottom: 4 },
	overlap: { marginLeft: -12 },
	sticker: { position: 'absolute', right: -10, top: -6, transform: [{ rotate: '14deg' }] },
	stickerEmoji: { fontSize: 34, lineHeight: 42 }
})
