'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useInView, useMotionValueEvent, useScroll, useTransform } from 'motion/react'
import { pledgeLine } from '@app/contract'
import { DrawnSignature } from '@/components/wall/DrawnSignature'
import { PresenceWall } from '@/components/wall/PresenceWall'
import { Stamp } from '@/components/wall/Stamp'
import { cn, type CssVars } from '@/lib/utils'
import type { ResultPage } from '@/server/pacts/result-page'
import { ResultActions } from './ResultActions'

const pad = (n: number) => String(n).padStart(2, '0')
const CHAPTERS = ['The wall', 'The awards', 'Who pays', 'The pact'] as const
/** The drumroll before who pays: one mono beat a second, as the app's reveal counts down. */
const DRUMROLL = [3, 2, 1] as const
const BEAT_MS = 650

/**
 * The results as the app's stories, scrolled: a cover, then four chapters (the whole wall, the
 * awards and scores, who pays after a drumroll, the signed pact) that pin and stack on a desktop,
 * each sliding over the last while the one beneath sinks back, under a story rail of four
 * segments. On a phone, or with reduced motion, they flow and reveal as they arrive. Presence
 * only: never a photo, a verdict or a caption (R25).
 */
export function ResultStories({ page }: { page: ResultPage }) {
	const stack = useRef<HTMLDivElement>(null)
	const { scrollYProgress } = useScroll({ target: stack, offset: ['start start', 'end end'] })
	const [filled, setFilled] = useState(0)
	useMotionValueEvent(scrollYProgress, 'change', (p) => setFilled(p * CHAPTERS.length))

	const loser = page.members.find((m) => m.isLoser)
	const signed = page.members.filter((m) => m.signature)

	return (
		<>
			{/* The story rail: one segment per chapter, filling as you read. */}
			<div
				aria-hidden="true"
				className="pointer-events-none fixed inset-x-0 top-0 z-40 mx-auto hidden max-w-[1120px] gap-1.5 px-8 pt-4 lg:flex"
			>
				{CHAPTERS.map((c, i) => (
					<span key={c} className="h-[3px] flex-1 overflow-hidden rounded-full bg-line-soft">
						<span
							className="block h-full origin-left bg-ink"
							style={{ transform: `scaleX(${Math.min(Math.max(filled - i, 0), 1)})` }}
						/>
					</span>
				))}
			</div>

			<Cover page={page} />

			<div ref={stack} className="results-stack">
				<Chapter index={0} title={['Every day,', 'every one of you.']}>
					<WallChapter page={page} />
				</Chapter>

				<Chapter index={1} title={['Who did what.', 'And how often.']}>
					<AwardsChapter page={page} />
				</Chapter>

				<Chapter index={2} isLoud title={null}>
					<WhoPays
						headline={page.headline}
						nobodyPays={page.nobodyPays}
						record={
							loser
								? `${loser.daysDone} of ${loser.daysHeld} days. ${loser.daysHeld - loser.daysDone} short.`
								: null
						}
					/>
				</Chapter>

				<Chapter index={3} title={['Signed.', 'Kept, mostly.']}>
					<PactChapter page={page} signed={signed} />
				</Chapter>
			</div>
		</>
	)
}

function Cover({ page }: { page: ResultPage }) {
	return (
		<section className="relative mx-auto flex min-h-[88svh] w-full max-w-[1120px] flex-col justify-center px-5 pb-16 pt-10 sm:px-8">
			<p className="label enter flex items-center gap-3 text-ink-secondary">
				<span aria-hidden="true" className="h-px w-8 bg-[color:var(--crew-line)]" />
				That’s a wrap · {page.totalDays} days
			</p>
			<h1 className="mt-5">
				<span className="line-clip t-hero-pact">
					<span className="line-rise">{page.name}</span>
				</span>
				<span className="line-clip t-h1 mt-2">
					<span className="line-rise text-ink-tertiary" style={{ '--i': 1 } as CssVars}>
						{page.keptDays} of {page.totalDays} days, kept together.
					</span>
				</span>
			</h1>
			<dl
				className="enter label mt-10 flex flex-wrap gap-x-10 gap-y-4 border-y border-line-hairline py-4 text-ink-secondary"
				style={{ '--enter-delay': '360ms' } as CssVars}
			>
				<Fact label="Kept" value={`${pad(page.keptDays)} / ${pad(page.totalDays)}`} />
				<Fact label="Best run" value={pad(page.bestStreak)} />
				<Fact label="Crew" value={pad(page.members.length)} />
				<Fact label="Habit" value={page.habit} />
			</dl>
			<p
				className="label enter mt-12 flex items-center gap-2 text-ink-tertiary"
				style={{ '--enter-delay': '600ms' } as CssVars}
			>
				<span aria-hidden="true" className="inline-block animate-bounce motion-reduce:animate-none">
					↓
				</span>
				Scroll for the results
			</p>
		</section>
	)
}

/** A chapter: pinned and stacked on a desktop (`.results-chapter`), sinking as the next covers it. */
function Chapter({
	index,
	title,
	isLoud,
	children
}: {
	index: number
	title: [string, string] | null
	isLoud?: boolean
	children: React.ReactNode
}) {
	const ref = useRef<HTMLElement>(null)
	const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
	const scale = useTransform(scrollYProgress, [0, 1], [1, 0.94])
	const dim = useTransform(scrollYProgress, [0, 1], [0, 0.55])

	return (
		<section
			ref={ref}
			aria-label={CHAPTERS[index]}
			className={cn(
				'results-chapter relative overflow-hidden',
				isLoud
					? 'bg-[color:var(--crew-fill)] text-[color:var(--crew-on-fill)]'
					: 'border-t border-line-hairline bg-bg'
			)}
		>
			<motion.div className="results-chapter-body" style={{ scale }}>
				<div className="mx-auto grid h-full w-full max-w-[1120px] items-center gap-10 px-5 py-20 sm:px-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16 lg:py-24">
					{title ? (
						<Reveal>
							<p className="label text-ink-secondary">
								<span className="text-ink">{pad(index + 1)}</span> / {pad(CHAPTERS.length)} ·{' '}
								{CHAPTERS[index]}
							</p>
							<h2 className="t-h1 mt-4">
								{title[0]} <span className="block text-ink-tertiary">{title[1]}</span>
							</h2>
						</Reveal>
					) : null}
					<div className={title ? undefined : 'lg:col-span-2'}>{children}</div>
				</div>
			</motion.div>
			{/* The chapter beneath sinks into the dark as the next slides over it. */}
			<motion.div
				aria-hidden="true"
				className="pointer-events-none absolute inset-0 hidden bg-bg lg:block"
				style={{ opacity: dim }}
			/>
		</section>
	)
}

function Reveal({
	children,
	delay = 0,
	className
}: {
	children: React.ReactNode
	delay?: number
	className?: string
}) {
	return (
		<motion.div
			className={className}
			initial={{ opacity: 0, y: 28 }}
			whileInView={{ opacity: 1, y: 0 }}
			viewport={{ once: true, amount: 0.4 }}
			transition={{ duration: 0.7, delay, ease: [0.2, 0.9, 0.1, 1] }}
		>
			{children}
		</motion.div>
	)
}

function WallChapter({ page }: { page: ResultPage }) {
	const ref = useRef<HTMLDivElement>(null)
	const inView = useInView(ref, { once: true, amount: 0.35 })
	return (
		<div
			ref={ref}
			className={cn(
				'corner-marks relative rounded-[10px] border border-line-soft bg-surface p-5 transition-opacity duration-300 sm:p-6',
				inView ? 'opacity-100' : 'opacity-0'
			)}
		>
			<div className="label mb-4 flex justify-between text-ink-secondary">
				<span className="text-ink">The wall</span>
				<span>
					{page.keptDays} / {page.totalDays} kept
				</span>
			</div>
			{/* Mounted on arrival, so it assembles in front of the reader. */}
			{inView ? (
				<PresenceWall
					days={page.wall}
					members={page.members.map((m) => ({ userId: m.userId, name: m.name }))}
					label={(_, i) => pad(page.wall.length - i)}
					compact
					isBuilt
				/>
			) : (
				<div style={{ height: page.wall.length * 20 + 24 }} />
			)}
		</div>
	)
}

function AwardsChapter({ page }: { page: ResultPage }) {
	return (
		<div className="grid gap-10 sm:grid-cols-2">
			<ul className="space-y-5">
				{page.awards.map((award, i) => (
					<li key={award.title}>
						<Reveal delay={i * 0.12}>
							<span className="label text-[color:var(--crew-ink)]">
								{pad(i + 1)} / {award.title}
							</span>
							<span className="mt-1 block font-display text-[1.75rem] font-semibold leading-tight tracking-[-0.03em] text-ink">
								{award.names}
							</span>
						</Reveal>
					</li>
				))}
			</ul>
			<Reveal delay={0.2}>
				<p className="label text-ink-secondary">Final scores</p>
				<ol className="mt-3 divide-y divide-line-hairline border-y border-line-hairline">
					{page.members.map((m, i) => (
						<li key={m.userId} className="flex items-baseline gap-3 py-3">
							<span className="label w-6 text-ink-tertiary">{pad(i + 1)}</span>
							<span className="min-w-0 flex-1 truncate font-semibold text-ink">{m.name}</span>
							<span className="label tabular-nums text-ink-secondary">
								{pad(m.daysDone)} / {pad(m.daysHeld)}
							</span>
							{m.isLoser ? (
								<span className="label rounded-[3px] bg-[color:var(--crew-fill)] px-1.5 py-0.5 text-[10px] text-[color:var(--crew-on-fill)]">
									Pays
								</span>
							) : null}
						</li>
					))}
				</ol>
			</Reveal>
		</div>
	)
}

/** Who pays, after a drumroll: 3, 2, 1, then the headline lands line by line. */
function WhoPays({
	headline,
	nobodyPays,
	record
}: {
	headline: string
	nobodyPays: boolean
	record: string | null
}) {
	const ref = useRef<HTMLDivElement>(null)
	const inView = useInView(ref, { once: true, amount: 0.5 })
	const [beat, setBeat] = useState(0)
	useEffect(() => {
		if (!inView) return
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches)
			return setBeat(DRUMROLL.length)
		const timers = DRUMROLL.map((_, i) => setTimeout(() => setBeat(i + 1), (i + 1) * BEAT_MS))
		return () => timers.forEach(clearTimeout)
	}, [inView])
	const isRevealed = beat >= DRUMROLL.length
	const words = headline.replace(/\.$/, '').split(' ')
	const cut = Math.ceil(words.length / 2)
	const lines = [words.slice(0, cut).join(' '), `${words.slice(cut).join(' ')}.`]

	return (
		<div ref={ref} className="flex min-h-[60svh] flex-col justify-center">
			<p className="label text-[color:var(--crew-on-fill-muted)]">
				03 / 04 · {nobodyPays ? 'Everybody wins' : 'Who pays'}
			</p>
			<div className="relative mt-6 min-h-[2.2em] font-display text-[clamp(3.4rem,1.6rem+7vw,8rem)] font-semibold leading-[0.92] tracking-[-0.055em]">
				<span aria-live="polite" className="sr-only">
					{isRevealed ? headline : ''}
				</span>
				{!isRevealed ? (
					<motion.span
						key={beat}
						aria-hidden="true"
						className="absolute left-0 top-0 font-mono tabular-nums"
						initial={{ opacity: 0, scale: 1.3 }}
						animate={{ opacity: inView ? 1 : 0, scale: 1 }}
						transition={{ type: 'spring', stiffness: 500, damping: 24 }}
					>
						{pad(DRUMROLL[Math.min(beat, DRUMROLL.length - 1)]!)}
					</motion.span>
				) : (
					<span aria-hidden="true">
						{lines.map((line, i) => (
							<span key={line} className="block overflow-hidden pb-[0.06em]">
								<motion.span
									className={cn('block', i === 1 && 'text-[color:var(--crew-on-fill-large)]')}
									initial={{ y: '105%' }}
									animate={{ y: '0%' }}
									transition={{ type: 'spring', stiffness: 170, damping: 22, delay: i * 0.12 }}
								>
									{line}
								</motion.span>
							</span>
						))}
					</span>
				)}
			</div>
			{record ? (
				<motion.p
					className="label mt-8 text-[color:var(--crew-on-fill-muted)]"
					initial={false}
					animate={{ opacity: isRevealed ? 1 : 0 }}
					transition={{ delay: 0.4 }}
				>
					{record}
				</motion.p>
			) : null}
		</div>
	)
}

function PactChapter({ page, signed }: { page: ResultPage; signed: ResultPage['members'] }) {
	const ref = useRef<HTMLDivElement>(null)
	const inView = useInView(ref, { once: true, amount: 0.5 })
	const [isStamped, setIsStamped] = useState(false)
	useEffect(() => {
		if (!inView) return
		const timer = setTimeout(() => setIsStamped(true), 600 + signed.length * 450)
		return () => clearTimeout(timer)
	}, [inView, signed.length])

	return (
		<div className="space-y-8">
			<div
				ref={ref}
				className="corner-marks relative rounded-[10px] border border-line-soft bg-surface p-6 sm:p-8"
			>
				<div className="label flex justify-between border-b border-line-hairline pb-4 text-ink-secondary">
					<span className="flex items-center gap-2 text-ink">
						<span
							aria-hidden="true"
							className="h-1.5 w-1.5 rounded-full bg-[color:var(--crew-fill)]"
						/>
						The pact
					</span>
					<span>{page.name}</span>
				</div>
				<p className="mt-6 font-display text-[1.45rem] font-semibold leading-[1.22] tracking-[-0.03em] text-ink sm:text-[1.75rem]">
					{pledgeLine(null, page.habit, page.cadence, page.totalDays, page.stake)}
				</p>
				{signed.length > 0 ? (
					<ul className="mt-8 grid grid-cols-2 gap-x-6 gap-y-5">
						{signed.map((m, i) => (
							<li key={m.userId}>
								<div className="relative h-14 border-b border-dashed border-line-soft text-ink">
									<DrawnSignature
										path={m.signature!}
										isDrawn={inView}
										delay={0.3 + i * 0.45}
										className="absolute bottom-1 left-0 h-[3.4rem] w-auto"
									/>
								</div>
								<span className="label mt-2 block text-[10px] text-ink-tertiary">
									{m.name.split(' ')[0]}
								</span>
							</li>
						))}
					</ul>
				) : null}
				<Stamp isDown={isStamped}>
					Kept · {page.keptDays} / {page.totalDays}
				</Stamp>
			</div>
			<ResultActions pactId={page.pactId} />
		</div>
	)
}

function Fact({ label, value }: { label: string; value: string }) {
	return (
		<div>
			<dt className="text-[10px] text-ink-tertiary">{label}</dt>
			<dd className="mt-1 tabular-nums text-ink">{value}</dd>
		</div>
	)
}
