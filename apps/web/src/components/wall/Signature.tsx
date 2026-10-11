import { SIGNATURE_BOX } from '@app/contract'

/** A member's stored signature (SVG path data in the signature box), at any width. */
export function Signature({ path, className }: { path: string; className?: string }) {
	return (
		<svg
			viewBox={`0 0 ${SIGNATURE_BOX.width} ${SIGNATURE_BOX.height}`}
			className={className}
			aria-hidden="true"
		>
			<path
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
