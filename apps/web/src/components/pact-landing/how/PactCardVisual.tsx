'use client'

import { Stamp } from '@/components/wall/Stamp'
import { DrawnSignature, SIGN_S } from '@/components/wall/DrawnSignature'
import { DEMO_PACT, PLEDGE, SIGNATURES } from '../demo-pact'
import { useBeats, useTyped } from './useBeats'

const SENTENCE = PLEDGE.map((p) => p.text).join('')
const MS_PER_CHAR = 24
/** Seconds between one signature starting and the next. */
const SIGN_GAP_S = 0.55
/** The stamp lands once the last signature is down, ms. */
const STAMP_AT = [(SIGN_GAP_S * (SIGNATURES.length - 1) + SIGN_S + 0.15) * 1000] as const

/**
 * Steps 01 and 02 on one card, so the crossfade between them changes only what changes: the
 * pledge types itself (its terms underlined as they land) over four empty signature lines; then,
 * on `phase="sign"`, the sentence is whole and the crew signs in turn, and the stamp thuds on.
 */
export function PactCardVisual({ phase, isActive }: { phase: 'type' | 'sign'; isActive: boolean }) {
	const typed = useTyped(isActive && phase === 'type', SENTENCE, MS_PER_CHAR, 350)
	const shown = phase === 'sign' ? SENTENCE.length : typed
	const signing = phase === 'sign' && isActive
	const stamped = useBeats(signing, STAMP_AT) > 0 && phase === 'sign'

	let start = 0
	return (
		<div className="corner-marks relative rounded-[10px] border border-line-soft bg-surface p-6 sm:p-9">
			<div className="label flex items-center justify-between border-b border-line-hairline pb-4 text-ink-secondary">
				<span className="flex items-center gap-2 text-ink">
					<span
						aria-hidden="true"
						className="h-1.5 w-1.5 rounded-full bg-[color:var(--crew-coral-fill)]"
					/>
					The pact
				</span>
				<span>{DEMO_PACT.name}</span>
			</div>

			{/* The whole sentence is always laid out; the untyped rest is invisible, so typing never
			    moves anything. */}
			<p className="mt-6 font-display text-[1.6rem] font-semibold leading-[1.18] tracking-[-0.03em] text-ink sm:text-[2.1rem]">
				<span className="sr-only">{SENTENCE}</span>
				<span aria-hidden="true">
					{PLEDGE.map((part) => {
						const from = start
						start += part.text.length
						const visible = part.text.slice(0, Math.max(0, shown - from))
						const hidden = part.text.slice(visible.length)
						const isDone = shown >= from + part.text.length
						return (
							<span key={part.text}>
								<span
									className={
										part.isTerm
											? `bg-[linear-gradient(var(--crew-coral-line),var(--crew-coral-line))] bg-[length:0%_2px] bg-left-bottom bg-no-repeat pb-0.5 transition-[background-size] duration-slow ease-out ${isDone ? 'bg-[length:100%_2px]' : ''}`
											: undefined
									}
								>
									{visible}
								</span>
								{shown > from && shown < from + part.text.length ? <Caret /> : null}
								<span className="opacity-0">{hidden}</span>
							</span>
						)
					})}
					{shown >= SENTENCE.length && phase === 'type' ? <Caret /> : null}
				</span>
			</p>

			<ul className="mt-8 grid grid-cols-2 gap-x-6 gap-y-5">
				{SIGNATURES.map((s, i) => (
					<li key={s.name}>
						<div className="relative h-14 border-b border-dashed border-line-soft text-ink">
							<DrawnSignature
								path={s.path}
								isDrawn={phase === 'sign' && (signing || stamped)}
								delay={i * SIGN_GAP_S}
								className="absolute bottom-1 left-0 h-[3.6rem] w-auto"
							/>
						</div>
						<span className="label mt-2 block text-[10px] text-ink-tertiary">
							{s.name} · {phase === 'sign' ? 'signed' : 'not yet'}
						</span>
					</li>
				))}
			</ul>

			<Stamp isDown={stamped}>Signed · 4 / 4</Stamp>
		</div>
	)
}

function Caret() {
	return (
		<span
			aria-hidden="true"
			className="ml-[1px] inline-block h-[0.9em] w-[3px] translate-y-[0.12em] animate-[caret_1s_steps(1)_infinite] bg-[color:var(--crew-coral-fill)]"
		/>
	)
}
