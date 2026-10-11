import type { ReactNode } from 'react'
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import Animated, { Keyframe } from 'react-native-reanimated'
import type { CrewTone } from '@app/brand'
import { PressableScale } from '@/components/motion/PressableScale'
import { CornerMarks } from '@/components/ui/CornerMarks'
import { Text } from '@/components/ui/Text'
import { useReducedMotion } from '@/lib/motion'

/** The hero grows in from the card it was tapped on: a short scale and fade, under 400ms. */
const GROW_MS = 320
const grow = new Keyframe({
	0: { opacity: 0, transform: [{ scale: 0.94 }, { translateY: 12 }] },
	100: { opacity: 1, transform: [{ scale: 1 }, { translateY: 0 }] }
}).duration(GROW_MS)

/**
 * The one loud block a screen gets: solid crew colour, text and chain in its `onFill`, crosshair
 * corner marks outside it on the paper. Everything else on the screen stays paper and ink.
 */
export function CrewHero({
	tone,
	children,
	onPress,
	accessibilityLabel,
	compact,
	marks = true,
	style
}: {
	tone: CrewTone
	children: ReactNode
	/** A home card: the whole block opens the pact. */
	onPress?: () => void
	accessibilityLabel?: string
	/** Tighter padding, for a card in a list. */
	compact?: boolean
	/** The corner marks; off for a block that isn't the screen's main one. */
	marks?: boolean
	style?: StyleProp<ViewStyle>
}) {
	const reduced = useReducedMotion()
	const block = [
		s.block,
		compact && s.compact,
		{ backgroundColor: tone.fill },
		style
	] as StyleProp<ViewStyle>
	const body = onPress ? (
		<PressableScale
			onPress={onPress}
			scaleTo="card"
			haptic="press"
			accessibilityRole="button"
			accessibilityLabel={accessibilityLabel}
			style={block}
		>
			{children}
		</PressableScale>
	) : (
		<View style={block}>{children}</View>
	)
	return (
		<Animated.View entering={reduced || onPress ? undefined : grow}>
			{marks ? <CornerMarks>{body}</CornerMarks> : body}
		</Animated.View>
	)
}

/** Roles big enough for WCAG's large-text bar, where the muted line can lean further. */
const LARGE = new Set(['displayHero', 'display', 'h1', 'h2', 'title'])

/** Text on the crew fill: `onFill`, or its muted step (further for a headline's second line). */
export function OnFill({
	tone,
	muted,
	variant,
	children,
	numberOfLines
}: {
	tone: CrewTone
	muted?: boolean
	variant: Parameters<typeof Text>[0]['variant']
	children: ReactNode
	numberOfLines?: number
}) {
	return (
		<Text
			variant={variant}
			numberOfLines={numberOfLines}
			style={{
				color: muted
					? LARGE.has(variant ?? '')
						? tone.onFillLarge
						: tone.onFillMuted
					: tone.onFill
			}}
		>
			{children}
		</Text>
	)
}

const s = StyleSheet.create({
	block: { borderRadius: 8, padding: 20, gap: 24 },
	compact: { padding: 16, gap: 16 }
})
