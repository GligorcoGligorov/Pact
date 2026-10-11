import 'server-only'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { ImageResponse } from 'next/og'
import { theme } from '@app/brand'
import { SIGNATURE_BOX } from '@app/contract'
import type { ResultPage } from './result-page'

// The results as an image (R25), in two shapes from one design:
//  - `tall` (1080×1350), the card the app shares through the share sheet: made for a group
//    chat or a story, the thing a crew screenshots;
//  - `wide` (1200×630), the link preview /results/[pact] unfurls into.
// The crew's colour fills it; ink type, mono micro-labels; the wall drawn as presence (one row
// per member, one block per day: filled when they were in), who pays, the awards, and the
// signatures along the bottom. Never a photo (R25).

export const RESULT_CARD_SIZES = {
	tall: { width: 1080, height: 1350 },
	wide: { width: 1200, height: 630 }
} as const

/** An image has no CSS variables: it reads the dark palette's tokens directly. */
const c = theme.palettes.dark
const MAX_AWARDS = 3

const font = (file: string) => readFile(path.join(process.cwd(), 'assets/fonts', file))

async function fonts() {
	const [display, mono, text] = await Promise.all([
		font('InterTight_600SemiBold.ttf'),
		font('IBMPlexMono_500Medium.ttf'),
		font('Inter_500Medium.ttf')
	])
	return [
		{ name: 'Display', data: display, weight: 600 as const },
		{ name: 'Mono', data: mono, weight: 500 as const },
		{ name: 'Inter', data: text, weight: 500 as const }
	]
}

const pad = (n: number) => String(n).padStart(2, '0')

export async function resultCardImage(
	page: ResultPage | null,
	layout: keyof typeof RESULT_CARD_SIZES
): Promise<ImageResponse> {
	const size = RESULT_CARD_SIZES[layout]
	const tall = layout === 'tall'
	if (!page) {
		return new ImageResponse(
			<div
				style={{
					display: 'flex',
					width: '100%',
					height: '100%',
					alignItems: 'center',
					justifyContent: 'center',
					background: c.bg,
					fontFamily: 'Display',
					fontSize: 96,
					color: c.textPrimary
				}}
			>
				Pact
			</div>,
			{ ...size, fonts: await fonts() }
		)
	}

	const tone = c.crew[page.color as keyof typeof c.crew]
	const ink = tone.onFill
	const muted = tone.onFillLarge
	const padding = tall ? 72 : 52
	const mono = (fontSize: number, color = tone.onFillMuted) => ({
		fontFamily: 'Mono',
		fontSize,
		letterSpacing: fontSize * 0.06,
		textTransform: 'uppercase' as const,
		color
	})

	// The wall, oldest day first, one row per member.
	const days = [...page.wall].reverse()
	const wallWidth = size.width - padding * 2
	const gap = tall ? 6 : 4
	const block = Math.max(Math.floor((wallWidth - 120 - gap * (days.length - 1)) / days.length), 6)
	const blockH = tall ? 34 : 18
	const awards = page.awards.slice(0, tall ? MAX_AWARDS : 2)
	const signed = page.members.filter((m) => m.signature).slice(0, 4)

	return new ImageResponse(
		<div
			style={{
				display: 'flex',
				flexDirection: 'column',
				width: '100%',
				height: '100%',
				background: tone.fill,
				padding,
				justifyContent: 'space-between',
				fontFamily: 'Inter'
			}}
		>
			<div style={{ display: 'flex', justifyContent: 'space-between' }}>
				<div style={mono(tall ? 26 : 20, ink)}>Pact</div>
				<div style={mono(tall ? 26 : 20)}>{`That’s a wrap · ${pad(page.totalDays)} days`}</div>
			</div>

			<div style={{ display: 'flex', flexDirection: 'column' }}>
				<div
					style={{
						fontFamily: 'Display',
						fontSize: tall ? 120 : 76,
						lineHeight: 0.95,
						letterSpacing: tall ? -5.5 : -3.5,
						color: ink
					}}
				>
					{page.name}
				</div>
				<div
					style={{
						fontFamily: 'Display',
						fontSize: tall ? 64 : 40,
						lineHeight: 1.05,
						letterSpacing: tall ? -2.5 : -1.5,
						color: muted
					}}
				>
					{`${page.keptDays} of ${page.totalDays} days, kept together.`}
				</div>
			</div>

			<div style={{ display: 'flex', flexDirection: 'column', gap }}>
				{page.members.map((m) => (
					<div key={m.userId} style={{ display: 'flex', alignItems: 'center', gap }}>
						<div style={{ ...mono(tall ? 22 : 15, ink), width: 120 }}>{m.name.split(' ')[0]}</div>
						{days.map((day) => {
							const cell = day.cells.find((x) => x.userId === m.userId)
							return (
								<div
									key={day.day}
									style={{
										width: block,
										height: blockH,
										borderRadius: 4,
										background: cell?.in ? ink : 'transparent',
										border: cell?.held && !cell.in ? `2px dashed ${ink}` : 'none',
										opacity: cell?.held ? 1 : 0
									}}
								/>
							)
						})}
					</div>
				))}
			</div>

			<div style={{ display: 'flex', flexDirection: 'column', gap: tall ? 20 : 10 }}>
				<div style={mono(tall ? 24 : 18)}>{page.nobodyPays ? 'Everybody wins' : 'Who pays'}</div>
				<div
					style={{
						fontFamily: 'Display',
						fontSize: tall ? 84 : 52,
						lineHeight: 1,
						letterSpacing: tall ? -3.5 : -2,
						color: ink
					}}
				>
					{page.headline}
				</div>
				{awards.length > 0 ? (
					<div style={{ display: 'flex', gap: tall ? 36 : 28, marginTop: tall ? 8 : 0 }}>
						{awards.map((a) => (
							<div key={a.title} style={{ display: 'flex', flexDirection: 'column' }}>
								<div style={mono(tall ? 20 : 15)}>{a.title}</div>
								<div
									style={{
										fontFamily: 'Display',
										fontSize: tall ? 36 : 24,
										letterSpacing: -1,
										color: ink
									}}
								>
									{a.names}
								</div>
							</div>
						))}
					</div>
				) : null}
			</div>

			{tall && signed.length > 0 ? (
				<div
					style={{
						display: 'flex',
						gap: 28,
						borderTop: `2px solid ${tone.onFillTrack}`,
						paddingTop: 24
					}}
				>
					{signed.map((m) => (
						<div key={m.userId} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
							<svg
								width={200}
								height={80}
								viewBox={`0 0 ${SIGNATURE_BOX.width} ${SIGNATURE_BOX.height}`}
							>
								<path
									d={m.signature!}
									fill="none"
									stroke={ink}
									strokeWidth={3}
									strokeLinecap="round"
									strokeLinejoin="round"
								/>
							</svg>
							<div style={mono(18)}>{m.name.split(' ')[0]}</div>
						</div>
					))}
				</div>
			) : null}
		</div>,
		{ ...size, fonts: await fonts() }
	)
}
