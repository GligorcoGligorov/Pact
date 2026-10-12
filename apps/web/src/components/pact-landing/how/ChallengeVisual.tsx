'use client'

import Image from 'next/image'
import { motion } from 'motion/react'
import { photoSrc } from '../photos'
import { useLocalCountdown } from '../useLocalCountdown'
import { useBeats } from './useBeats'

/** Ms from activation: the camera comes up, the shutter fires, the verdict lands. */
const BEATS = [900, 2100, 2450] as const
const CAMERA = 1
const SHUTTER = 2
const VERDICT = 3
/** The photo that answers "something red". */
const RED_PHOTO = 19

/**
 * Step 03 in the sun crew's colour: the day's challenge full-bleed with the clock ticking, then the
 * camera comes up over it, the shutter fires (a flash, the button pressed), and the verdict and
 * the judge's line land on the photo.
 */
export function ChallengeVisual({ isActive }: { isActive: boolean }) {
	const beat = useBeats(isActive, BEATS)
	const countdown = useLocalCountdown()

	return (
		<div className="relative mx-auto aspect-[6/5] w-full max-w-[620px]">
			<div className="corner-marks absolute left-0 top-0 flex h-[86%] w-[64%] flex-col justify-between rounded-[10px] bg-[color:var(--crew-sun-fill)] p-5 text-[color:var(--crew-sun-on-fill)] [--mark-ink:var(--crew-sun-line)] sm:p-7">
				<div className="label flex justify-between text-[10px] opacity-70 sm:text-xs">
					<span>Day 09 · today’s challenge</span>
				</div>
				<p className="font-display text-[1.9rem] font-semibold leading-[0.98] tracking-[-0.045em] sm:text-[3.1rem]">
					Include
					<br />
					something
					<br />
					red.
				</p>
				<div className="flex items-center gap-4">
					{/* The shutter: pressed on the beat. */}
					<motion.span
						aria-hidden="true"
						className="grid h-11 w-11 place-items-center rounded-full border-2 border-[color:var(--crew-sun-on-fill)] sm:h-14 sm:w-14"
						animate={{ scale: beat === SHUTTER ? 0.82 : 1 }}
						transition={{ type: 'spring', stiffness: 600, damping: 18 }}
					>
						<span className="h-7 w-7 rounded-full bg-[color:var(--crew-sun-on-fill)] sm:h-10 sm:w-10" />
					</motion.span>
					<span className="label text-[10px] tabular-nums sm:text-xs">{countdown} left</span>
				</div>
			</div>

			<motion.div
				className="absolute bottom-0 right-0 w-[48%]"
				initial={false}
				animate={
					beat >= CAMERA ? { opacity: 1, y: 0, rotate: 2.5 } : { opacity: 0, y: 60, rotate: 7 }
				}
				transition={{ type: 'spring', stiffness: 170, damping: 22 }}
			>
				<div className="relative aspect-[4/5] overflow-hidden rounded-[8px] bg-surface2 shadow-overlay">
					<Image
						src={photoSrc(RED_PHOTO)}
						alt="A check-in photo of red flowers against the sky"
						fill
						sizes="(min-width: 1024px) 300px, 45vw"
						className="object-cover"
					/>
					{/* Viewfinder brackets until the shot is taken. */}
					<motion.span
						aria-hidden="true"
						className="corner-marks absolute inset-4 [--mark-ink:white] [--mark-out:0px] [--mark:18px]"
						animate={{ opacity: beat >= VERDICT ? 0 : 1 }}
					/>
					<motion.span
						aria-hidden="true"
						className="absolute inset-0 bg-white"
						initial={false}
						animate={{ opacity: beat === SHUTTER ? [0, 0.9, 0] : 0 }}
						transition={{ duration: 0.38, times: [0, 0.2, 1] }}
					/>
					<motion.span
						className="label absolute left-3 top-3 rounded-[3px] bg-[color:var(--crew-coral-fill)] px-2 py-1 text-[10px] text-[color:var(--crew-coral-on-fill)]"
						initial={false}
						animate={beat >= VERDICT ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.5 }}
						transition={{ type: 'spring', stiffness: 520, damping: 18 }}
					>
						In · 12:24
					</motion.span>
					<motion.span
						className="absolute inset-x-0 bottom-0 bg-bg px-3 py-2.5 text-[13px] leading-snug text-ink"
						initial={false}
						animate={{ y: beat >= VERDICT ? '0%' : '101%' }}
						transition={{ type: 'spring', stiffness: 260, damping: 28, delay: 0.15 }}
					>
						<span className="label block pb-0.5 text-[9px] text-ink-tertiary">The judge</span>
						The challenge, in bloom.
					</motion.span>
				</div>
			</motion.div>
		</div>
	)
}
