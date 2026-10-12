'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Container } from '@/components/Container'
import { cn, type CssVars } from '@/lib/utils'
import { CHECK_INS, photoSrc } from './photos'

/** Seconds per loop of a row: slow enough to read a caption as it passes. */
const LOOP_S = 70

type CheckIn = (typeof CHECK_INS)[number]

const HALF = Math.ceil(CHECK_INS.length / 2)
const ROWS: { items: CheckIn[]; reverse: boolean }[] = [
	{ items: CHECK_INS.slice(0, HALF), reverse: false },
	{ items: CHECK_INS.slice(HALF), reverse: true }
]

/**
 * Check-ins as they land: two rows of real photos with their mono caption (name · habit · time),
 * drifting in opposite directions. A row stops while the mouse is over it, or on a tap on a touch
 * screen. Each track is the row twice, moved by half its width, so the loop has no seam; the copy
 * is hidden from assistive tech. Under reduced motion the rows stand still and scroll by hand.
 */
export function Marquee() {
	return (
		<section aria-labelledby="marquee-title" className="relative overflow-hidden py-16 sm:py-24">
			<Container className="label mb-8 flex flex-wrap items-baseline justify-between gap-3 text-ink-secondary">
				<h2 id="marquee-title" className="label flex items-center gap-3 text-ink">
					<span aria-hidden="true" className="relative flex h-2 w-2">
						<span className="absolute inset-0 animate-ping rounded-full bg-[color:var(--crew-coral-fill)] opacity-60 motion-reduce:hidden" />
						<span className="relative h-2 w-2 rounded-full bg-[color:var(--crew-coral-fill)]" />
					</span>
					Check-ins, as they land
				</h2>
				<p>Every photo has a name on it</p>
			</Container>
			<div className="space-y-3 sm:space-y-4">
				{ROWS.map((row, i) => (
					<Row key={i} items={row.items} reverse={row.reverse} />
				))}
			</div>
		</section>
	)
}

function Row({ items, reverse }: { items: CheckIn[]; reverse: boolean }) {
	const [isHeld, setIsHeld] = useState(false)
	return (
		<div
			className="marquee-mask group/row overflow-hidden motion-reduce:overflow-x-auto"
			data-held={isHeld || undefined}
			onPointerUp={(e) => {
				if (e.pointerType !== 'mouse') setIsHeld((held) => !held)
			}}
		>
			<ul
				className={cn('marquee-track flex w-max', reverse && 'marquee-reverse')}
				style={{ '--loop': `${LOOP_S + items.length}s` } as CssVars}
			>
				{[0, 1].map((copy) =>
					items.map((c) => <Card key={`${copy}-${c.photo}`} item={c} isCopy={copy === 1} />)
				)}
			</ul>
		</div>
	)
}

function Card({ item, isCopy }: { item: CheckIn; isCopy: boolean }) {
	return (
		<li
			aria-hidden={isCopy || undefined}
			className="group/card relative mr-3 w-[150px] shrink-0 sm:mr-4 sm:w-[208px]"
		>
			<div className="relative aspect-[4/5] overflow-hidden rounded-[6px] bg-surface2">
				<Image
					src={photoSrc(item.photo)}
					alt={`${item.name}'s check-in: ${item.habit.toLowerCase()}`}
					fill
					sizes="(min-width: 640px) 208px, 150px"
					className="object-cover transition-transform duration-slow ease-out group-hover/card:scale-[1.05]"
				/>
				<span className="label absolute left-2 top-2 rounded-[3px] bg-[color:var(--crew-coral-fill)] px-1.5 py-0.5 text-[9px] text-[color:var(--crew-coral-on-fill)]">
					In
				</span>
				{/* The AI judge's line, as the app shows it under a verdict, rising on hover. */}
				<span className="absolute inset-x-0 bottom-0 translate-y-full bg-bg px-2.5 py-2 text-[12px] leading-snug text-ink transition-transform duration-base ease-out group-hover/card:translate-y-0 sm:text-[13px]">
					<span className="label block pb-0.5 text-[9px] text-ink-tertiary">The judge</span>
					{item.line}
				</span>
				<span className="pointer-events-none absolute inset-0 rounded-[6px] opacity-0 shadow-[inset_0_0_0_1.5px_var(--crew-coral-line)] transition-opacity duration-base group-hover/card:opacity-100" />
			</div>
			<p className="label mt-2 flex items-center justify-between gap-2 text-[10px] sm:text-[11px]">
				<span className="text-ink transition-colors duration-base group-hover/card:text-[color:var(--crew-coral-ink)]">
					{item.name}
				</span>
				<span className="tabular-nums text-ink-tertiary">{item.time}</span>
			</p>
			<p className="label mt-1 text-[10px] text-ink-secondary sm:text-[11px]">{item.habit}</p>
		</li>
	)
}
