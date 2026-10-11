/**
 * Welcome — the first thing a new person sees. One promise, the product in a glance, one way
 * forward. The glance is a Crew Wall of real photos: four friends, three days, one kept row
 * glowing in the crew's colour and today's last tile still waiting. The tagline and description
 * come from lib/constants.ts (the website says the same).
 */
import { View } from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { FadeSlideIn } from '@/components/motion/FadeSlideIn'
import { Button } from '@/components/ui/Button'
import { CornerMarks } from '@/components/ui/CornerMarks'
import { Text } from '@/components/ui/Text'
import { DemoWall, type DemoRow } from '@/components/wall/DemoWall'
import { useTheme } from '@/contexts/ThemeContext'
import { APP_DESCRIPTION, APP_NAME, APP_TAGLINE } from '@/lib/constants'
import { makeStyles } from '@/lib/themedStyles'

/** Today (one still out), yesterday kept, the day before kept. */
const WALL: DemoRow[] = [
	{ tiles: [0, 1, 2, { waiting: 'DA' }] },
	{ tiles: [3, 4, 5, 6], kept: true },
	{ tiles: [7, 8, 9, 10], kept: true }
]

export default function WelcomeScreen() {
	const insets = useSafeAreaInsets()
	const { colors: c, layout } = useTheme()
	const s = useStyles()
	// The tagline's two sentences, as a two-tone headline.
	const [first, ...rest] = APP_TAGLINE.split('. ')
	const second = rest.join('. ')

	return (
		<View style={s.root}>
			<View style={[s.top, { paddingTop: insets.top + 12, paddingHorizontal: layout.gutterWide }]}>
				<Text variant="mono">{APP_NAME}</Text>
				<Text variant="mono" tone="secondary">
					Day 08 / 21 · 3 / 4 in
				</Text>
			</View>

			<View style={[s.stage, { paddingHorizontal: layout.gutterWide }]}>
				<CornerMarks>
					<View style={s.wall}>
						<DemoWall rows={WALL} tone={c.crew.coral} aspect={0.95} />
					</View>
				</CornerMarks>
			</View>

			<View style={[s.copy, { paddingHorizontal: layout.gutterWide }]}>
				<FadeSlideIn index={0}>
					<View accessibilityRole="header" accessibilityLabel={APP_TAGLINE}>
						<Text variant="display">{second ? `${first}.` : first}</Text>
						{second ? (
							<Text variant="display" tone="tertiary">
								{second}
							</Text>
						) : null}
					</View>
				</FadeSlideIn>
				<FadeSlideIn index={1}>
					<Text variant="lead" tone="secondary">
						{APP_DESCRIPTION}
					</Text>
				</FadeSlideIn>
			</View>

			<FadeSlideIn
				index={2}
				style={[
					s.actions,
					{ paddingBottom: insets.bottom + 16, paddingHorizontal: layout.gutterWide }
				]}
			>
				<Button
					label="Get started"
					size="lg"
					withArrow
					fullWidth
					onPress={() => router.push('/(auth)/login')}
				/>
				<Button
					label="I already have an account"
					variant="ghost"
					fullWidth
					onPress={() => router.push('/(auth)/login')}
				/>
				<Text variant="caption" tone="tertiary" style={s.legal}>
					By continuing you agree to the{' '}
					<Text
						variant="caption"
						tone="secondary"
						style={s.link}
						onPress={() => router.push('/terms')}
						accessibilityRole="link"
					>
						Terms
					</Text>{' '}
					and{' '}
					<Text
						variant="caption"
						tone="secondary"
						style={s.link}
						onPress={() => router.push('/privacy')}
						accessibilityRole="link"
					>
						Privacy Policy
					</Text>
					.
				</Text>
			</FadeSlideIn>
		</View>
	)
}

const useStyles = makeStyles((c) => ({
	root: { flex: 1, backgroundColor: c.bg },
	top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
	stage: { flex: 1, justifyContent: 'center', paddingVertical: 28 },
	wall: { padding: 2 },
	copy: { gap: 14, paddingBottom: 24 },
	actions: { gap: 6 },
	legal: { textAlign: 'center', marginTop: 8 },
	link: { textDecorationLine: 'underline' }
}))
