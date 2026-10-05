import 'server-only'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { ImageResponse } from 'next/og'
import { theme } from '@app/brand'
import type { ResultPage } from './result-page'

// The results as an image (R25), in two shapes from one design:
//  - `tall` (1080×1350), the card the app shares through the share sheet: made for a group
//    chat or a story, the thing a crew screenshots;
//  - `wide` (1200×630), the link preview /results/[pact] unfurls into.
// The crew's colour fills it, the chain is drawn in it, and the stake is the headline.

export const RESULT_CARD_SIZES = {
	tall: { width: 1080, height: 1350 },
	wide: { width: 1200, height: 630 }
} as const

/** An image has no CSS variables: it reads the light palette's tokens directly. */
const c = theme.palettes.light
const MAX_AWARDS = 3

const font = (file: string) => readFile(path.join(process.cwd(), 'assets/fonts', file))

async function fonts() {
	const [display, medium, bold] = await Promise.all([
		font('BricolageGrotesque_800ExtraBold.ttf'),
		font('Inter_500Medium.ttf'),
		font('Inter_700Bold.ttf')
	])
	return [
		{ name: 'Bricolage', data: display, weight: 800 as const },
		{ name: 'Inter', data: medium, weight: 500 as const },
		{ name: 'Inter', data: bold, weight: 700 as const }
	]
}

function Check({ size, color }: { size: number; color: string }) {
	return (
		<svg width={size} height={size} viewBox="0 0 24 24">
			<polyline
				points="4 12 10 18 20 6"
				fill="none"
				stroke={color}
				strokeWidth={4}
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	)
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
					fontFamily: 'Bricolage',
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
	// Tiles shrink on a long pact so the chain stays two or three rows.
	const tile = tall ? (page.chain.length > 21 ? 40 : 64) : page.chain.length > 14 ? 30 : 44
	const gap = Math.round(tile / 6)
	// Whole weeks to a row where they fit, so the chain reads as a calendar, not a run-on line.
	const n = page.chain.length
	const cols = n <= 14 ? 7 : tall ? 14 : 10
	const chainWidth = Math.min(n, cols) * (tile + gap) - gap

	const header = (
		<div style={{ display: 'flex', alignItems: 'center', gap: tall ? 24 : 18 }}>
			<div
				style={{
					display: 'flex',
					width: tall ? 104 : 72,
					height: tall ? 104 : 72,
					borderRadius: 999,
					background: c.surface,
					alignItems: 'center',
					justifyContent: 'center',
					fontSize: tall ? 56 : 40
				}}
			>
				{page.emoji}
			</div>
			<div style={{ display: 'flex', flexDirection: 'column' }}>
				<div
					style={{
						fontSize: tall ? 26 : 20,
						fontWeight: 700,
						letterSpacing: 3,
						textTransform: 'uppercase',
						color: tone.onFillMuted
					}}
				>
					The results are in
				</div>
				<div
					style={{
						fontFamily: 'Bricolage',
						fontSize: tall ? 60 : 44,
						lineHeight: 1.05,
						color: tone.onFill,
						letterSpacing: -1.5
					}}
				>
					{page.name}
				</div>
			</div>
		</div>
	)

	const score = (
		<div style={{ display: 'flex', flexDirection: 'column', gap: tall ? 28 : 18 }}>
			<div style={{ display: 'flex', alignItems: 'flex-end', gap: 20 }}>
				<div
					style={{
						fontFamily: 'Bricolage',
						fontSize: tall ? 190 : 112,
						lineHeight: 0.9,
						color: tone.onFill,
						letterSpacing: -6
					}}
				>
					{`${page.keptDays}/${page.totalDays}`}
				</div>
				<div
					style={{
						display: 'flex',
						flexDirection: 'column',
						fontSize: tall ? 36 : 24,
						fontWeight: 500,
						color: tone.onFillMuted,
						paddingBottom: tall ? 14 : 6
					}}
				>
					<div>days kept together</div>
					<div>{`best run ${page.bestStreak} 🔥`}</div>
				</div>
			</div>
			<div style={{ display: 'flex', flexWrap: 'wrap', gap, width: chainWidth }}>
				{page.chain.map(({ day, status }) => (
					<div
						key={day}
						style={{
							display: 'flex',
							width: tile,
							height: tile,
							borderRadius: Math.round(tile / 3.2),
							alignItems: 'center',
							justifyContent: 'center',
							background: status === 'kept' ? c.surface : 'transparent',
							border:
								status === 'kept' ? 'none' : `${Math.max(3, tile / 14)}px solid ${tone.onFillTrack}`
						}}
					>
						{status === 'kept' ? <Check size={tile * 0.5} color={tone.fill} /> : null}
					</div>
				))}
			</div>
		</div>
	)

	const awards = page.awards.slice(0, tall ? MAX_AWARDS : MAX_AWARDS - 1)
	const panel = (
		<div
			style={{
				display: 'flex',
				flexDirection: 'column',
				gap: tall ? 26 : 16,
				justifyContent: 'center',
				background: c.surface,
				borderRadius: tall ? 48 : 36,
				padding: tall ? 52 : 36,
				// Satori reads every style value as a string: an undefined one throws.
				...(tall ? {} : { flex: 1 })
			}}
		>
			<div
				style={{
					fontFamily: 'Bricolage',
					fontSize: tall ? 68 : 44,
					lineHeight: 1.05,
					color: c.textPrimary,
					letterSpacing: -1.5
				}}
			>
				{page.headline}
			</div>
			{awards.length > 0 ? (
				<div style={{ display: 'flex', flexDirection: 'column', gap: tall ? 14 : 8 }}>
					{awards.map((a) => (
						<div key={a.title} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
							<div style={{ display: 'flex', fontSize: tall ? 40 : 28 }}>{a.emoji}</div>
							<div style={{ display: 'flex', flexDirection: 'column' }}>
								<div
									style={{
										fontSize: tall ? 22 : 15,
										fontWeight: 700,
										letterSpacing: 2,
										textTransform: 'uppercase',
										color: tone.ink
									}}
								>
									{a.title}
								</div>
								<div style={{ fontSize: tall ? 32 : 22, fontWeight: 700, color: c.textPrimary }}>
									{a.names}
								</div>
							</div>
						</div>
					))}
				</div>
			) : null}
		</div>
	)

	const footer = (
		<div
			style={{
				display: 'flex',
				justifyContent: 'space-between',
				fontSize: 26,
				fontWeight: 700,
				color: tone.onFillMuted
			}}
		>
			<div>{page.habit}</div>
			<div style={{ fontFamily: 'Bricolage', color: tone.onFill }}>Pact</div>
		</div>
	)
	// Satori lays out real elements only: no fragments, so each shape lists its children.
	const body = tall ? (
		<div
			style={{
				display: 'flex',
				flexDirection: 'column',
				justifyContent: 'space-between',
				width: '100%',
				height: '100%'
			}}
		>
			{header}
			{score}
			{panel}
			{footer}
		</div>
	) : (
		<div style={{ display: 'flex', width: '100%', height: '100%', gap: 40 }}>
			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					justifyContent: 'space-between',
					width: 600,
					flexShrink: 0
				}}
			>
				{header}
				{score}
			</div>
			{panel}
		</div>
	)

	return new ImageResponse(
		<div
			style={{
				display: 'flex',
				width: '100%',
				height: '100%',
				background: tone.fill,
				padding: tall ? 72 : 52,
				fontFamily: 'Inter'
			}}
		>
			{body}
		</div>,
		// The fonts carry no emoji: Twemoji draws them.
		{ ...size, fonts: await fonts(), emoji: 'twemoji' }
	)
}
