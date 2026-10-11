import type { ReactNode } from 'react'
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import { useColors } from '@/contexts/ThemeContext'

/** Arm length of each corner bracket. */
const ARM = 10
/** The brackets sit this far outside the content box, like registration marks. */
const OUTSET = 6

/**
 * Crosshair corner marks: four thin L-brackets just outside a key block's corners, the way a
 * print layout marks its trim. Reserve them for the one block a screen is about.
 */
export function CornerMarks({
	children,
	color,
	style
}: {
	children: ReactNode
	/** Defaults to the ink at hairline-plus strength. */
	color?: string
	style?: StyleProp<ViewStyle>
}) {
	const c = useColors()
	const line = color ?? c.textPrimary
	const corner = (v: 'top' | 'bottom', h: 'left' | 'right') => (
		<View
			key={`${v}-${h}`}
			pointerEvents="none"
			style={[
				s.corner,
				{
					[v]: -OUTSET,
					[h]: -OUTSET,
					borderColor: line,
					[`border${v === 'top' ? 'Top' : 'Bottom'}Width`]: StyleSheet.hairlineWidth * 2,
					[`border${h === 'left' ? 'Left' : 'Right'}Width`]: StyleSheet.hairlineWidth * 2
				}
			]}
		/>
	)
	return (
		<View style={style}>
			{children}
			{corner('top', 'left')}
			{corner('top', 'right')}
			{corner('bottom', 'left')}
			{corner('bottom', 'right')}
		</View>
	)
}

const s = StyleSheet.create({
	corner: { position: 'absolute', width: ARM, height: ARM }
})
