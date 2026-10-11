import { useEffect, useMemo, useRef, useState } from 'react'
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Svg, { Path } from 'react-native-svg'
import { SIGNATURE_BOX } from '@app/contract'
import { haptic } from '@/lib/haptics'

type Point = { x: number; y: number }

/** Points closer than this (in box units) are dropped: smoother lines, shorter paths. */
const MIN_STEP = 1.5

const round = (n: number) => Math.round(n * 10) / 10

/**
 * Strokes as SVG path data in the 300×120 signature box: each stroke a move, then quadratic
 * curves through the midpoints between points, so a finger's line comes out smooth.
 */
export function strokesToPath(strokes: Point[][]): string {
	return strokes
		.filter((stroke) => stroke.length > 0)
		.map((stroke) => {
			const [first, ...rest] = stroke
			if (!first) return ''
			if (rest.length === 0)
				return `M${round(first.x)} ${round(first.y)} L${round(first.x + 0.5)} ${round(first.y)}`
			let d = `M${round(first.x)} ${round(first.y)}`
			for (let i = 0; i < rest.length - 1; i++) {
				const p = rest[i]!
				const next = rest[i + 1]!
				d += ` Q${round(p.x)} ${round(p.y)} ${round((p.x + next.x) / 2)} ${round((p.y + next.y) / 2)}`
			}
			const last = rest[rest.length - 1]!
			return `${d} L${round(last.x)} ${round(last.y)}`
		})
		.join(' ')
}

/**
 * A finger signature pad: draw with one finger, in ink. Reports the path (box units,
 * `SIGNATURE_BOX`) when a stroke ends; changing `clearKey` wipes it. A light tick when a stroke
 * starts, like a pen touching paper. The strokes live in a ref so the gesture is built once and
 * never swapped mid-stroke.
 */
export function SignaturePad({
	ink,
	onChange,
	clearKey
}: {
	ink: string
	onChange: (path: string | null) => void
	clearKey: number
}) {
	const strokes = useRef<Point[][]>([])
	const [, redraw] = useState(0)
	const scale = useRef(1)

	useEffect(() => {
		strokes.current = []
		redraw((n) => n + 1)
	}, [clearKey])

	const onLayout = (e: LayoutChangeEvent) => {
		const width = e.nativeEvent.layout.width
		scale.current = width > 0 ? SIGNATURE_BOX.width / width : 1
	}

	const pan = useMemo(() => {
		const toBox = (x: number, y: number): Point => ({
			x: Math.min(Math.max(x * scale.current, 0), SIGNATURE_BOX.width),
			y: Math.min(Math.max(y * scale.current, 0), SIGNATURE_BOX.height)
		})
		return Gesture.Pan()
			.runOnJS(true)
			.minDistance(0)
			.onBegin((e) => {
				haptic.select()
				strokes.current = [...strokes.current, [toBox(e.x, e.y)]]
				redraw((n) => n + 1)
			})
			.onUpdate((e) => {
				const last = strokes.current[strokes.current.length - 1]
				if (!last) return
				const point = toBox(e.x, e.y)
				const prev = last[last.length - 1]
				if (prev && Math.hypot(point.x - prev.x, point.y - prev.y) < MIN_STEP) return
				last.push(point)
				redraw((n) => n + 1)
			})
			.onFinalize(() => {
				const d = strokesToPath(strokes.current)
				onChange(d.length >= 8 ? d : null)
			})
	}, [onChange])

	const d = strokesToPath(strokes.current)
	return (
		<GestureDetector gesture={pan}>
			<View
				style={s.pad}
				onLayout={onLayout}
				accessibilityLabel="Signature pad: sign with your finger"
			>
				<Svg
					width="100%"
					height="100%"
					viewBox={`0 0 ${SIGNATURE_BOX.width} ${SIGNATURE_BOX.height}`}
				>
					{d ? (
						<Path
							d={d}
							stroke={ink}
							strokeWidth={2.6}
							fill="none"
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
					) : null}
				</Svg>
			</View>
		</GestureDetector>
	)
}

const s = StyleSheet.create({
	pad: { width: '100%', aspectRatio: SIGNATURE_BOX.width / SIGNATURE_BOX.height }
})
