'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useAnimationControls } from 'motion/react'
import { Container } from '@/components/Container'
import { LineReveal } from '@/components/motion/LineReveal'
import { Reveal } from '@/components/motion/Reveal'
import { Stamp } from '@/components/wall/Stamp'
import { DrawnSignature } from '@/components/wall/DrawnSignature'
import { gaEvent } from '@/lib/analytics/client'
import { FUNNEL_EVENTS } from '@/lib/analytics/events'
import { PrimaryCta } from './Ctas'
import { SIGNATURES } from './demo-pact'
import { SignaturePad } from './SignaturePad'

const HABIT_MAX = 48
const SUGGESTIONS = [
	'run before work',
	'read 20 pages',
	'no phone after 10',
	'cook, not order'
] as const
/** The stamp comes down this long after the last stroke, ms: long enough to add a flourish. */
const STAMP_AFTER = 900
/** The crew that has already signed: three of the four demo hands. */
const CREW = SIGNATURES.slice(0, 3)

function today(): string {
	return new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}

/**
 * "Your turn.": write your own pledge and sign it, with a mouse or a finger. The pact card beside
 * it takes your words as you type and your signature as you finish each stroke, next to three
 * friends who already signed; then the stamp comes down. Nothing leaves the browser.
 */
export function YourTurn() {
	const [habit, setHabit] = useState('')
	const [signature, setSignature] = useState('')
	const [isStamped, setIsStamped] = useState(false)
	const [date, setDate] = useState('')
	const reported = useRef(false)
	const card = useAnimationControls()

	useEffect(() => setDate(today()), [])

	useEffect(() => {
		setIsStamped(false)
		if (!signature) return
		const timer = setTimeout(() => {
			setIsStamped(true)
			// The thud: the card takes the stamp's weight.
			void card.start({
				scale: [1, 0.985, 1],
				rotate: [0, -0.6, 0.3, 0],
				transition: { duration: 0.42, ease: 'easeOut' }
			})
			if (!reported.current) {
				reported.current = true
				gaEvent(FUNNEL_EVENTS.demoPactSigned)
			}
		}, STAMP_AFTER)
		return () => clearTimeout(timer)
	}, [signature, card])

	const words = habit.trim() || 'run before work'
	return (
		<section
			id="start"
			aria-labelledby="start-title"
			className="relative overflow-hidden py-24 sm:py-32"
		>
			<div
				aria-hidden="true"
				className="construction-grid absolute inset-0 [--grid-focus:70%_50%]"
			/>
			<Container className="relative grid gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
				<div>
					<Reveal>
						<p className="label flex items-center gap-3 text-ink-secondary">
							<span aria-hidden="true" className="h-px w-8 bg-[color:var(--crew-coral-line)]" />
							Demo · nothing is saved
						</p>
						<LineReveal
							id="start-title"
							as="h2"
							isOnView
							className="t-display mt-4"
							lines={[{ text: 'Your turn.' }, { text: 'Sign something.', muted: true }]}
						/>
					</Reveal>

					<Reveal delay={120} className="mt-10">
						<label htmlFor="pledge" className="label block text-ink-secondary">
							01 / I promise to
						</label>
						<input
							id="pledge"
							value={habit}
							onChange={(e) => setHabit(e.target.value.slice(0, HABIT_MAX))}
							placeholder="run before work"
							autoComplete="off"
							className="mt-3 w-full border-b border-line-active bg-transparent pb-3 font-display text-[1.6rem] font-semibold tracking-[-0.03em] text-ink outline-none transition-colors duration-base placeholder:text-ink-disabled focus:border-[color:var(--crew-coral-line)] sm:text-[2rem]"
						/>
						<ul className="mt-4 flex flex-wrap gap-2" aria-label="Ideas">
							{SUGGESTIONS.map((s) => (
								<li key={s}>
									<button
										type="button"
										onClick={() => setHabit(s)}
										className="label rounded-pill border border-line-soft px-3 py-2 text-[10px] text-ink-secondary transition-[color,border-color,transform] duration-fast hover:border-[color:var(--crew-coral-line)] hover:text-ink active:scale-[0.96] aria-pressed:border-[color:var(--crew-coral-line)] aria-pressed:text-ink"
										aria-pressed={habit === s}
									>
										{s}
									</button>
								</li>
							))}
						</ul>
					</Reveal>

					<Reveal delay={200} className="mt-10">
						<p className="label text-ink-secondary">02 / Sign it</p>
						<SignaturePad onSign={setSignature} className="mt-3" />
					</Reveal>
				</div>

				<Reveal delay={160} className="lg:pt-10">
					<motion.div
						animate={card}
						className="corner-marks relative rounded-[10px] border border-line-soft bg-surface p-6 sm:p-9"
					>
						<div className="label flex items-center justify-between border-b border-line-hairline pb-4 text-ink-secondary">
							<span className="flex items-center gap-2 text-ink">
								<span
									aria-hidden="true"
									className="h-1.5 w-1.5 rounded-full bg-[color:var(--crew-coral-fill)]"
								/>
								The pact
							</span>
							<span>Your crew · 21 days</span>
						</div>
						<p
							aria-live="polite"
							className="mt-6 text-balance font-display text-[1.5rem] font-semibold leading-[1.2] tracking-[-0.03em] text-ink sm:text-[1.9rem]"
						>
							I promise to{' '}
							<span
								className={`underline decoration-[color:var(--crew-coral-line)] decoration-2 underline-offset-[0.18em] ${habit.trim() ? '' : 'text-ink-tertiary'}`}
							>
								{words}
							</span>
							, every day for 21 days. If I break it, I buy the coffees.
						</p>

						<ul className="mt-8 grid grid-cols-2 gap-x-6 gap-y-5">
							{CREW.map((s, i) => (
								<li key={s.name}>
									<div className="relative h-14 border-b border-dashed border-line-soft text-ink-secondary">
										<DrawnSignature
											path={s.path}
											isDrawn
											delay={i * 0.25}
											className="absolute bottom-1 left-0 h-[3.6rem] w-auto"
										/>
									</div>
									<span className="label mt-2 block text-[10px] text-ink-tertiary">
										{s.name} · signed
									</span>
								</li>
							))}
							<li>
								<div
									className={`relative h-14 border-b border-dashed text-ink transition-colors duration-base ${signature ? 'border-line-soft' : 'border-[color:var(--crew-coral-line)]'}`}
								>
									{signature ? (
										<DrawnSignature
											key={signature}
											path={signature}
											isDrawn
											isFromStart
											duration={0.6}
											className="absolute bottom-1 left-0 h-[3.6rem] w-full"
										/>
									) : null}
								</div>
								<span
									className={`label mt-2 block text-[10px] ${signature ? 'text-ink-tertiary' : 'animate-[waiting_1.6s_ease-in-out_infinite] text-[color:var(--crew-coral-ink)]'}`}
								>
									You · {signature ? 'signed' : 'waiting on you'}
								</span>
							</li>
						</ul>

						<Stamp isDown={isStamped}>Signed · {date}</Stamp>
						<p className="sr-only" aria-live="polite">
							{isStamped ? 'Signed. Your pact is stamped.' : ''}
						</p>
					</motion.div>

					<div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
						<PrimaryCta href="#join" cta="your_turn">
							Start your pact
						</PrimaryCta>
						<p className="max-w-[26ch] text-sm text-ink-tertiary">
							In the app, your crew signs this card for real.
						</p>
					</div>
				</Reveal>
			</Container>
		</section>
	)
}
