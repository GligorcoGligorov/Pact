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
// The website's language: the near-black ground with a faint construction grid and corner marks,
// a two-tone headline, mono micro-labels, and the crew's colour as the one colour: the wall drawn
// as presence (one row per member, one block per day, filled when they were in, dashed when they
// were not), and who pays on a panel of it. The awards, and the signatures along the bottom.
// Never a photo (R25).

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

/** The headline in two set lines, "Dan buys" / "the coffees.", so the image never breaks it badly. */
function headlineLines(headline: string): string[] {
	const words = headline.split(' ')
	if (words.length < 3) return [headline]
	const cut = Math.ceil(words.length / 2)
	return [words.slice(0, cut).join(' '), words.slice(cut).join(' ')]
}

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
	const ink = c.textPrimary
	const muted = c.textTertiary
	const padding = tall ? 72 : 48
	const mono = (fontSize: number, color: string = c.textSecondary) => ({
		fontFamily: 'Mono',
		fontSize,
		letterSpacing: fontSize * 0.08,
		textTransform: 'uppercase' as const,
		color
	})

	// The wall, oldest day first, one row per member.
	const days = [...page.wall].reverse()
	const wallWidth = size.width - padding * 2
	const gap = tall ? 6 : 4
	const nameW = tall ? 110 : 84
	const block = Math.max(Math.floor((wallWidth - nameW - gap * days.length) / days.length), 6)
	const blockH = tall ? 30 : 16
	const awards = page.awards.slice(0, tall ? MAX_AWARDS : 2)
	const signed = page.members.filter((m) => m.signature).slice(0, 4)
	const markInset = tall ? 36 : 22
	const mark = tall ? 22 : 16
	const markLine = `2px solid ${c.textSecondary}`
	const corners = [
		{ top: markInset, left: markInset, borderTop: markLine, borderLeft: markLine },
		{ top: markInset, right: markInset, borderTop: markLine, borderRight: markLine },
		{ bottom: markInset, left: markInset, borderBottom: markLine, borderLeft: markLine },
		{ bottom: markInset, right: markInset, borderBottom: markLine, borderRight: markLine }
	]
	const grid = tall ? 90 : 60

	return new ImageResponse(
		<div
			style={{
				display: 'flex',
				flexDirection: 'column',
				position: 'relative',
				width: '100%',
				height: '100%',
				background: c.bg,
				backgroundImage: `linear-gradient(to right, ${c.borderHairline} 1px, transparent 1px), linear-gradient(to bottom, ${c.borderHairline} 1px, transparent 1px)`,
				backgroundSize: `${grid}px ${grid}px`,
				padding,
				justifyContent: 'space-between',
				fontFamily: 'Inter'
			}}
		>
			{corners.map((corner, i) => (
				<div key={i} style={{ position: 'absolute', width: mark, height: mark, ...corner }} />
			))}

			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
				<div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
					<div
						style={{
							width: tall ? 14 : 11,
							height: tall ? 14 : 11,
							borderRadius: 99,
							background: tone.fill
						}}
					/>
					<div style={mono(tall ? 26 : 19, ink)}>Pact</div>
				</div>
				<div style={mono(tall ? 24 : 18)}>{`That’s a wrap · ${pad(page.totalDays)} days`}</div>
			</div>

			<div style={{ display: 'flex', flexDirection: 'column' }}>
				<div
					style={{
						fontFamily: 'Display',
						fontSize: tall ? 116 : 72,
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
						fontSize: tall ? 60 : 38,
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
						<div style={{ ...mono(tall ? 20 : 14), width: nameW }}>{m.name.split(' ')[0]}</div>
						{days.map((day) => {
							const cell = day.cells.find((x) => x.userId === m.userId)
							return (
								<div
									key={day.day}
									style={{
										width: block,
										height: blockH,
										borderRadius: 4,
										background: cell?.in ? tone.fill : 'transparent',
										border: cell?.held && !cell.in ? `2px dashed ${tone.line}` : 'none',
										opacity: cell?.held ? 1 : 0
									}}
								/>
							)
						})}
					</div>
				))}
			</div>

			<div style={{ display: 'flex', gap: tall ? 28 : 20, alignItems: 'stretch' }}>
				<div
					style={{
						display: 'flex',
						flexDirection: 'column',
						justifyContent: 'space-between',
						gap: tall ? 18 : 8,
						flex: 1,
						background: tone.fill,
						borderRadius: tall ? 14 : 10,
						padding: tall ? 32 : 20
					}}
				>
					<div style={mono(tall ? 20 : 14, tone.onFillMuted)}>
						{page.nobodyPays ? 'Everybody wins' : 'Who pays'}
					</div>
					<div
						style={{
							display: 'flex',
							flexDirection: tall ? 'column' : 'row',
							gap: tall ? 0 : 12,
							fontFamily: 'Display',
							fontSize: tall ? 76 : 44,
							lineHeight: 0.98,
							letterSpacing: tall ? -3.5 : -2,
							color: tone.onFill
						}}
					>
						{headlineLines(page.headline).map((line, i) => (
							<div key={line} style={{ color: i === 0 ? tone.onFill : tone.onFillLarge }}>
								{line}
							</div>
						))}
					</div>
				</div>
				{awards.length > 0 ? (
					<div
						style={{
							display: 'flex',
							flexDirection: 'column',
							justifyContent: 'center',
							gap: tall ? 18 : 10,
							width: tall ? 330 : 300
						}}
					>
						{awards.map((a) => (
							<div key={a.title} style={{ display: 'flex', flexDirection: 'column' }}>
								<div style={mono(tall ? 18 : 13, tone.ink)}>{a.title}</div>
								<div
									style={{
										fontFamily: 'Display',
										fontSize: tall ? 34 : 24,
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
						borderTop: `1px solid ${c.borderSoft}`,
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
							<div style={mono(16)}>{m.name.split(' ')[0]}</div>
						</div>
					))}
				</div>
			) : null}
		</div>,
		{ ...size, fonts: await fonts() }
	)
}
