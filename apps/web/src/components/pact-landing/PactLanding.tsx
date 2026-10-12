import { Container } from '@/components/Container'
import { Hero } from './Hero'
import { Marquee } from './Marquee'
import { HowItWorks } from './how/HowItWorks'
import { YourTurn } from './YourTurn'
import { CodeForm } from '@/components/join/CodeForm'
import { crewStyle } from '@/lib/pacts/crew'

/**
 * Pact's landing, dark and photo-first: the hook as a two-tone headline beside a real Crew Wall,
 * how a pact works as a numbered list, the real app, and a way in with an invite code.
 */
export function PactLanding() {
	return (
		<div className="bg-bg" style={crewStyle('coral')}>
			<Hero />
			<Marquee />

			<HowItWorks />

			<YourTurn />

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
