import { useEffect, useRef, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import Animated, { Keyframe } from 'react-native-reanimated'
import { joinNames, stakeLine, type PactResult } from '@app/contract'
import { FadeSlideIn } from '@/components/motion/FadeSlideIn'
import { Pop } from '@/components/motion/Pop'
import { Avatar, displayName } from '@/components/pact/Avatars'
import { Button } from '@/components/ui/Button'
import { Text } from '@/components/ui/Text'
import { useColors } from '@/contexts/ThemeContext'
import { haptic } from '@/lib/haptics'
import { useReducedMotion } from '@/lib/motion'
import { drumrollMs, REVEAL } from '@/lib/reveal'

export type RevealPhase = 'idle' | 'rolling' | 'revealed'

/** Each beat's number drops in and settles inside the beat. */
const beatIn = new Keyframe({
	0: { opacity: 0, transform: [{ translateY: -16 }, { scale: 1.12 }] },
	100: { opacity: 1, transform: [{ translateY: 0 }, { scale: 1 }] }
}).duration(REVEAL.beatUpMs)

/**
 * The loser reveal, on paper inside an ink rule: who's on the hook, then a short drumroll (the
 * beats counting down in big tabular numbers, each a light tap), then the answer: the loser's
 * face and the stake said about them ("Dan buys the coffees"), or "Nobody pays". Playful, never
 * mean: the line after it is always on their side. Reduce Motion skips the drumroll.
 */
export function LoserReveal({
	result,
	stake,
	myId,
	phase,
	onPhase
}: {
	result: PactResult
	stake: string | null
	myId: string | null
	phase: RevealPhase
	onPhase: (phase: RevealPhase) => void
}) {
	const c = useColors()
	const reduceMotion = useReducedMotion()
	const timers = useRef<ReturnType<typeof setTimeout>[]>([])
	const [beat, setBeat] = useState(0)

	useEffect(() => () => timers.current.forEach(clearTimeout), [])

	function reveal() {
		if (reduceMotion) {
			haptic.success()
			return onPhase('revealed')
		}
		onPhase('rolling')
		for (let b = 0; b < REVEAL.beats; b++) {
			timers.current.push(
				setTimeout(() => {
					setBeat(b)
					haptic.press()
				}, b * REVEAL.beatMs)
			)
		}
		timers.current.push(
			setTimeout(() => {
				haptic.success()
				onPhase('revealed')
			}, drumrollMs)
		)
	}

	const frame = [s.block, { borderColor: c.textPrimary }]

	if (phase !== 'revealed') {
		return (
			<View style={frame}>
				<Text variant="mono" tone="secondary">
					{phase === 'rolling' ? 'Drumroll' : 'The stake'}
				</Text>
				{phase === 'rolling' ? (
					<Animated.View key={beat} entering={beatIn}>
						<Text variant="displayHero" tabular>
							{String(REVEAL.beats - beat).padStart(2, '0')}
						</Text>
					</Animated.View>
				) : (
					<View>
						<Text variant="h1">{stake ? 'Who’s on the hook?' : 'Who came last?'}</Text>
						{stake ? (
							<Text variant="h1" tone="tertiary">
								{stake}
							</Text>
						) : null}
					</View>
				)}
				<Button
					label={phase === 'rolling' ? 'And it’s…' : 'Reveal'}
					size="lg"
					fullWidth
					haptic="snap"
					disabled={phase === 'rolling'}
					onPress={reveal}
					accessibilityHint="Shows who owes the stake"
				/>
			</View>
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
		headline = 'Nobody pays.'
		line = perfect
			? 'Every single day, kept by every single one of you. Frame this.'
			: 'All tied up. Nobody can claim the high ground, so nobody pays.'
	} else {
		const you = names.length === 1 && names[0] === 'You'
		const said = stakeLine(names, stake)
		headline = /[\p{L}\p{N}]$/u.test(said) ? `${said}.` : said
		line =
			losers.length > 1
				? `Tied at the bottom: ${joinNames(names)} split it, fair and square.`
				: `${losers[0].days_done} of ${losers[0].days_held} days. Next round is ${you ? 'yours' : `${names[0]}’s`}.`
	}

	return (
		<View style={frame} accessibilityLiveRegion="polite">
			<Text variant="mono" tone="secondary">
				{nobody ? 'Everybody wins' : losers.length > 1 ? 'They pay' : 'Pays'}
			</Text>
			<View style={s.faces}>
				{faces.map((m, i) => (
					<Pop key={m.user_id} delay={i * 50} style={i > 0 ? s.overlap : undefined}>
						<Avatar userId={m.user_id} name={displayName(m)} size={nobody ? 48 : 72} />
					</Pop>
				))}
			</View>
			<FadeSlideIn index={1}>
				<Text variant="h1">{headline}</Text>
				<Text variant="h2" tone="tertiary">
					{line}
				</Text>
			</FadeSlideIn>
		</View>
	)
}

const s = StyleSheet.create({
	block: { gap: 20, padding: 20, borderWidth: StyleSheet.hairlineWidth * 3, borderRadius: 8 },
	faces: { flexDirection: 'row' },
	overlap: { marginLeft: -10 }
})
