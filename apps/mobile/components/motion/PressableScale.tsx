import { useCallback } from 'react'
import {
	Pressable,
	type GestureResponderEvent,
	type PressableProps,
	type StyleProp,
	type ViewStyle
} from 'react-native'
import Animated, {
	interpolate,
	useAnimatedStyle,
	useSharedValue,
	withSpring
} from 'react-native-reanimated'
import type { NativeShadow } from '@app/brand'
import { haptic, type HapticMeaning } from '@/lib/haptics'
import { PRESS, Springs } from '@/lib/motion'

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

export interface PressableScaleProps extends Omit<PressableProps, 'style' | 'children'> {
	style?: StyleProp<ViewStyle>
	/** 'button' springs to .94, 'card' to .975 (the preset's press scales), or a number. */
	scaleTo?: 'button' | 'card' | number
	/** The feeling on press-in, by meaning. false for none. */
	haptic?: HapticMeaning | false
	/** A card's shadow grows from `from` to `to` while pressed, so it lifts to the finger. */
	lift?: { from: NativeShadow; to: NativeShadow }
	children?: React.ReactNode
}

/**
 * The one way the app answers a touch: a spring down on press-in (snappy),
 * back on release (settle), with a meaning-named haptic. Every tappable in the
 * app goes through this or a primitive built on it, so the whole product has
 * one physical feel. Springs carry ReduceMotion.System: with Reduce Motion on,
 * the scale is skipped and only the haptic remains.
 */
export function PressableScale({
	style,
	scaleTo = 'button',
	haptic: meaning = 'press',
	lift,
	onPressIn,
	onPressOut,
	disabled,
	accessibilityRole = 'button',
	accessibilityState,
	children,
	...rest
}: PressableScaleProps) {
	const scale = useSharedValue(1)
	const target = typeof scaleTo === 'number' ? scaleTo : PRESS[scaleTo]
	const animated = useAnimatedStyle(() => {
		if (!lift) return { transform: [{ scale: scale.value }] }
		// 0 at rest, 1 fully pressed: the shadow follows the same spring as the scale.
		const t = interpolate(scale.value, [1, target], [0, 1])
		const { from, to } = lift
		return {
			transform: [{ scale: scale.value }],
			shadowOpacity: interpolate(t, [0, 1], [from.shadowOpacity, to.shadowOpacity]),
			shadowRadius: interpolate(t, [0, 1], [from.shadowRadius, to.shadowRadius]),
			shadowOffset: {
				width: 0,
				height: interpolate(t, [0, 1], [from.shadowOffset.height, to.shadowOffset.height])
			}
		}
	})

	const handleIn = useCallback(
		(e: GestureResponderEvent) => {
			scale.value = withSpring(target, Springs.snappy)
			if (meaning) haptic[meaning]()
			onPressIn?.(e)
		},
		[scale, target, meaning, onPressIn]
	)

	const handleOut = useCallback(
		(e: GestureResponderEvent) => {
			scale.value = withSpring(1, Springs.settle)
			onPressOut?.(e)
		},
		[scale, onPressOut]
	)

	return (
		<AnimatedPressable
			style={[style, animated]}
			onPressIn={handleIn}
			onPressOut={handleOut}
			disabled={disabled}
			accessibilityRole={accessibilityRole}
			accessibilityState={{ disabled: !!disabled, ...accessibilityState }}
			{...rest}
		>
			{children}
		</AnimatedPressable>
	)
}
