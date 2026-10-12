import type { CssVars } from '@/lib/utils'

/**
 * A headline revealed a line at a time: each line rises out of its own clip, one after the next.
 * CSS only (`.line-rise` in globals.css), so the largest thing on the first paint never waits on
 * hydration. Each entry is a display line; `muted` lines take the second tone. Screen readers get
 * the sentence once, whole.
 */
export function LineReveal({
	lines,
	as: Tag = 'h2',
	id,
	className,
	delay = 0,
	isOnView = false
}: {
	lines: { text: string; muted?: boolean }[]
	as?: 'h1' | 'h2' | 'p'
	id?: string
	className?: string
	/** Milliseconds before the first line moves. */
	delay?: number
	/** Wait for a parent `.reveal` to become visible instead of playing on load. */
	isOnView?: boolean
}) {
	return (
		<Tag id={id} className={className}>
			<span className="sr-only">{lines.map((l) => l.text).join(' ')}</span>
			<span aria-hidden="true">
				{lines.map((line, i) => (
					<span key={line.text} className="line-clip">
						<span
							className={`${isOnView ? 'line-rise-on-view' : 'line-rise'} ${line.muted ? 'text-ink-tertiary' : ''}`}
							style={{ '--i': i, '--rise-delay': `${delay}ms` } as CssVars}
						>
							{line.text}
						</span>
					</span>
				))}
			</span>
		</Tag>
	)
}
