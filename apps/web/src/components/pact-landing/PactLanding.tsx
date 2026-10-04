import { Camera, Link2Off, Sparkles, Users } from 'lucide-react'
import { Container } from '@/components/Container'
import { DeviceFrame } from '@/components/device/DeviceFrame'
import { CodeForm } from '@/components/join/CodeForm'
import type { CssVars } from '@/lib/utils'

/** Entrance timings, ms: the hook first, then the code box, then the phone. */
const FORM_AT = 360
const PHONE_AT = 160

const STEPS = [
	{
		icon: Users,
		title: 'Make a pact with your crew',
		body: 'One habit, 7 to 30 days, 2 to 8 friends. Add a stake if you dare: loser buys the coffees.'
	},
	{
		icon: Camera,
		title: 'A photo, every day',
		body: 'Each day has a small challenge, like “hold up three fingers”, so nobody can reuse yesterday’s photo.'
	},
	{
		icon: Sparkles,
		title: 'An AI judge takes a look',
		body: 'It flags anything that looks off and adds a deadpan one-liner. It advises; your crew decides.'
	},
	{
		icon: Link2Off,
		title: 'Miss a day, the chain breaks',
		body: 'A day counts only when everyone is in. Your friends see who’s missing, and so do you.'
	}
] as const

/** Real screens from the app, taken on the simulator with the demo crews. */
const SCREENS = [
	{
		src: '/screens/home.jpg',
		label: 'Home: each crew with who is in today, the ring and the streak',
		title: 'Your crews, at a glance',
		body: 'Who’s in today, how long is left, and a check-in two taps away.'
	},
	{
		src: '/screens/verdict.jpg',
		label: 'The verdict: the photo, the AI judge’s caption and the streak',
		title: 'The judge has spoken',
		body: 'Your photo, a one-line verdict, and confetti when the crew’s day comes together.'
	},
	{
		src: '/screens/board.jpg',
		label: 'Today’s board: the countdown, the challenge and the crew',
		title: 'The day, counting down',
		body: 'The challenge, the clock to midnight, and everyone’s check-in.'
	}
] as const

/**
 * Pact's landing: the hook, how it works, the real app, and a way in with an invite code. What a
 * reviewer or a friend sees at the site's root.
 */
export function PactLanding() {
	return (
		<>
			<section className="relative isolate overflow-hidden bg-bg">
				<Container className="grid items-center gap-12 pb-16 pt-28 sm:pt-32 lg:min-h-[92svh] lg:grid-cols-[1.1fr_0.9fr] lg:gap-8">
					<div>
						<p className="enter mb-6 inline-flex items-center gap-2 rounded-full bg-brand-dim px-3.5 py-1.5 text-sm font-semibold text-brand-ink">
							<Users className="h-4 w-4" aria-hidden="true" />
							Habits, kept by your friends
						</p>
						<h1 className="t-hero text-balance">
							Nobody notices when you quit.{' '}
							<span className="text-brand-ink">Your friends will.</span>
						</h1>
						<p className="t-lead mt-6 max-w-[38ch] text-pretty text-ink-secondary">
							Make a pact with your crew: one habit, a photo every day, and an AI judge that keeps
							it honest. Miss a day and everyone sees the chain break.
						</p>
						<div
							className="enter mt-9 max-w-md"
							style={{ '--enter-delay': `${FORM_AT}ms` } as CssVars}
						>
							<p className="mb-3 text-sm font-semibold text-ink">Got an invite code?</p>
							<CodeForm />
							<p className="mt-3 text-sm text-ink-tertiary">
								No code yet? Start a pact in the app and send your crew theirs.
							</p>
						</div>
					</div>
					<div
						className="enter flex justify-center lg:justify-end"
						style={{ '--enter-delay': `${PHONE_AT}ms` } as CssVars}
					>
						<DeviceFrame
							src={SCREENS[0].src}
							label={SCREENS[0].label}
							isPriority
							className="rotate-[2deg] [--screen:260] sm:[--screen:290] xl:[--screen:310]"
						/>
					</div>
				</Container>
			</section>

			<section id="how" className="scroll-mt-24 bg-bg py-20">
				<Container>
					<h2 className="t-h1 max-w-[20ch] text-balance">How a pact works</h2>
					<ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
						{STEPS.map(({ icon: Icon, title, body }, i) => (
							<li
								key={title}
								className="rounded-card border border-line-hairline bg-surface p-6 shadow-card"
							>
								<span className="grid h-[48px] w-[48px] place-items-center rounded-[16px] bg-brand-dim">
									<Icon className="h-6 w-6 text-brand-ink" aria-hidden="true" />
								</span>
								<p className="mt-5 text-sm font-semibold text-ink-tertiary">Step {i + 1}</p>
								<h3 className="t-h3 mt-1">{title}</h3>
								<p className="mt-2 text-pretty text-ink-secondary">{body}</p>
							</li>
						))}
					</ol>
				</Container>
			</section>

			<section id="app" className="scroll-mt-24 overflow-hidden bg-well py-20">
				<Container>
					<h2 className="t-h1 max-w-[22ch] text-balance">The app, as your crew sees it</h2>
					<p className="t-lead mt-4 max-w-[46ch] text-ink-secondary">
						Real screens from Pact, with a demo crew.
					</p>
				</Container>
				<ul className="mx-auto mt-12 flex max-w-content snap-x snap-mandatory gap-8 overflow-x-auto px-5 pb-4 sm:px-8 lg:justify-between lg:overflow-visible">
					{SCREENS.map((screen) => (
						<li
							key={screen.src}
							className="flex w-[250px] shrink-0 snap-center flex-col gap-5 sm:w-[280px]"
						>
							<DeviceFrame
								src={screen.src}
								label={screen.label}
								className="[--screen:230] sm:[--screen:260]"
							/>
							<div>
								<h3 className="t-h3">{screen.title}</h3>
								<p className="mt-1.5 text-pretty text-ink-secondary">{screen.body}</p>
							</div>
						</li>
					))}
				</ul>
			</section>

			<section id="join" className="scroll-mt-24 bg-bg py-20">
				<Container>
					<div className="rounded-[32px] bg-hero px-6 py-12 text-center shadow-raised sm:px-12 sm:py-16">
						<h2 className="t-h1 text-balance text-hero-text">Your crew is waiting.</h2>
						<p className="mx-auto mt-4 max-w-[40ch] text-hero-text-secondary">
							Enter the invite code a friend sent you to see their pact, then join in a minute.
						</p>
						<div className="mx-auto mt-8 max-w-md text-left">
							<CodeForm />
						</div>
					</div>
				</Container>
			</section>
		</>
	)
}
