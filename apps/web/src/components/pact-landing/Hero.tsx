import { Container } from '@/components/Container'
import { LineReveal } from '@/components/motion/LineReveal'
import type { CssVars } from '@/lib/utils'
import { PrimaryCta, SecondaryCta } from './Ctas'
import { HeroWall } from './HeroWall'

/** Entrance, ms: the headline's lines, then the promise, then the actions. */
const LEAD_AT = 420
const CTAS_AT = 560

/**
 * The first viewport: the hook as a two-tone headline, line by line, beside the signature
 * moment, a crew's wall assembling itself. Two actions: start (into "Your turn.") or bring a code.
 */
export function Hero() {
	return (
		<section className="relative isolate overflow-hidden">
			<Container className="grid items-center gap-x-12 gap-y-14 pb-20 pt-28 sm:pt-36 lg:min-h-[100svh] lg:grid-cols-2 lg:pb-16 lg:pt-28">
				<div className="relative z-10">
					<p className="label enter-rise mb-7 flex items-center gap-3 text-ink-secondary">
						<span aria-hidden="true" className="h-px w-8 bg-[color:var(--crew-coral-line)]" />
						Habits, kept by your friends
					</p>
					<LineReveal
						as="h1"
						className="t-hero-pact lg:whitespace-nowrap"
						lines={[
							{ text: 'Nobody notices' },
							{ text: 'when you quit.' },
							{ text: 'Your friends will.', muted: true }
						]}
					/>
					<p
						className="t-lead enter-rise mt-7 max-w-[38ch] text-pretty text-ink-secondary"
						style={{ '--enter-delay': `${LEAD_AT}ms` } as CssVars}
					>
						One habit, one photo a day, one crew. A day only counts when everyone is in, so when you
						skip, the gap on the wall has your name on it.
					</p>
					<div
						className="enter-rise mt-9 flex flex-wrap items-center gap-x-4 gap-y-3"
						style={{ '--enter-delay': `${CTAS_AT}ms` } as CssVars}
					>
						<PrimaryCta href="#start" cta="hero_start">
							Start your pact
						</PrimaryCta>
						<SecondaryCta href="#join" cta="hero_code">
							I have a code
						</SecondaryCta>
					</div>
				</div>
				<div className="enter relative" style={{ '--enter-delay': '120ms' } as CssVars}>
					<HeroWall />
				</div>
			</Container>
		</section>
	)
}
