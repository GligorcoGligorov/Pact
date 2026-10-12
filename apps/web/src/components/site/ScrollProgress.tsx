'use client'

import { motion, useScroll, useSpring } from 'motion/react'

/** A 1px coral line across the top of the window that fills as the page is read. */
export function ScrollProgress() {
	const { scrollYProgress } = useScroll()
	const scaleX = useSpring(scrollYProgress, { stiffness: 260, damping: 40, restDelta: 0.001 })
	return (
		<motion.div
			aria-hidden="true"
			className="fixed inset-x-0 top-0 z-[60] h-px origin-left bg-[color:var(--crew-coral-line)]"
			style={{ scaleX }}
		/>
	)
}
