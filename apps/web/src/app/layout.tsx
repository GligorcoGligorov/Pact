import type { Metadata, Viewport } from 'next'
import { IBM_Plex_Mono, Inter, Inter_Tight, Source_Serif_4 } from 'next/font/google'
import { Suspense } from 'react'
import { Analytics } from '@vercel/analytics/next'
import { brandConfig, brandCss, palette, theme } from '@app/brand'
import { PostHogProvider } from '@/components/PostHogProvider'
import { GoogleAnalytics } from '@/components/GoogleAnalytics'
import { SCHEME_SCRIPT } from '@/lib/scheme'
import './globals.css'

// Fonts. Inter is the text face for both presets; the display face is picked
// by the preset through --font-display (packages/brand/src/css.ts): Source
// Serif 4 for dusk, Inter Tight for daylight (Pact). Both are declared so a
// preset switch is one line in brand.config.ts; neither display face is
// preloaded, so the one the preset does not use is never downloaded. IBM Plex
// Mono sets the micro-labels (--font-mono).
const inter = Inter({
	subsets: ['latin'],
	variable: '--font-inter',
	display: 'swap'
})

const sourceSerif = Source_Serif_4({
	subsets: ['latin'],
	variable: '--font-source-serif',
	display: 'swap',
	axes: ['opsz'],
	preload: false
})

const interTight = Inter_Tight({
	subsets: ['latin'],
	variable: '--font-inter-tight',
	display: 'swap',
	preload: false
})

const plexMono = IBM_Plex_Mono({
	subsets: ['latin'],
	weight: ['500'],
	variable: '--font-plex-mono',
	display: 'swap',
	preload: false
})

// Every colour, radius, shadow and easing as CSS variables, generated from the
// same TS source the mobile app reads — no second copy to drift.
const BRAND_CSS = brandCss(theme)

const SITE_NAME = brandConfig.siteName

// The marketing site's design contract (impeccable), emitted as the body's
// first child so it survives the build and anyone can read it in view-source.
// React cannot emit a bare comment, so it rides inside an inert, hidden div.
const DIRECTION_CONTRACT = `<!--
THESIS: The first viewport is the product's signature: a Crew Wall of real check-in photos assembling itself, one row kept when the last friend checks in. Refuses a centred headline over a screenshot slot.
WORLD: near-black ground (light by toggle), one saturated crew colour per section (coral leads), Inter Tight two-tone headlines, Plex Mono micro-labels, corner marks, crosshairs and a faint construction grid. No emoji, gradients, glass or icon cards.
STORY: hero wall, a marquee of check-ins, how it works as a pinned four-step stage with a rail, "Your turn." (sign a pact yourself), the numbers, a coral band.
REFERENCES AND SCORES: docs/design/web-revamp/plan.md
-->`

// Replace with your real domain. Falls back to NEXT_PUBLIC_SITE_URL in env.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://example.com'

const PITCH =
	'Make a pact with your friends: one habit, a photo every day, and an AI judge. Miss a day and the whole crew sees it.'

export const metadata: Metadata = {
	metadataBase: new URL(SITE_URL),
	title: {
		default: `${SITE_NAME} — Nobody notices when you quit. Your friends will.`,
		template: `%s · ${SITE_NAME}`
	},
	description: PITCH,
	openGraph: {
		title: `${SITE_NAME} — Nobody notices when you quit. Your friends will.`,
		description: PITCH,
		url: SITE_URL,
		siteName: SITE_NAME,
		locale: 'en_US',
		type: 'website'
	},
	twitter: {
		card: 'summary_large_image',
		title: SITE_NAME,
		description: PITCH
	}
	// The favicon is app/icon.tsx, drawn from the brand — no need to declare it.
}

export const viewport: Viewport = {
	themeColor: palette().bg,
	colorScheme: theme.primaryScheme,
	width: 'device-width',
	initialScale: 1
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html
			lang="en"
			data-preset={theme.preset}
			data-scheme={theme.primaryScheme}
			suppressHydrationWarning
			className={`${inter.variable} ${sourceSerif.variable} ${interTight.variable} ${plexMono.variable}`}
		>
			<head>
				{/* Before first paint: the visitor's stored light/dark choice (see ThemeToggle). */}
				<script dangerouslySetInnerHTML={{ __html: SCHEME_SCRIPT }} />
				<style id="brand-tokens" dangerouslySetInnerHTML={{ __html: BRAND_CSS }} />
			</head>
			<body>
				<div hidden dangerouslySetInnerHTML={{ __html: DIRECTION_CONTRACT }} />
				<Suspense fallback={null}>
					<PostHogProvider>{children}</PostHogProvider>
					<GoogleAnalytics />
				</Suspense>
				<Analytics />
			</body>
		</html>
	)
}
