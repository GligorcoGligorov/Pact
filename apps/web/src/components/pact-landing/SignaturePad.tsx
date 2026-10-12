'use client'

import { useRef, useState, type PointerEvent } from 'react'
import { SIGNATURE_BOX } from '@app/contract'
import { cn } from '@/lib/utils'

type Point = { x: number; y: number }

/** Points closer than this (in signature-box units) are one point: it keeps a stroke's path short. */
const MIN_STEP = 1.5
/** A stroke shorter than this many points is a tap, not a signature. */
const MIN_POINTS = 6

const f = (n: number) => n.toFixed(1)

/** A stroke as path data: straight to the first midpoint, then curves through each point's midpoints. */
export function strokePath(points: Point[]): string {
	if (points.length === 0) return ''
	const [first, ...rest] = points
	if (rest.length === 0)
		return `M${f(first!.x)} ${f(first!.y)} L${f(first!.x + 0.1)} ${f(first!.y)}`
	let d = `M${f(first!.x)} ${f(first!.y)}`
	for (let i = 0; i < rest.length - 1; i++) {
		const p = rest[i]!
		const next = rest[i + 1]!
		d += ` Q${f(p.x)} ${f(p.y)} ${f((p.x + next.x) / 2)} ${f((p.y + next.y) / 2)}`
	}
	const last = rest[rest.length - 1]!
	return `${d} L${f(last.x)} ${f(last.y)}`
}

/**
 * A signature pad for a mouse, a pen or a finger: strokes in the contract's 300×120 signature box,
 * as SVG path data, so what is drawn here renders exactly like a signature in the app. Reports the
 * whole signature after each finished stroke. Touch scrolling is off inside the pad only.
 */
export function SignaturePad({
	onSign,
	className
}: {
	/** The signature so far, after each stroke; empty after Clear. */
	onSign: (path: string) => void
	className?: string
}) {
	const box = useRef<SVGSVGElement>(null)
	const points = useRef<Point[]>([])
	const [strokes, setStrokes] = useState<string[]>([])
	const [live, setLive] = useState('')

	function toBox(e: PointerEvent): Point {
		const rect = box.current!.getBoundingClientRect()
		return {
			x: ((e.clientX - rect.left) / rect.width) * SIGNATURE_BOX.width,
			y: ((e.clientY - rect.top) / rect.height) * SIGNATURE_BOX.height
		}
	}

	function onDown(e: PointerEvent<SVGSVGElement>) {
		e.currentTarget.setPointerCapture(e.pointerId)
		points.current = [toBox(e)]
		setLive(strokePath(points.current))
	}

	function onMove(e: PointerEvent<SVGSVGElement>) {
		if (points.current.length === 0) return
		const p = toBox(e)
		const last = points.current[points.current.length - 1]!
		if (Math.hypot(p.x - last.x, p.y - last.y) < MIN_STEP) return
		points.current.push(p)
		setLive(strokePath(points.current))
	}

	function onUp() {
		const stroke = points.current
		points.current = []
		setLive('')
		if (stroke.length < MIN_POINTS) return
		const next = [...strokes, strokePath(stroke)]
		setStrokes(next)
		onSign(next.join(' '))
	}

	function clear() {
		setStrokes([])
		onSign('')
	}

	const isEmpty = strokes.length === 0 && !live
	return (
		<div className={cn('relative', className)}>
			<svg
				ref={box}
				viewBox={`0 0 ${SIGNATURE_BOX.width} ${SIGNATURE_BOX.height}`}
				role="img"
				aria-label="Signature pad: draw your signature with a mouse or a finger"
				className="block aspect-[5/2] w-full cursor-crosshair touch-none select-none rounded-[8px] border border-line-soft bg-surface text-ink transition-colors duration-base hover:border-line-active"
				onPointerDown={onDown}
				onPointerMove={onMove}
				onPointerUp={onUp}
				onPointerCancel={onUp}
			>
				<line
					x1="18"
					x2={SIGNATURE_BOX.width - 18}
					y1="92"
					y2="92"
					className="stroke-line-soft"
					strokeWidth="1"
					strokeDasharray="4 4"
				/>
				<text
					x="18"
					y="108"
					className="fill-ink-tertiary font-mono text-[8px] uppercase tracking-[0.08em]"
				>
					× Sign here
				</text>
				{[...strokes, live].map((d, i) =>
					d ? (
						<path
							key={i}
							d={d}
							fill="none"
							stroke="currentColor"
							strokeWidth={2.6}
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
					) : null
				)}
			</svg>
			{isEmpty ? (
				<span
					aria-hidden="true"
					className="label pointer-events-none absolute inset-0 grid place-items-center text-ink-tertiary"
				>
					Draw your signature
				</span>
			) : (
				<button
					type="button"
					onClick={clear}
					className="label absolute right-3 top-3 rounded-pill px-2.5 py-1.5 text-[10px] text-ink-secondary transition-colors duration-fast hover:bg-surface2 hover:text-ink"
				>
					Clear
				</button>
			)}
		</div>
	)
}
