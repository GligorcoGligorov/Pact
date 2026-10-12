'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import {
	AnimatePresence,
	motion,
	useMotionValue,
	useReducedMotion,
	useSpring,
	useTransform
} from 'motion/react'
import { CREW, photoFor, photoSrc } from './photos'
import { useLocalCountdown } from './useLocalCountdown'

const TOTAL_DAYS = 21
/** The day the demo opens on. */
const OPEN_DAY = 8
const ROWS = 3
const DAN = CREW.length - 1

/** The beats of one day on the wall, in ms: each waits on the state before it. */
const BEAT = {
	/** From a new empty row to Ana's photo. */
	first: 650,
	/** Between Ana, Ben and Cleo. */
	step: 420,
	/** Everyone but Dan is in: the wait. */
	waitOnDan: 3000,
	/** Dan's photo lands, then the row locks. */
	lock: 380,
	/** The kept day holds before the next one starts. */
	hold: 2400
} as const

/** How far the stage leans toward the pointer, in degrees, and how far its layers drift, in px. */
const TILT_DEG = 5
const DRIFT_PX = 10

/** A tile's rendered width: a quarter of the wall's column. */
const TILE_SIZES = '(min-width: 1024px) 140px, 22vw'

const FLIP = { type: 'spring', stiffness: 260, damping: 20, mass: 0.9 } as const
const DROP = { type: 'spring', stiffness: 420, damping: 17 } as const
const LEAN = { stiffness: 120, damping: 20, mass: 0.6 } as const

/** A row on the wall: `id` counts days from the opening day, so keys never repeat. */
type Row = { id: number; landed: number; kept: boolean }

const pad = (n: number) => String(n).padStart(2, '0')
const dayOf = (id: number) => ((((OPEN_DAY - 1 + id) % TOTAL_DAYS) + TOTAL_DAYS) % TOTAL_DAYS) + 1
/** Photos per row: offset so the opening rows show the strongest pictures. */
const photo = (id: number, member: number) => photoFor(id + 40, member)

function opening(still: boolean): Row[] {
	return Array.from({ length: ROWS }, (_, i) => ({
		id: -i,
		landed: i === 0 && !still ? 0 : CREW.length,
		kept: i > 0 || still
	}))
}

/** The next state of the top row, and how long until it. */
function nextBeat(rows: Row[]): [number, Row[]] {
	const [top, ...rest] = rows
	if (!top) return [BEAT.hold, rows]
	const land = (landed: number): Row[] => [{ ...top, landed }, ...rest]
	if (top.landed < DAN) return [top.landed === 0 ? BEAT.first : BEAT.step, land(top.landed + 1)]
	if (top.landed === DAN) return [BEAT.waitOnDan, land(CREW.length)]
	if (!top.kept) return [BEAT.lock, [{ ...top, kept: true }, ...rest]]
	return [BEAT.hold, [{ id: top.id + 1, landed: 0, kept: false }, ...rows].slice(0, ROWS)]
}

/**
 * The hero: a crew's wall assembling itself, live. Today's photos flip in one by one and land
 * with a coral glow; Dan's tile waits, dashed and pulsing; then his photo drops in, the row locks
 * and a coral line sweeps across it: DAY KEPT. The next day starts with new photos. The stage
 * leans toward the mouse and its layers drift apart. Off screen it stops; under reduced motion it
 * is one kept wall, still.
 */
export function HeroWall() {
	// Read after mount: the server cannot know, and a first render that differed would not hydrate.
	const prefersStill = useReducedMotion()
	const [still, setStill] = useState(false)
	const [rows, setRows] = useState<Row[]>(() => opening(false))
	const [isActive, setIsActive] = useState(false)
	const root = useRef<HTMLDivElement>(null)
	const countdown = useLocalCountdown()

	useEffect(() => {
		setStill(prefersStill === true)
		if (prefersStill) setRows(opening(true))
	}, [prefersStill])

	// Play only while on screen and the tab is visible.
	useEffect(() => {
		const el = root.current
		if (!el) return
		let inView = false
		const update = () => setIsActive(inView && document.visibilityState === 'visible')
		const io = new IntersectionObserver(([entry]) => {
			inView = entry?.isIntersecting ?? false
			update()
		})
		io.observe(el)
		document.addEventListener('visibilitychange', update)
		return () => {
			io.disconnect()
			document.removeEventListener('visibilitychange', update)
		}
	}, [])

	useEffect(() => {
		if (still || !isActive) return
		const [delay, next] = nextBeat(rows)
		const timer = setTimeout(() => setRows(next), delay)
		return () => clearTimeout(timer)
	}, [rows, isActive, still])

	// The lean: the pointer's position over the window, eased.
	const px = useMotionValue(0)
	const py = useMotionValue(0)
	const sx = useSpring(px, LEAN)
	const sy = useSpring(py, LEAN)
	const rotateY = useTransform(sx, (v) => v * TILT_DEG)
	const rotateX = useTransform(sy, (v) => -v * TILT_DEG)
	const near = useTransform(sx, (v) => v * DRIFT_PX)
	const nearY = useTransform(sy, (v) => v * DRIFT_PX)
	const far = useTransform(sx, (v) => -v * DRIFT_PX * 1.6)
	const farY = useTransform(sy, (v) => -v * DRIFT_PX * 1.6)

	useEffect(() => {
		if (still) return
		const onMove = (e: PointerEvent) => {
			if (e.pointerType !== 'mouse') return
			px.set((e.clientX / window.innerWidth - 0.5) * 2)
			py.set((e.clientY / window.innerHeight - 0.5) * 2)
		}
		window.addEventListener('pointermove', onMove, { passive: true })
		return () => window.removeEventListener('pointermove', onMove)
	}, [still, px, py])

	const top = rows[0]!
	const status =
		top.landed < CREW.length
			? `${top.landed} / ${CREW.length} in · ${top.landed === DAN ? 'waiting on Dan' : 'checking in'}`
			: `${CREW.length} / ${CREW.length} in · day ${pad(dayOf(top.id))} kept`

	return (
		<div ref={root} className="relative [perspective:1400px]">
			{/* The drafting layer drifts against the stage. */}
			<motion.div
				aria-hidden="true"
				className="absolute -inset-x-3 -inset-y-10 text-ink-tertiary sm:-inset-x-16 sm:-inset-y-12"
				style={still ? undefined : { x: far, y: farY }}
			>
				<div className="construction-grid absolute inset-0 [--grid-focus:50%_50%] [--grid:64px]" />
				<span className="crosshair left-[6%] top-[8%]" />
				<span className="crosshair right-[4%] top-[8%]" />
				<span className="crosshair bottom-[6%] left-[6%]" />
				<span className="crosshair bottom-[6%] right-[4%]" />
				<span className="label absolute bottom-[3%] left-[6%] translate-y-full pt-2 text-[10px]">
					Fig. 01 · the crew wall
				</span>
			</motion.div>

			<motion.div
				className="corner-marks relative"
				style={still ? undefined : { rotateX, rotateY, transformStyle: 'preserve-3d' }}
			>
				<motion.div
					className="label flex items-center justify-between pb-3"
					style={still ? undefined : { x: near, y: nearY }}
				>
					<span className="flex items-center gap-2 text-ink">
						<span
							aria-hidden="true"
							className="h-1.5 w-1.5 rounded-full bg-[color:var(--crew-coral-fill)]"
						/>
						6am Run Club
					</span>
					<span className="text-ink-secondary">
						Day {pad(dayOf(top.id))} / {TOTAL_DAYS}
					</span>
				</motion.div>

				<div
					role="img"
					aria-label="A crew's wall of check-in photos. Three friends are in today; the day is kept the moment Dan's photo lands."
				>
					<div
						aria-hidden="true"
						className="label mb-2 grid grid-cols-[2rem_repeat(4,1fr)] gap-1.5 text-[10px] text-ink-tertiary sm:gap-2"
					>
						<span />
						{CREW.map((name) => (
							<span key={name}>{name}</span>
						))}
					</div>
					<div aria-hidden="true" className="flex flex-col gap-2 sm:gap-2.5">
						<AnimatePresence mode="popLayout" initial={false}>
							{rows.map((row, i) => (
								<WallRow key={row.id} row={row} isLive={i === 0} still={still} />
							))}
						</AnimatePresence>
					</div>
					{still ? null : <Preload id={top.id + 1} />}
				</div>

				<motion.div
					aria-hidden="true"
					className="label mt-3 flex items-center justify-between gap-4 text-ink-secondary"
					style={still ? undefined : { x: near, y: nearY }}
				>
					<span className={top.kept ? 'text-[color:var(--crew-coral-ink)]' : undefined}>
						{status}
					</span>
					<span className="tabular-nums">{countdown} left</span>
				</motion.div>
			</motion.div>
		</div>
	)
}

/** Tomorrow's photos, fetched now at the tiles' own size, so they never flip in empty. */
function Preload({ id }: { id: number }) {
	return (
		<div
			aria-hidden="true"
			className="pointer-events-none fixed h-px w-px overflow-hidden opacity-0"
		>
			{CREW.map((name, m) => (
				<div key={name} className="relative h-px w-px">
					<Image src={photoSrc(photo(id, m))} alt="" fill sizes={TILE_SIZES} loading="eager" />
				</div>
			))}
		</div>
	)
}

function WallRow({ row, isLive, still }: { row: Row; isLive: boolean; still: boolean }) {
	return (
		<motion.div
			layout={!still}
			initial={{ opacity: 0, y: -18 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, y: 24, transition: { duration: 0.35 } }}
			transition={{ type: 'spring', stiffness: 220, damping: 28 }}
			className="grid grid-cols-[2rem_1fr] items-center"
		>
			<span className="label text-[10px] text-ink-tertiary">
				{isLive && !row.kept ? 'Now' : pad(dayOf(row.id))}
			</span>
			<div className="relative">
				{/* The kept frame, and the glow only today's kept row wears: opacity only, so locking a
				    row never repaints its tiles. */}
				<motion.span
					className="pointer-events-none absolute -inset-[4px] rounded-[9px] border-[1.5px] border-[color:var(--crew-coral-line)]"
					initial={false}
					animate={{ opacity: row.kept ? (isLive ? 1 : 0.4) : 0 }}
					transition={{ duration: 0.45 }}
				/>
				<motion.span
					className="pointer-events-none absolute -inset-[4px] rounded-[9px] shadow-[0_0_34px_-4px_var(--crew-coral-glow),inset_0_0_0_1px_var(--crew-coral-line)]"
					initial={false}
					animate={{ opacity: row.kept && isLive ? 1 : 0 }}
					transition={{ duration: row.kept && isLive ? 0.45 : 0.9 }}
				/>
				<div className="grid grid-cols-4 gap-1.5 sm:gap-2">
					{CREW.map((name, m) => (
						<Cell key={name} row={row} member={m} isLive={isLive} still={still} />
					))}
				</div>
				{isLive && row.kept && !still ? <Sweep /> : null}
			</div>
		</motion.div>
	)
}

function Cell({
	row,
	member,
	isLive,
	still
}: {
	row: Row
	member: number
	isLive: boolean
	still: boolean
}) {
	const isIn = member < row.landed
	if (!isIn) {
		const waiting = isLive && member === DAN && row.landed === DAN
		return (
			<div
				className={`grid aspect-[4/5] place-items-center rounded-[5px] border-[1.5px] border-dashed text-center ${
					waiting
						? 'animate-[waiting_1.6s_ease-in-out_infinite] border-[color:var(--crew-coral-line)] text-[color:var(--crew-coral-ink)]'
						: 'border-line-soft text-ink-tertiary'
				}`}
			>
				<span className="label text-[9px] leading-[1.5] sm:text-[10px]">
					{waiting ? (
						<>
							Waiting
							<br />
							on Dan
						</>
					) : (
						CREW[member]!.slice(0, 2)
					)}
				</span>
			</div>
		)
	}
	const animateIn = isLive && !still
	const isDan = member === DAN
	return (
		<motion.div
			className="relative aspect-[4/5] overflow-hidden rounded-[5px] bg-surface2"
			initial={
				animateIn
					? isDan
						? { y: -70, scale: 1.18, opacity: 0 }
						: { rotateX: -92, opacity: 0, y: -10 }
					: false
			}
			animate={{ rotateX: 0, y: 0, scale: 1, opacity: 1 }}
			transition={isDan ? DROP : FLIP}
			style={{ transformPerspective: 700, transformOrigin: '50% 0%' }}
		>
			<Image
				src={photoSrc(photo(row.id, member))}
				alt=""
				fill
				sizes={TILE_SIZES}
				className="object-cover"
			/>
			{animateIn ? (
				<motion.span
					className="pointer-events-none absolute inset-0 rounded-[5px] shadow-[inset_0_0_0_2px_var(--crew-coral-line),inset_0_0_26px_var(--crew-coral-glow)]"
					initial={{ opacity: 0 }}
					animate={{ opacity: [0, 1, 0] }}
					transition={{ duration: 1.1, times: [0, 0.25, 1], delay: 0.12 }}
				/>
			) : null}
		</motion.div>
	)
}

/** The lock: a coral line draws across the row, a wash passes over it, and the label lands. */
function Sweep() {
	return (
		<>
			<motion.span
				className="pointer-events-none absolute left-0 right-0 top-1/2 h-[2px] origin-left bg-[color:var(--crew-coral-fill)] shadow-[0_0_12px_var(--crew-coral-glow)]"
				initial={{ scaleX: 0, opacity: 1 }}
				animate={{ scaleX: 1, opacity: [1, 1, 0] }}
				transition={{
					scaleX: { duration: 0.55, ease: [0.65, 0, 0.35, 1] },
					opacity: { duration: 1.6, times: [0, 0.6, 1] }
				}}
			/>
			<span className="pointer-events-none absolute inset-0 overflow-hidden rounded-[5px]">
				<motion.span
					className="absolute inset-y-0 w-1/3 bg-[color:var(--crew-coral-dim)]"
					initial={{ x: '-100%' }}
					animate={{ x: '320%' }}
					transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
				/>
			</span>
			<motion.span
				className="label absolute -top-3 right-2 rounded-[3px] bg-[color:var(--crew-coral-fill)] px-2 py-1 text-[10px] text-[color:var(--crew-coral-on-fill)]"
				initial={{ opacity: 0, scale: 0.6, y: 6 }}
				animate={{ opacity: 1, scale: 1, y: 0 }}
				transition={{ type: 'spring', stiffness: 500, damping: 18, delay: 0.35 }}
			>
				Day kept
			</motion.span>
		</>
	)
}
