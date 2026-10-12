import { SIGNATURE_BOX } from '@app/contract'
import { cn, type CssVars } from '@/lib/utils'

/**
 * A member's stored signature (SVG path data in the signature box), at any width. With `drawAt`
 * it draws itself stroke by stroke on load, `drawAt`-th in line (`.sig-draw` in globals.css: CSS,
 * so the server-rendered page needs no script for it, and it is simply drawn under reduced motion).
 */
export function Signature({
	path,
	className,
	drawAt
}: {
	path: string
	className?: string
	drawAt?: number
}) {
	return (
		<svg
			viewBox={`0 0 ${SIGNATURE_BOX.width} ${SIGNATURE_BOX.height}`}
			className={cn(drawAt !== undefined && 'sig-draw', className)}
			style={drawAt !== undefined ? ({ '--i': drawAt } as CssVars) : undefined}
			aria-hidden="true"
		>
			<path
				pathLength={1}
				d={path}
				fill="none"
				stroke="currentColor"
				strokeWidth={2.6}
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	)
}
