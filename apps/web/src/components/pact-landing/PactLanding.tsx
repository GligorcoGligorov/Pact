import { Container } from '@/components/Container'
import { DeviceFrame } from '@/components/device/DeviceFrame'
import { CodeForm } from '@/components/join/CodeForm'
import { PhotoWall, type PhotoRow } from '@/components/wall/PhotoWall'
import { crewStyle } from '@/lib/pacts/crew'
import type { CssVars } from '@/lib/utils'

/** Entrance timings, ms: the hook first, then the code box, then the wall. */
const FORM_AT = 360
const WALL_AT = 160

/** A demo crew's wall: today one still out, the two days before kept by everyone. */
const WALL: PhotoRow[] = [
	{ tiles: [1, 2, 3, { waiting: 'DA' }] },
	{ tiles: [4, 5, 6, 7], kept: true },
	{ tiles: [8, 9, 10, 11], kept: true }
]

const STEPS = [
	{
		title: 'Make a pact. Sign it.',
		body: 'One habit, 7 to 30 days, 2 to 8 friends, and a stake for whoever slips. Everyone signs the same promise.'
	},
	{
		title: 'One photo a day.',
		body: 'Each day has a small challenge, like “hold up three fingers”, so nobody can reuse yesterday’s photo.'
	},
	{
		title: 'An AI takes a look.',
		body: 'It flags anything that looks off and adds a deadpan one-liner. It advises; your crew decides.'
	},
	{
		title: 'Everyone in, or nobody is.',
		body: 'A day counts only when the whole crew is in. The wall shows who held it, and who didn’t.'
	}
] as const

/** Real screens from the app, taken on the simulator with the demo crews. */
const SCREENS = [
	{
		src: '/screens/board.jpg',
		label: 'The board: the crew’s colour, today’s clock and the Crew Wall of photos',
		title: 'The board',
		body: 'Today’s clock, the streak, and the wall of everyone’s photos.'
	},
	{
		src: '/screens/home.jpg',
		label: 'Home: the pact you still owe today, with the last three days of its wall',
		title: 'Home',
		body: 'What you still owe today, one tap from the camera.'
	},
	{
		src: '/screens/verdict.jpg',
		label: 'The verdict: your photo, the AI’s line, and today’s row of the wall kept',
		title: 'The verdict',
		body: 'Your photo lands on the wall. When the row fills, the day is kept.'
	}
] as const

const pad = (n: number) => String(n).padStart(2, '0')

/**
 * Pact's landing, dark and photo-first: the hook as a two-tone headline beside a real Crew Wall,
 * how a pact works as a numbered list, the real app, and a way in with an invite code.
 */
export function PactLanding() {
	return (
		<div className="bg-bg" style={crewStyle('coral')}>
			<section className="relative isolate overflow-hidden">
				<Container className="grid items-center gap-14 pb-16 pt-28 sm:pt-32 lg:min-h-[92svh] lg:grid-cols-[1.05fr_0.95fr] lg:gap-12">
					<div>
						<p className="enter mb-6 font-mono text-xs uppercase tracking-[0.08em] text-ink-secondary">
							Pact · habits, kept by your friends
						</p>
						<h1 className="t-hero text-balance">
							Nobody notices when you quit.{' '}
							<span className="text-ink-tertiary">Your friends will.</span>
						</h1>
						<p className="t-lead mt-6 max-w-[40ch] text-pretty text-ink-secondary">
							Make a pact with your crew: one habit, a photo every day, and an AI judge that keeps
							it honest. Miss a day and the wall shows it.
						</p>
						<div
							className="enter mt-9 max-w-md"
							style={{ '--enter-delay': `${FORM_AT}ms` } as CssVars}
						>
							<p className="mb-3 font-mono text-xs uppercase tracking-[0.06em] text-ink-secondary">
								Got an invite code?
							</p>
							<CodeForm />
							<p className="mt-3 text-sm text-ink-tertiary">
								No code yet? Start a pact in the app and send your crew theirs.
							</p>
						</div>
					</div>
					<div className="enter" style={{ '--enter-delay': `${WALL_AT}ms` } as CssVars}>
						<div className="corner-marks relative p-1">
							<div className="mb-3 flex justify-between font-mono text-xs uppercase tracking-[0.06em]">
								<span className="text-ink">6am Run Club</span>
								<span className="text-ink-secondary">Day 08 / 21 · 3 / 4 in</span>
							</div>
							<PhotoWall
								rows={WALL}
								label="A crew’s wall of check-in photos: two days kept, today waiting on Dan"
							/>
						</div>
					</div>
				</Container>
			</section>

			<section id="how" className="scroll-mt-24 py-20">
				<Container>
					<div className="border-t-2 border-ink pt-4">
						<p className="font-mono text-xs uppercase tracking-[0.06em] text-ink-secondary">
							How a pact works
						</p>
						<ol className="mt-8 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
							{STEPS.map(({ title, body }, i) => (
								<li key={title}>
									<span className="font-mono text-xs text-ink-tertiary">{pad(i + 1)} /</span>
									<h3 className="t-h3 mt-2">{title}</h3>
									<p className="mt-2 text-pretty text-ink-secondary">{body}</p>
								</li>
							))}
						</ol>
					</div>
				</Container>
			</section>

			<section id="app" className="scroll-mt-24 overflow-hidden py-20">
				<Container>
					<div className="border-t-2 border-ink pt-4">
						<p className="font-mono text-xs uppercase tracking-[0.06em] text-ink-secondary">
							The app · real screens, a demo crew
						</p>
						<h2 className="t-h1 mt-4 max-w-[22ch] text-balance">
							Your crew’s photos. <span className="text-ink-tertiary">Not a progress bar.</span>
						</h2>
					</div>
				</Container>
				<ul className="mx-auto mt-12 flex max-w-content snap-x snap-mandatory gap-8 overflow-x-auto px-5 pb-4 sm:px-8 lg:justify-between lg:overflow-visible">
					{SCREENS.map((screen, i) => (
						<li
							key={screen.src}
							className="flex w-[250px] shrink-0 snap-center flex-col gap-5 sm:w-[280px]"
						>
							<DeviceFrame
								src={screen.src}
								label={screen.label}
								isPriority={i === 0}
								className="[--screen:230] sm:[--screen:260]"
							/>
							<div>
								<span className="font-mono text-xs text-ink-tertiary">{pad(i + 1)} /</span>
								<h3 className="t-h3 mt-1">{screen.title}</h3>
								<p className="mt-1.5 text-pretty text-ink-secondary">{screen.body}</p>
							</div>
						</li>
					))}
				</ul>
			</section>

			<section id="join" className="scroll-mt-24 py-20">
				<Container>
					<div className="corner-marks relative rounded-[8px] bg-[color:var(--crew-fill)] px-6 py-12 text-[color:var(--crew-on-fill)] sm:px-12 sm:py-16">
						<p className="font-mono text-xs uppercase tracking-[0.06em] text-[color:var(--crew-on-fill-muted)]">
							Your crew is waiting
						</p>
						<h2 className="t-h1 mt-3 max-w-[18ch] text-balance">
							Got a code?{' '}
							<span className="text-[color:var(--crew-on-fill-large)]">Sign the pact.</span>
						</h2>
						<div className="mt-8 max-w-md">
							<CodeForm />
						</div>
					</div>
				</Container>
			</section>
		</div>
	)
}
