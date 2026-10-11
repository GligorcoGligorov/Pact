/**
 * daylight — Pact's world: warm paper and near-black ink (docs/design/ui-revamp/plan.md).
 *
 * The ground is a warm paper off-white, the ink near-black, and the accent in brand.config.ts
 * is the ink itself: buttons are ink pills. The only colour in the product is each crew's own,
 * used sparingly (the chain's closed links, the crew's mark). Headlines are Inter Tight, big and
 * tight; metadata is IBM Plex Mono in caps. Hairlines separate, nothing floats: one shadow style
 * (`overlay`, for sheets and modals), the rest flat.
 *
 * Neutrals are authored here and pinned by the contrast test. Accent roles are never written
 * here — packages/brand derives them from the single accent in brand.config.ts.
 */

import type { Preset } from '../src/types'

export const daylight: Preset = {
	name: 'daylight',
	// Pact at night: dark first, the crews' colours glowing on near-black. Light still works.
	primaryScheme: 'dark',
	// Ink: Pact's buttons are ink pills, and colour belongs to the crews.
	defaultAccent: '#151412',

	schemes: {
		light: {
			scheme: 'light',
			name: 'daylight',
			ground: {
				bg: '#f2efe9', //       warm paper
				well: '#e9e5dd', //     a step darker, same hue
				surface: '#f7f5f0', //  a sheet of lighter paper, never white
				surface2: '#ebe7df', // chips, inputs
				surface3: '#e6e2d9' //  pressed rows, segmented tracks
			},
			text: {
				primary: '#151412', //   ink
				body: '#262521', //
				secondary: '#4f4c46', //
				tertiary: '#5f5b54', //  the muted second line of a two-tone headline
				disabled: '#a29e95' //
			},
			semantic: {
				success: { solid: '#23773d', text: '#236436' },
				// Burnt orange, kept clear of the marigold accent.
				warning: { solid: '#ed8725', text: '#9a4602' },
				error: { solid: '#c52c2a', text: '#a92321' },
				info: { solid: '#036eae', text: '#025c93' }
			},
			onFill: { ink: '#151412', paper: '#f2efe9' },
			shadowTint: '#1a1814',
			hero: { bg: '#151412', text: '#f2efe9', textSecondary: '#a29e95' },
			alpha: {
				hairline: 0.12,
				soft: 0.18,
				active: 0.24,
				glass: 0.65,
				brandDim: 0.18,
				brandBorder: 0.4,
				brandGlow: 0.3,
				overlay: 0.34,
				scrim: 0.7,
				track: 0.08,
				semanticSoft: 0.12,
				semanticBorder: 0.34,
				glassTint: 0.72,
				shimmerSweep: 0.6
			}
		},
		dark: {
			scheme: 'dark',
			name: 'ink',
			ground: {
				bg: '#0b0b0a', //       near-black, not grey
				well: '#10100e', //
				surface: '#161614', //
				surface2: '#1e1e1b', //
				surface3: '#282824' //
			},
			text: {
				primary: '#f2efe9', //   paper, never pure white
				body: '#dcd8d0', //
				secondary: '#b5b0a6', //
				tertiary: '#a39d92', //
				disabled: '#5d5a53' //
			},
			semantic: {
				success: { solid: '#23773d', text: '#79d28d' },
				warning: { solid: '#f59740', text: '#f7b56a' },
				error: { solid: '#c12e2b', text: '#f49287' },
				info: { solid: '#036eae', text: '#89c1f1' }
			},
			onFill: { ink: '#151412', paper: '#f2efe9' },
			shadowTint: '#000000',
			hero: { bg: '#151412', text: '#f2efe9', textSecondary: '#a29e95' },
			alpha: {
				hairline: 0.08,
				soft: 0.12,
				active: 0.22,
				glass: 0.12,
				brandDim: 0.16,
				brandBorder: 0.42,
				brandGlow: 0.26,
				overlay: 0.62,
				scrim: 0.72,
				track: 0.14,
				semanticSoft: 0.16,
				semanticBorder: 0.4,
				glassTint: 0.55,
				shimmerSweep: 0.08
			}
		}
	},

	fonts: {
		display: {
			name: 'Inter Tight',
			fallback: 'system-ui, -apple-system, sans-serif',
			files: { 500: 'InterTight_500Medium', 600: 'InterTight_600SemiBold' }
		},
		text: {
			name: 'Inter',
			fallback: 'system-ui, -apple-system, sans-serif',
			files: {
				400: 'Inter_400Regular',
				500: 'Inter_500Medium',
				600: 'Inter_600SemiBold',
				700: 'Inter_700Bold',
				800: 'Inter_800ExtraBold'
			}
		},
		mono: {
			name: 'IBM Plex Mono',
			fallback: 'ui-monospace, Menlo, monospace',
			files: { 500: 'IBMPlexMono_500Medium' }
		}
	},

	// One grotesque, set big and tight: Inter Tight at 600 for headlines (500 for the largest,
	// where weight comes from size). Metadata is mono caps. No eyebrows in a brand colour.
	type: {
		displayHero: {
			family: 'display',
			weight: 500,
			size: 56,
			lineHeight: 54,
			tracking: -0.05,
			maxScale: 1.2
		},
		display: {
			family: 'display',
			weight: 600,
			size: 42,
			lineHeight: 42,
			tracking: -0.045,
			maxScale: 1.25
		},
		h1: {
			family: 'display',
			weight: 600,
			size: 32,
			lineHeight: 33,
			tracking: -0.04,
			maxScale: 1.3
		},
		h2: {
			family: 'display',
			weight: 600,
			size: 24,
			lineHeight: 27,
			tracking: -0.03,
			maxScale: 1.35
		},
		h3: {
			family: 'display',
			weight: 600,
			size: 18,
			lineHeight: 23,
			tracking: -0.015,
			maxScale: 1.5
		},
		title: {
			family: 'display',
			weight: 600,
			size: 28,
			lineHeight: 30,
			tracking: -0.04,
			maxScale: 1.35
		},
		question: {
			family: 'display',
			weight: 600,
			size: 26,
			lineHeight: 30,
			tracking: -0.03,
			maxScale: 1.35
		},
		lead: {
			family: 'text',
			weight: 400,
			size: 17,
			lineHeight: 25,
			tracking: -0.012,
			maxScale: 1.8
		},
		body: { family: 'text', weight: 400, size: 16, lineHeight: 24, tracking: -0.006, maxScale: 2 },
		bodySm: {
			family: 'text',
			weight: 400,
			size: 14,
			lineHeight: 20,
			tracking: -0.003,
			maxScale: 2
		},
		caption: { family: 'text', weight: 500, size: 13, lineHeight: 18, tracking: 0, maxScale: 2 },
		// The old tracked-caps eyebrow is now a mono micro-label: "DAY 08 / 21".
		eyebrow: {
			family: 'mono',
			weight: 500,
			size: 11,
			lineHeight: 14,
			tracking: 0.06,
			uppercase: true,
			tabular: true,
			maxScale: 1.4
		},
		label: {
			family: 'text',
			weight: 600,
			size: 15,
			lineHeight: 20,
			tracking: -0.012,
			maxScale: 1.6
		},
		labelTracked: {
			family: 'mono',
			weight: 500,
			size: 12,
			lineHeight: 16,
			tracking: 0.06,
			uppercase: true,
			tabular: true,
			maxScale: 1.4
		},
		number: {
			family: 'display',
			weight: 500,
			size: 34,
			lineHeight: 36,
			tracking: -0.04,
			tabular: true,
			maxScale: 1.3
		},
		mono: {
			family: 'mono',
			weight: 500,
			size: 11,
			lineHeight: 14,
			tracking: 0.06,
			uppercase: true,
			tabular: true,
			maxScale: 1.4
		}
	},

	// Engineered, not soft: small radii on cards and inputs, pills only for buttons.
	radii: {
		sm: 2,
		md: 4,
		lg: 6,
		xl: 8,
		'2xl': 10,
		'3xl': 14,
		'4xl': 20,
		pill: 999,
		button: 999,
		input: 6,
		chip: 4,
		row: 6,
		card: 8,
		sheet: 20
	},

	art: { scrim: 'rgba(12,6,4,0.84)', ink: '#efece6' },

	// One shadow style: `overlay`, for what sits above the page (sheets, modals, toasts).
	// Everything on the page is flat and separated by hairlines.
	elevation: {
		flat: { y: 0, blur: 0, spread: 0, light: 0, dark: 0, android: 0 },
		soft: { y: 0, blur: 0, spread: 0, light: 0, dark: 0, android: 0 },
		card: { y: 0, blur: 0, spread: 0, light: 0, dark: 0, android: 0 },
		raised: { y: 0, blur: 0, spread: 0, light: 0, dark: 0, android: 0 },
		overlay: { y: 12, blur: 32, spread: -8, light: 0.16, dark: 0.5, android: 10 },
		cta: { y: 0, blur: 0, spread: 0, light: 0, dark: 0, android: 0 }
	},

	// Crisp: stiffer springs. Snappy and settle are damped to about 0.65 and
	// overshoot by 6 to 7%, the settle that reads as crisp, never a bounce;
	// smooth (0.81) overshoots about 1% and gentle (0.98) not at all. Shorter
	// durations, tighter stagger.
	motion: {
		springs: {
			snappy: { damping: 22, stiffness: 340, mass: 0.8 },
			smooth: { damping: 24, stiffness: 220, mass: 1 },
			gentle: { damping: 24, stiffness: 150, mass: 1 },
			settle: { damping: 20, stiffness: 260, mass: 0.9 }
		},
		easing: {
			out: [0.2, 0.9, 0.25, 1],
			inOut: [0.6, 0, 0.3, 1],
			in: [0.5, 0, 0.85, 0.45]
		},
		duration: {
			fast: 160,
			base: 300,
			slow: 460,
			enter: 380,
			exit: 160,
			modalIn: 240,
			modalOut: 160
		},
		stagger: { step: 60, cap: 6, distance: 14 },
		press: { button: 0.94, card: 0.975 }
	}
}
