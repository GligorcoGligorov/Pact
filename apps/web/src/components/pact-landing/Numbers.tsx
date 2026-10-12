'use client'

import { useEffect, useRef, useState } from 'react'
import {
	animate,
	motion,
	useInView,
	useReducedMotion,
	useScroll,
	useTransform,
	type MotionValue
} from 'motion/react'
import { Container } from '@/components/Container'
import { LineReveal } from '@/components/motion/LineReveal'
import { Reveal } from '@/components/motion/Reveal'

/**
 * Counted from the two demo crews `npm run seed:demo -- --finished` makes: the run club (7 closed
 * days, 6 kept; 26 photos before today, 2 today) and Sunrise Yoga (14 days, 12 kept, 52 photos).
 */
const STATS = [
	{ value: 18, label: 'Days kept', note: 'Every one a full row' },
	{ value: 80, label: 'Photos', note: 'Each with a name and a time' },
	{ value: 2, label: 'Crews', note: 'Four friends, two pacts' },
	{ value: 1, label: 'Round of coffees', note: 'On Dan', isCrew: true }
] as const

/** How long a number counts up, s. */
const COUNT_S = 1.4

const pad = (n: number) => String(n).padStart(2, '0')

/**
 * The line that joins the four stats is a signature: one handwritten flourish, loop by loop, in a
 * 1000×100 box, a segment from each stat to the next; the last one runs on as the coral underline.
 */
const SEGMENTS = [
	'M8 76 C 60 76, 84 30, 126 38 C 158 44, 140 82, 116 72 C 96 62, 150 22, 258 24',
	'M258 24 C 318 26, 344 82, 386 76 C 424 70, 406 40, 390 48 C 372 58, 424 74, 508 70',
	'M508 70 C 566 68, 600 18, 644 24 C 684 30, 668 62, 650 54 C 632 46, 690 16, 758 18 C 830 20, 890 26, 990 34'
] as const
/** Where the flourish passes over each stat. */
const NODES = [
	[8, 76],
	[258, 24],
	[508, 70],
	[758, 18]
] as const

/**
 * The demo crews in four numbers, big and mono, counting up as they arrive; on a desktop a line
 * draws itself from one to the next as the section scrolls through, and ends in coral on the one
 * that matters: who buys the coffees.
 */
export function Numbers() {
	const ref = useRef<HTMLElement>(null)
	const { scrollYProgress } = useScroll({ target: ref, offset: ['start 80%', 'center 50%'] })

	return (
		<section
			ref={ref}
			aria-labelledby="numbers-title"
			className="relative border-t border-line-hairline py-24 sm:py-32"
		>
			<Container>
				<Reveal className="grid gap-6 lg:grid-cols-2 lg:items-end">
					<div>
						<p className="label flex items-center gap-3 text-ink-secondary">
							<span aria-hidden="true" className="h-px w-8 bg-[color:var(--crew-coral-line)]" />
							The demo crews, counted
						</p>
						<LineReveal
							id="numbers-title"
							as="h2"
							isOnView
							className="t-h1 mt-4"
							lines={[{ text: 'Small numbers.' }, { text: 'Every one kept.', muted: true }]}
						/>
					</div>
					<p className="max-w-[40ch] text-pretty text-ink-secondary lg:justify-self-end">
						Two crews, three weeks, one stake. Nothing here is rounded up: it is what their walls
						say.
					</p>
				</Reveal>

				<div className="relative mt-16 lg:mt-24">
					<Wave progress={scrollYProgress} />
					<dl className="grid grid-cols-2 gap-x-6 gap-y-12 lg:grid-cols-4 lg:pt-28">
						{STATS.map((s, i) => (
							<Stat key={s.label} index={i} {...s} />
						))}
					</dl>
				</div>
			</Container>
		</section>
	)
}

function Wave({ progress }: { progress: MotionValue<number> }) {
	return (
		<svg
			aria-hidden="true"
			viewBox="0 0 1000 100"
			preserveAspectRatio="none"
			className="absolute inset-x-0 top-0 hidden h-24 w-full overflow-visible lg:block"
		>
			{SEGMENTS.map((d, i) => (
				<Segment key={d} d={d} index={i} progress={progress} isLast={i === SEGMENTS.length - 1} />
			))}
			{NODES.map(([x, y], i) => (
				<Node key={x} x={x} y={y} index={i} progress={progress} />
			))}
		</svg>
	)
}

/** Each segment draws over its own third of the scroll. */
function Segment({
	d,
	index,
	progress,
	isLast
}: {
	d: string
	index: number
	progress: MotionValue<number>
	isLast: boolean
}) {
	const length = useTransform(progress, [index / 3, (index + 1) / 3], [0, 1], { clamp: true })
	return (
		<>
			<path
				d={d}
				fill="none"
				strokeWidth={1}
				vectorEffect="non-scaling-stroke"
				className="stroke-line-soft"
				strokeDasharray="3 5"
			/>
			<motion.path
				d={d}
				fill="none"
				strokeWidth={isLast ? 2.2 : 1.6}
				strokeLinecap="round"
				vectorEffect="non-scaling-stroke"
				style={{ pathLength: length }}
				className={isLast ? 'stroke-[color:var(--crew-coral-line)]' : 'stroke-ink'}
			/>
		</>
	)
}

/** A node lights when the line reaches it. */
function Node({
	x,
	y,
	index,
	progress
}: {
	x: number
	y: number
	index: number
	progress: MotionValue<number>
}) {
	const opacity = useTransform(
		progress,
		[Math.max(0, index / 3 - 0.02), index / 3 + 0.02],
		[0.25, 1]
	)
	return (
		<motion.circle
			cx={x}
			cy={y}
			r={4}
			vectorEffect="non-scaling-stroke"
			style={{ opacity }}
			className={index === NODES.length - 1 ? 'fill-[color:var(--crew-coral-fill)]' : 'fill-ink'}
		/>
	)
}

function Stat({
	value,
	label,
	note,
	index,
	isCrew
}: {
	value: number
	label: string
	note: string
	index: number
	isCrew?: boolean
}) {
	const ref = useRef<HTMLDivElement>(null)
	const inView = useInView(ref, { once: true, amount: 0.6 })
	const still = useReducedMotion()
	const [shown, setShown] = useState(0)

	useEffect(() => {
		if (!inView) return
		if (still) return setShown(value)
		const controls = animate(0, value, {
			duration: COUNT_S,
			delay: index * 0.12,
			ease: [0.16, 1, 0.3, 1],
			onUpdate: (v) => setShown(Math.round(v))
		})
		return () => controls.stop()
	}, [inView, still, value, index])

	return (
		<div ref={ref} className="relative pt-4 lg:pt-0">
			{/* On a phone the flourish is gone; each stat's rule draws itself instead. */}
			<motion.span
				aria-hidden="true"
				className="absolute inset-x-0 top-0 h-px origin-left bg-line-soft lg:hidden"
				initial={{ scaleX: 0 }}
				animate={{ scaleX: inView ? 1 : 0 }}
				transition={{ duration: 0.9, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
			/>
			<dt className="label text-ink-secondary">
				<span className="text-ink-tertiary">{pad(index + 1)} / </span>
				{label}
			</dt>
			<dd
				className={`mt-3 font-mono text-[clamp(4rem,2rem+7vw,8.5rem)] font-medium tabular-nums leading-[0.9] tracking-[-0.06em] ${isCrew ? 'text-[color:var(--crew-coral-ink)]' : 'text-ink'}`}
			>
				<span className="sr-only">{value}</span>
				<span aria-hidden="true">{pad(shown)}</span>
			</dd>
			<dd className="mt-3 text-sm text-ink-secondary">{note}</dd>
		</div>
	)
}
