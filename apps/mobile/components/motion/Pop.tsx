import { useEffect, type ReactNode } from 'react'
import type { StyleProp, ViewStyle } from 'react-native'
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withDelay,
	withSpring
} from 'react-native-reanimated'
import { Springs } from '@/lib/motion'

/**
 * A mark that lands: its child scales up from nothing, overshoots and settles on
 * Springs.pop (inside 400ms). For a ✓ or a badge appearing, never for text a person
 * has to read mid-motion. With Reduce Motion it simply appears.
 */
export function Pop({
	delay = 0,
	style,
	children
}: {
	/** ms before it lands, to follow another motion (a ring filling). */
	delay?: number
	style?: StyleProp<ViewStyle>
	children: ReactNode
}) {
	const scale = useSharedValue(0)

	useEffect(() => {
		scale.value = withDelay(delay, withSpring(1, Springs.pop))
	}, [delay, scale])

	const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))
	return <Animated.View style={[animated, style]}>{children}</Animated.View>
}
