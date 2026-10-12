'use client'

import Link from 'next/link'
import { ArrowDown, ArrowRight } from 'lucide-react'
import { Magnetic } from '@/components/motion/Magnetic'
import { gaEvent } from '@/lib/analytics/client'
import { FUNNEL_EVENTS } from '@/lib/analytics/events'
import { cn } from '@/lib/utils'

/** Where each landing CTA sits, as `cta_clicked` reports it. */
export type CtaPlace = 'hero_start' | 'hero_code' | 'your_turn' | 'closing'

/** How far the primary leans toward the cursor, px; its field reaches past the button. */
const PULL_PX = 16

/**
 * The primary action: an ink pill whose arrow slides on hover, pulled toward the cursor from a
 * field wider than itself. `tone="onFill"` for the coral band, where the pill goes dark.
 */
export function PrimaryCta({
	href,
	cta,
	children,
	tone = 'ground',
	className
}: {
	href: string
	cta: CtaPlace
	children: React.ReactNode
	tone?: 'ground' | 'onFill'
	className?: string
}) {
	return (
		<Magnetic pull={PULL_PX} className={cn('-m-5 p-5', className)}>
			<Link
				href={href}
				onClick={() => gaEvent(FUNNEL_EVENTS.ctaClicked, { cta })}
				className={cn(
					'group inline-flex h-14 items-center gap-3 rounded-pill pl-7 pr-2 text-base font-semibold transition-[transform,background-color] duration-base ease-out active:scale-[0.97]',
					tone === 'ground'
						? 'bg-ink text-ink-inverse hover:bg-ink/90'
						: 'bg-[color:var(--crew-coral-on-fill)] text-[color:var(--crew-coral-fill)]'
				)}
			>
				{children}
				{/* On hover the arrow leaves to the right as its twin arrives from the left. */}
				<span className="relative h-10 w-10 overflow-hidden rounded-full bg-[color:var(--crew-coral-fill)] text-[color:var(--crew-coral-on-fill)]">
					<ArrowRight
						className="absolute inset-0 m-auto h-4 w-4 transition-transform duration-slow ease-out group-hover:translate-x-[250%]"
						aria-hidden="true"
					/>
					<ArrowRight
						className="absolute inset-0 m-auto h-4 w-4 -translate-x-[250%] transition-transform duration-slow ease-out group-hover:translate-x-0"
						aria-hidden="true"
					/>
				</span>
			</Link>
		</Magnetic>
	)
}

/** The quiet second action: text with a line that draws under it, and a small arrow that nods. */
export function SecondaryCta({
	href,
	cta,
	children
}: {
	href: string
	cta: CtaPlace
	children: React.ReactNode
}) {
	return (
		<Link
			href={href}
			onClick={() => gaEvent(FUNNEL_EVENTS.ctaClicked, { cta })}
			className="nav-link group inline-flex h-14 items-center gap-2 px-3.5 text-base font-medium text-ink-secondary transition-colors duration-fast hover:text-ink"
		>
			{children}
			<ArrowDown
				className="h-4 w-4 transition-transform duration-base ease-out group-hover:translate-y-0.5"
				aria-hidden="true"
			/>
		</Link>
	)
}
