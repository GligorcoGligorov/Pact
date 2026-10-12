import { Hero } from './Hero'
import { Marquee } from './Marquee'
import { HowItWorks } from './how/HowItWorks'
import { YourTurn } from './YourTurn'
import { Numbers } from './Numbers'
import { ClosingBand } from './ClosingBand'
import { crewStyle } from '@/lib/pacts/crew'

/**
 * Pact's landing, dark and photo-first (docs/design/web-revamp/plan.md): the crew wall assembling
 * itself, check-ins as they land, how a pact works (pinned), your turn to sign one, the demo crews
 * counted, and the coral close with the ways in.
 */
export function PactLanding() {
	return (
		<div className="bg-bg" style={crewStyle('coral')}>
			<Hero />
			<Marquee />
			<HowItWorks />
			<YourTurn />
			<Numbers />
			<ClosingBand />
		</div>
	)
}
