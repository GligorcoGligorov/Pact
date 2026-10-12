import { Container } from '@/components/Container'
import { CodeForm } from '@/components/join/CodeForm'
import { LineReveal } from '@/components/motion/LineReveal'
import { Reveal } from '@/components/motion/Reveal'
import { WaitlistForm } from '@/components/WaitlistForm'
import Image from 'next/image'
import { IS_LIVE } from '@/lib/stores'
import { photoSrc } from './photos'

/** Today's row of a crew still missing one: three photos in, and you. */
const ROW = [5, 21, 9] as const

/**
 * The close, in the coral crew's full colour. It ends the story the hero began: there, the crew
 * waited on Dan; here, today's row waits on you. Then the two ways in that are true today: a code
 * from your crew, or (until the app is in a store) the list for the launch.
 */
export function ClosingBand() {
	return (
		<section
			id="join"
			aria-labelledby="join-title"
			className="scroll-mt-24 px-3 pb-3 sm:px-5 sm:pb-5"
		>
			<Reveal className="corner-marks relative overflow-hidden rounded-[14px] bg-[color:var(--crew-coral-fill)] text-[color:var(--crew-coral-on-fill)] [--mark-ink:var(--crew-coral-on-fill)] [--mark-out:12px]">
				<div
					aria-hidden="true"
					className="construction-grid absolute inset-0 opacity-50 [--grid-focus:80%_30%] [--grid-ink:var(--crew-coral-on-fill-track)]"
				/>
				<Container className="relative grid gap-12 py-20 sm:py-28 lg:grid-cols-[1.2fr_1fr] lg:items-end">
					<div>
						<p className="label text-[color:var(--crew-coral-on-fill-muted)]">
							Your crew is waiting
						</p>
						<LineReveal
							id="join-title"
							as="h2"
							isOnView
							className="t-hero-pact mt-5"
							lines={[{ text: 'Same crew,' }, { text: 'new pact.' }]}
						/>
						<div
							className="mt-10 max-w-[360px]"
							role="img"
							aria-label="Today's row: three friends are in, and the fourth tile is yours"
						>
							<div aria-hidden="true" className="grid grid-cols-4 gap-1.5">
								{ROW.map((n) => (
									<div key={n} className="relative aspect-[4/5] overflow-hidden rounded-[4px]">
										<Image src={photoSrc(n)} alt="" fill sizes="90px" className="object-cover" />
									</div>
								))}
								<div className="grid aspect-[4/5] animate-[waiting_1.6s_ease-in-out_infinite] place-items-center rounded-[4px] border-[1.5px] border-dashed border-[color:var(--crew-coral-on-fill)] text-center">
									<span className="label text-[9px] leading-[1.5]">
										Waiting
										<br />
										on you
									</span>
								</div>
							</div>
							<p
								aria-hidden="true"
								className="label mt-3 text-[10px] text-[color:var(--crew-coral-on-fill-muted)]"
							>
								3 / 4 in · day 01
							</p>
						</div>
					</div>
					<div className="space-y-10">
						<div>
							<p className="label mb-3 text-[color:var(--crew-coral-on-fill-muted)]">
								01 / Got a code from your crew?
							</p>
							<CodeForm />
						</div>
						{IS_LIVE ? null : (
							<div>
								<p className="label mb-3 text-[color:var(--crew-coral-on-fill-muted)]">
									02 / Starting one? The app is nearly out
								</p>
								<WaitlistForm />
							</div>
						)}
					</div>
				</Container>
			</Reveal>
		</section>
	)
}
