'use client'

import { motion } from 'motion/react'

/**
 * The paper stamp on a signed pact: it comes down hard (from big and askew to its slant, on a stiff
 * spring) and hangs off the card's bottom edge, opaque, so it never sits on a signature. Place it
 * in a `relative` card.
 */
export function Stamp({ isDown, children }: { isDown: boolean; children: React.ReactNode }) {
	return (
		<motion.span
			aria-hidden="true"
			className="label absolute -bottom-4 right-6 rounded-[4px] border-2 border-[color:var(--crew-line)] bg-surface px-3 py-2 text-[11px] text-[color:var(--crew-ink)] sm:right-9"
			initial={false}
			animate={
				isDown ? { opacity: 1, scale: 1, rotate: -6 } : { opacity: 0, scale: 1.7, rotate: -18 }
			}
			transition={isDown ? { type: 'spring', stiffness: 700, damping: 22 } : { duration: 0.15 }}
		>
			{children}
		</motion.span>
	)
}
