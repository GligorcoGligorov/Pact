'use client'

import { motion } from 'motion/react'
import { CREW } from '../photos'
import { useBeats } from './useBeats'

/** The finished demo pact from `npm run seed:demo -- --finished`: Sunrise Yoga, 14 days. */
const DAYS = 14
/** Day offsets each member missed (the seed's FINISHED_MISSES). */
const MISSES: Record<(typeof CREW)[number], number[]> = {
	Ana: [],
	Ben: [3],
	Cleo: [],
	Dan: [3, 10]
}
const KEPT = Array.from({ length: DAYS }, (_, d) => CREW.every((m) => !MISSES[m].includes(d)))
const KEPT_DAYS = KEPT.filter(Boolean).length

/** Ms from activation: the wall is built, then it steps back for the verdict. */
const BEATS = [DAYS * 55 + 500, DAYS * 55 + 1100] as const
const REVEAL = 2

/**
 * Step 04 in the violet crew's colour: the whole pact's wall lands day by day (a missed day is a
 * dashed tile; a broken day loses its frame), then it steps back and the stake lands on whoever
 * left the gaps: Dan buys the coffees.
 */
export function ResultsVisual({ isActive }: { isActive: boolean }) {
	const beat = useBeats(isActive, BEATS)
	const pad = (n: number) => String(n).padStart(2, '0')

	return (
		<div className="corner-marks relative mx-auto w-full max-w-[560px] [--mark-ink:var(--crew-violet-line)]">
			<div className="relative overflow-hidden rounded-[10px] border border-line-soft bg-[color:var(--crew-violet-deep)] p-5 sm:p-8">
				<div className="label flex justify-between text-[10px] text-ink-secondary sm:text-xs">
					<span className="flex items-center gap-2 text-ink">
						<span
							aria-hidden="true"
							className="h-1.5 w-1.5 rounded-full bg-[color:var(--crew-violet-fill)]"
						/>
						Sunrise Yoga
					</span>
					<span>That’s a wrap · {DAYS} days</span>
				</div>

				<motion.div
					className="mt-5"
					animate={{ opacity: beat >= REVEAL ? 0.13 : 1, scale: beat >= REVEAL ? 0.96 : 1 }}
					transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
					aria-hidden="true"
				>
					<div className="label mb-1.5 grid grid-cols-[1.75rem_repeat(4,1fr)] gap-1 text-[9px] text-ink-tertiary">
						<span />
						{CREW.map((m) => (
							<span key={m}>{m}</span>
						))}
					</div>
					<div className="space-y-1">
						{KEPT.map((kept, d) => (
							<motion.div
								key={d}
								className="grid grid-cols-[1.75rem_1fr] items-center"
								initial={false}
								animate={isActive || beat > 0 ? { opacity: 1, y: 0 } : { opacity: 0, y: -8 }}
								transition={{ delay: isActive ? d * 0.055 : 0, duration: 0.3 }}
							>
								<span className="label text-[9px] text-ink-tertiary">{pad(d + 1)}</span>
								<div
									className={`grid grid-cols-4 gap-1 rounded-[4px] border p-[2px] ${kept ? 'border-[color:var(--crew-violet-line)]' : 'border-transparent'}`}
								>
									{CREW.map((m) =>
										MISSES[m].includes(d) ? (
											<span
												key={m}
												className="h-3 rounded-[2px] border border-dashed border-[color:var(--crew-violet-line)] sm:h-3.5"
											/>
										) : (
											<span
												key={m}
												className="h-3 rounded-[2px] bg-[color:var(--crew-violet-fill)] sm:h-3.5"
											/>
										)
									)}
								</div>
							</motion.div>
						))}
					</div>
				</motion.div>

				<div className="absolute inset-x-5 bottom-6 sm:inset-x-8 sm:bottom-9">
					<motion.p
						className="label text-[10px] text-[color:var(--crew-violet-ink)] sm:text-xs"
						initial={false}
						animate={beat >= REVEAL ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
						transition={{ duration: 0.4 }}
					>
						{KEPT_DAYS} of {DAYS} kept · 2 broken, both Dan’s
					</motion.p>
					<p className="mt-2 font-display text-[2.6rem] font-semibold leading-[0.95] tracking-[-0.05em] sm:text-[4rem]">
						{['Dan buys', 'the coffees.'].map((line, i) => (
							<span key={line} className="block overflow-hidden pb-[0.08em]">
								<motion.span
									className={`block ${i === 1 ? 'text-ink-tertiary' : 'text-ink'}`}
									initial={false}
									animate={{ y: beat >= REVEAL ? '0%' : '110%' }}
									transition={{ type: 'spring', stiffness: 180, damping: 24, delay: i * 0.1 }}
								>
									{line}
								</motion.span>
							</span>
						))}
					</p>
				</div>
			</div>
		</div>
	)
}
