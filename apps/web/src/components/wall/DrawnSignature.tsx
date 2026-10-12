'use client'

import { motion } from 'motion/react'
import { SIGNATURE_BOX } from '@app/contract'

/** Seconds for one signature to draw: a quick hand, not a slow trace. */
export const SIGN_S = 0.9

/**
 * A stored signature that draws itself, stroke by stroke, when `isDrawn` turns true (and undraws
 * when it turns false, so a scrolled-back step can play again). Drawn from the first paint under
 * reduced motion, through the MotionConfig the pages sit in.
 */
export function DrawnSignature({
	path,
	isDrawn,
	delay = 0,
	duration = SIGN_S,
	className,
	strokeWidth = 2.6
}: {
	path: string
	isDrawn: boolean
	/** Seconds before this one starts, to sign in turn. */
	delay?: number
	duration?: number
	className?: string
	strokeWidth?: number
}) {
	return (
		<svg
			viewBox={`0 0 ${SIGNATURE_BOX.width} ${SIGNATURE_BOX.height}`}
			className={className}
			aria-hidden="true"
		>
			<motion.path
				d={path}
				fill="none"
				stroke="currentColor"
				strokeWidth={strokeWidth}
				strokeLinecap="round"
				strokeLinejoin="round"
				initial={false}
				animate={{ pathLength: isDrawn ? 1 : 0, opacity: isDrawn ? 1 : 0 }}
				transition={{
					pathLength: {
						duration: isDrawn ? duration : 0.25,
						delay: isDrawn ? delay : 0,
						ease: [0.45, 0, 0.2, 1]
					},
					opacity: { duration: 0.01, delay: isDrawn ? delay : 0.25 }
				}}
			/>
		</svg>
	)
}
