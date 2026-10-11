import { useEffect, useState } from 'react'
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { PressableScale } from '@/components/motion/PressableScale'
import { Text } from '@/components/ui/Text'
import { useTheme } from '@/contexts/ThemeContext'
import { haptic } from '@/lib/haptics'
import { Springs } from '@/lib/motion'

/** Height of the floating bar itself. */
export const TAB_BAR_HEIGHT = 64
const ICON_SIZE = 22
const LENS_INSET = 6

function barBottom(insetBottom: number) {
	return insetBottom > 0 ? insetBottom + 4 : 14
}

/**
 * How far a tab screen's content must scroll clear of the floating bar: the
 * bar, the gap under it, the home indicator, and breathing room above.
 */
export function useTabBarClearance(): number {
	const insets = useSafeAreaInsets()
	return barBottom(insets.bottom) + TAB_BAR_HEIGHT + CLEARANCE_GAP
}

/** Room between the last content and the bar once scrolled to the end. */
const CLEARANCE_GAP = 32
/** How far above the bar the page fades out, so nothing reads through the gap under it. */
const FADE_ABOVE = 28

/**
 * A floating paper pill above the home indicator, with a hairline edge and no
 * glass. The active tab sits in an ink lens that slides between tabs on the
 * smooth spring, its label in paper; a tab change ticks the selection haptic.
 */
export default function TabBar({ state, navigation, descriptors }: BottomTabBarProps) {
	const insets = useSafeAreaInsets()
	const { colors: c, layout } = useTheme()
	const [width, setWidth] = useState(0)
	const count = state.routes.length
	const slot = count > 0 ? width / count : 0

	const lensX = useSharedValue(0)
	useEffect(() => {
		if (slot > 0) lensX.value = withSpring(state.index * slot + LENS_INSET, Springs.smooth)
	}, [state.index, slot, lensX])
	const lensStyle = useAnimatedStyle(() => ({ transform: [{ translateX: lensX.value }] }))

	function onLayout(e: LayoutChangeEvent) {
		const w = e.nativeEvent.layout.width
		setWidth(w)
		// Place the lens without animating on first layout.
		lensX.value = state.index * (w / Math.max(count, 1)) + LENS_INSET
	}

	function handlePress(routeName: string, key: string, focused: boolean) {
		const event = navigation.emit({ type: 'tabPress', target: key, canPreventDefault: true })
		if (focused || event.defaultPrevented) return
		haptic.select()
		navigation.navigate(routeName as never)
	}

	return (
		<>
			{/* Content scrolls under the floating bar; this fade, the page's own colour, keeps it
		    from showing through below and around the pill. */}
			<LinearGradient
				pointerEvents="none"
				colors={[c.bgFade, c.bg, c.bg]}
				locations={[0, 0.45, 1]}
				style={[s.fade, { height: barBottom(insets.bottom) + TAB_BAR_HEIGHT + FADE_ABOVE }]}
			/>
			<View
				pointerEvents="box-none"
				style={[s.wrap, { bottom: barBottom(insets.bottom), paddingHorizontal: layout.gutter }]}
			>
				<View
					style={[s.bar, { borderColor: c.borderActive, backgroundColor: c.bg }]}
					onLayout={onLayout}
				>
					{slot > 0 ? (
						<Animated.View
							pointerEvents="none"
							style={[
								s.lens,
								{ width: slot - LENS_INSET * 2, backgroundColor: c.textPrimary },
								lensStyle
							]}
						/>
					) : null}

					{state.routes.map((route, i) => {
						const { options } = descriptors[route.key]
						const focused = state.index === i
						const label =
							typeof options.tabBarLabel === 'string'
								? options.tabBarLabel
								: (options.title ?? route.name)
						const color = focused ? c.bg : c.textSecondary
						return (
							<PressableScale
								key={route.key}
								haptic={false}
								scaleTo={0.9}
								onPress={() => handlePress(route.name, route.key, focused)}
								accessibilityRole="tab"
								accessibilityLabel={label}
								accessibilityState={{ selected: focused }}
								style={s.item}
							>
								{options.tabBarIcon?.({ focused, color, size: ICON_SIZE })}
								<Text
									variant="mono"
									numberOfLines={1}
									maxFontSizeMultiplier={1.2}
									style={{ color }}
								>
									{label}
								</Text>
							</PressableScale>
						)
					})}
				</View>
			</View>
		</>
	)
}

const s = StyleSheet.create({
	wrap: { position: 'absolute', left: 0, right: 0 },
	fade: { position: 'absolute', left: 0, right: 0, bottom: 0 },
	bar: {
		height: TAB_BAR_HEIGHT,
		borderRadius: TAB_BAR_HEIGHT / 2,
		borderWidth: StyleSheet.hairlineWidth * 2,
		flexDirection: 'row',
		alignItems: 'center'
	},
	lens: {
		position: 'absolute',
		left: 0,
		top: LENS_INSET,
		bottom: LENS_INSET,
		borderRadius: (TAB_BAR_HEIGHT - LENS_INSET * 2) / 2
	},
	item: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'center', gap: 3 }
})
