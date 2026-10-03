import { useEffect, useRef } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Check, Info, TriangleAlert } from 'lucide-react-native'
import type { Verdict } from '@app/contract'
import { Button } from '@/components/ui/Button'
import { Text } from '@/components/ui/Text'
import { useTheme } from '@/contexts/ThemeContext'
import { haptic } from '@/lib/haptics'
import { Confetti } from './Confetti'

/** Past this many characters the caption steps down a size, so it stays within ~4 lines. */
const LONG_CAPTION = 48

/** What the verdict screen says when there is no caption to show (R14–R16). */
const FALLBACK: Record<Exclude<Verdict, 'pass' | 'suspicious'>, { title: string; body: string }> = {
	pending: {
		title: 'Checked in',
		body: 'The judge is still thinking. Your check-in counts either way.'
	},
	error: {
		title: 'Checked in',
		body: "The AI judge couldn't look at this one. Your check-in still counts."
	},
	not_configured: { title: 'Checked in', body: 'AI judge not configured.' },
	skipped: {
		title: 'Checked in',
		body: "No AI judge on this one, as you chose. You're in for today."
	}
}

/**
 * The check-in's photo full-bleed, with the judging state over it and then the verdict: the
 * AI's caption, big, over a dark wash. A pass gets confetti and a success haptic; a suspicious
 * one shows its reason, which the whole group sees too (R15). Every verdict counts.
 */
export function VerdictView({
	photoUri,
	verdict,
	caption,
	reason,
	challenge,
	onDone,
	onViewed
}: {
	photoUri: string
	/** `undefined` while judging. `pending` once the wait has run out. */
	verdict: Verdict | undefined
	caption: string | null
	reason: string | null
	challenge: string | null
	onDone: () => void
	/** Once, when a verdict first shows. */
	onViewed: (verdict: Verdict) => void
}) {
	const { colors: c } = useTheme()
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
	const fallback = verdict && !isPass && !isFlag ? FALLBACK[verdict] : null
	const badge = isPass
		? { bg: c.brandFill, fg: c.onBrand, icon: Check, label: 'Passed' }
		: isFlag
			? { bg: c.warning, fg: c.onWarning, icon: TriangleAlert, label: 'Flagged' }
			: { bg: c.surface, fg: c.textPrimary, icon: Info, label: fallback?.title ?? '' }
	const BadgeIcon = badge.icon

	return (
		<View style={[s.root, { backgroundColor: c.hero }]}>
			<Image source={{ uri: photoUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
			<LinearGradient
				colors={[c.bgFade, c.artScrim, c.artScrim]}
				locations={[0, judging ? 0.75 : 0.45, 1]}
				style={StyleSheet.absoluteFill}
			/>

			{judging ? (
				<Animated.View entering={FadeIn} style={[s.judging, { paddingBottom: insets.bottom + 40 }]}>
					<View
						style={[s.judgingPill, { backgroundColor: c.glassTint, borderColor: c.borderGlass }]}
					>
						<ActivityIndicator color={c.inkOnArt} />
						<Text variant="label" style={{ color: c.inkOnArt }}>
							Judging…
						</Text>
					</View>
					{challenge ? (
						<Text variant="bodySm" style={[s.center, { color: c.inkOnArt }]}>
							Looking for: {challenge.toLowerCase()}
						</Text>
					) : null}
				</Animated.View>
			) : (
				<View style={[s.result, { paddingBottom: insets.bottom + 20 }]}>
					<Animated.View
						entering={ZoomIn.springify().damping(11).delay(80)}
						style={[s.badge, { backgroundColor: badge.bg }]}
					>
						<BadgeIcon size={30} color={badge.fg} strokeWidth={3} />
					</Animated.View>
					<Animated.View entering={FadeInDown.delay(160).duration(380)}>
						<Text variant="eyebrow" style={[s.center, { color: c.inkOnArt }]}>
							{badge.label}
						</Text>
					</Animated.View>

					{caption ? (
						<Animated.View entering={FadeInDown.delay(260).duration(460)}>
							<Text
								variant={caption.length > LONG_CAPTION ? 'h1' : 'display'}
								style={[s.center, { color: c.inkOnArt }]}
							>
								“{caption}”
							</Text>
						</Animated.View>
					) : fallback ? (
						<Animated.View entering={FadeInDown.delay(260).duration(460)}>
							<Text variant="h2" style={[s.center, { color: c.inkOnArt }]}>
								{fallback.body}
							</Text>
						</Animated.View>
					) : null}

					{reason && (isFlag || isPass) ? (
						<Animated.View
							entering={FadeInDown.delay(420).duration(420)}
							style={[
								s.reason,
								isFlag && { backgroundColor: c.warningSoft, borderColor: c.warningBorder }
							]}
						>
							<Text
								variant="bodySm"
								style={[s.center, { color: isFlag ? c.warningText : c.inkOnArt }]}
							>
								{isFlag ? `${reason} Your friends see this too. It still counts.` : reason}
							</Text>
						</Animated.View>
					) : null}

					<Animated.View entering={FadeIn.delay(600)} style={s.done}>
						<Button label="Done" size="lg" fullWidth onPress={onDone} />
					</Animated.View>
				</View>
			)}

			{isPass ? <Confetti /> : null}
		</View>
	)
}

const s = StyleSheet.create({
	root: { flex: 1, overflow: 'hidden' },
	judging: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', gap: 12, padding: 24 },
	judgingPill: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		paddingHorizontal: 18,
		paddingVertical: 12,
		borderRadius: 999,
		borderWidth: StyleSheet.hairlineWidth
	},
	result: { flex: 1, justifyContent: 'flex-end', alignItems: 'stretch', gap: 14, padding: 24 },
	badge: {
		width: 64,
		height: 64,
		borderRadius: 32,
		alignSelf: 'center',
		alignItems: 'center',
		justifyContent: 'center'
	},
	reason: {
		borderRadius: 16,
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: 'transparent',
		paddingHorizontal: 14,
		paddingVertical: 10
	},
	center: { textAlign: 'center' },
	done: { marginTop: 10 }
})
