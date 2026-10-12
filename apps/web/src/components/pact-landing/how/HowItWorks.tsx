'use client'

import { useEffect, useRef, useState } from 'react'
import { useInView, useMotionValueEvent, useScroll } from 'motion/react'
import { Container } from '@/components/Container'
import { LineReveal } from '@/components/motion/LineReveal'
import { Reveal } from '@/components/motion/Reveal'
import { scrollToY } from '@/components/site/SmoothScroll'
import { TrackInView } from '@/components/TrackInView'
import { FUNNEL_EVENTS } from '@/lib/analytics/events'
import { cn } from '@/lib/utils'
import { ChallengeVisual } from './ChallengeVisual'
import { PactCardVisual } from './PactCardVisual'
import { ResultsVisual } from './ResultsVisual'

/** The section pins on a desktop with motion allowed; it stacks everywhere else. */
const PIN_QUERY = '(min-width: 1024px) and (prefers-reduced-motion: no-preference)'
const TICKS = 10

type Crew = 'coral' | 'sun' | 'violet'

const STEPS: {
	label: string
	title: [string, string]
	body: string
	crew: Crew
	visual: (isActive: boolean) => React.ReactNode
}[] = [
	{
		label: 'Make the pact',
		title: ['Pick one habit.', 'Put a price on it.'],
		body: '7 to 30 days, 2 to 8 friends, and a stake for whoever slips. One sentence the whole crew agrees to.',
		crew: 'coral',
		visual: (isActive) => <PactCardVisual phase="type" isActive={isActive} />
	},
	{
		label: 'Everyone signs',
		title: ['Everyone signs.', 'Nobody gets to forget.'],
		body: 'Each friend signs the same promise with a finger. The signatures stay on the pact until the last day.',
		crew: 'coral',
		visual: (isActive) => <PactCardVisual phase="sign" isActive={isActive} />
	},
	{
		label: 'The daily challenge',
		title: ['One photo a day.', 'With a twist.'],
		body: 'Each day brings a small challenge, so yesterday’s photo won’t pass. An AI takes a look and adds a deadpan line.',
		crew: 'sun',
		visual: (isActive) => <ChallengeVisual isActive={isActive} />
	},
	{
		label: 'The results',
		title: ['The wall remembers.', 'Someone pays.'],
		body: 'A day counts only when the whole crew is in. When the pact ends, the gaps add up, and the stake lands on whoever left them.',
		crew: 'violet',
		visual: (isActive) => <ResultsVisual isActive={isActive} />
	}
]

const pad = (n: number) => String(n).padStart(2, '0')

/**
 * How a pact works. On a desktop it pins for four screens: the step's copy on the left, its visual
 * (built from the product's own pieces, not screenshots) in the middle, and a rail of 01–04 on the
 * right whose ticks fill as you scroll; the ground takes each step's crew colour. On a phone, or
 * with reduced motion, the steps stack and each plays as it scrolls into view.
 */
export function HowItWorks() {
	const ref = useRef<HTMLElement>(null)
	const [isPinned, setIsPinned] = useState(false)
	const [step, setStep] = useState(0)
	const [ticks, setTicks] = useState(0)
	const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })

	useEffect(() => {
		const query = window.matchMedia(PIN_QUERY)
		const update = () => setIsPinned(query.matches)
		update()
		query.addEventListener('change', update)
		return () => query.removeEventListener('change', update)
	}, [])

	useMotionValueEvent(scrollYProgress, 'change', (p) => {
		const at = Math.min(Math.max(p, 0) * STEPS.length, STEPS.length - 0.001)
		const current = Math.floor(at)
		setStep(current)
		setTicks(Math.floor((at - current) * TICKS) + 1)
	})

	function goTo(i: number) {
		const el = ref.current
		if (!el) return
		const top = el.getBoundingClientRect().top + window.scrollY
		const travel = el.offsetHeight - window.innerHeight
		scrollToY(top + (travel * (i + 0.15)) / STEPS.length)
	}

	return (
		<section id="how" ref={ref} aria-labelledby="how-title" className="how relative">
			<TrackInView name={FUNNEL_EVENTS.storyView} />
			<div className="how-pin">
				{/* The ground takes the current step's crew colour. */}
				{(['coral', 'sun', 'violet'] as const).map((crew) => (
					<div
						key={crew}
						aria-hidden="true"
						className="how-tint absolute inset-0 hidden transition-opacity duration-700 lg:block"
						style={{
							backgroundColor: `var(--crew-${crew}-deep)`,
							opacity: isPinned && STEPS[step]?.crew === crew ? 1 : 0
						}}
					/>
				))}
				<div
					aria-hidden="true"
					className="construction-grid absolute inset-0 [--grid-focus:62%_55%]"
				/>

				<Container className="how-grid relative py-20 sm:py-28">
					<Reveal className="how-head mb-12 lg:mb-0">
						<p className="label flex items-center gap-3 text-ink-secondary">
							<span aria-hidden="true" className="h-px w-8 bg-[color:var(--crew-coral-line)]" />
							How it works
						</p>
						<LineReveal
							as="h2"
							id="how-title"
							isOnView
							className="t-h1 mt-4"
							lines={[{ text: 'Four steps.' }, { text: 'One promise.', muted: true }]}
						/>
					</Reveal>

					{STEPS.map((s, i) => (
						<Step key={s.label} index={i} isCurrent={step === i} isPinned={isPinned} {...s} />
					))}

					<nav aria-label="Steps" className="how-rail flex-col gap-6">
						{STEPS.map((s, i) => (
							<button
								key={s.label}
								type="button"
								onClick={() => goTo(i)}
								aria-current={step === i ? 'step' : undefined}
								aria-label={`Step ${i + 1}: ${s.label}`}
								className="group flex items-start gap-3 text-left"
							>
								<span
									className={cn(
										'label w-5 pt-px text-[11px] transition-colors duration-base',
										step === i ? 'text-ink' : 'text-ink-tertiary group-hover:text-ink-secondary'
									)}
								>
									{pad(i + 1)}
								</span>
								<span aria-hidden="true" className="flex flex-col gap-[5px] pt-1">
									{Array.from({ length: TICKS }, (_, t) => {
										const filled = i < step || (i === step && t < ticks)
										return (
											<span
												key={t}
												className={cn(
													'h-px origin-left transition-[transform,background-color] duration-300',
													t === 0 ? 'w-5' : 'w-3',
													filled
														? `scale-x-100 ${i === step && t === ticks - 1 ? 'bg-[color:var(--crew-coral-line)]' : 'bg-ink'}`
														: 'scale-x-75 bg-ink-tertiary/50'
												)}
											/>
										)
									})}
								</span>
							</button>
						))}
					</nav>
				</Container>
			</div>
		</section>
	)
}

function Step({
	index,
	label,
	title,
	body,
	visual,
	isCurrent,
	isPinned
}: (typeof STEPS)[number] & { index: number; isCurrent: boolean; isPinned: boolean }) {
	const visualRef = useRef<HTMLDivElement>(null)
	const inView = useInView(visualRef, { amount: 0.45 })
	const isActive = isPinned ? isCurrent : inView

	return (
		<>
			<div
				className="how-copy mt-14 first-of-type:mt-0 lg:mt-0"
				data-current={isCurrent || undefined}
			>
				<p className="label flex items-center gap-2 text-ink-secondary">
					<span className="text-ink">{pad(index + 1)}</span> / {label}
				</p>
				<h3 className="t-h2 mt-3 text-balance">
					{title[0]} <span className="block text-ink-tertiary">{title[1]}</span>
				</h3>
				<p className="mt-4 max-w-[38ch] text-pretty text-ink-secondary">{body}</p>
			</div>
			<div
				ref={visualRef}
				className="how-visual mt-8 lg:mt-0"
				data-current={isCurrent || undefined}
				aria-hidden={isPinned && !isCurrent ? true : undefined}
			>
				{visual(isActive)}
			</div>
		</>
	)
}
