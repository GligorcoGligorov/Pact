import { Hero } from './Hero'
import { Marquee } from './Marquee'
import { HowItWorks } from './how/HowItWorks'
import { YourTurn } from './YourTurn'
import { Numbers } from './Numbers'
import { ClosingBand } from './ClosingBand'
import { Suspense } from 'react'
import { crewStyle } from '@/lib/pacts/crew'

/**
 * Pact's landing, dark and photo-first (docs/design/web-revamp/plan.md): the crew wall assembling
 * itself, check-ins as they land, how a pact works (pinned), your turn to sign one, the demo crews
 * counted, and the coral close with the ways in.
 */
export function PactLanding() {
	return (
		<div className="bg-bg" style={crewStyle('coral')}>
			{/* A boundary per section: React hydrates each in its own task, so no single long task
			    holds the first viewport's input hostage while the whole page wakes up. */}
			<Suspense>
				<Hero />
			</Suspense>
			<Suspense>
				<Marquee />
			</Suspense>
			<Suspense>
				<HowItWorks />
			</Suspense>
			<Suspense>
				<YourTurn />
			</Suspense>
			<Suspense>
				<Numbers />
			</Suspense>
			<Suspense>
				<ClosingBand />
			</Suspense>
		</div>
	)
}
