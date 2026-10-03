import { StyleSheet, View } from 'react-native'
import { Camera, Link2Off, Sparkles } from 'lucide-react-native'
import { Card } from '@/components/ui/Card'
import { Text } from '@/components/ui/Text'
import { useColors } from '@/contexts/ThemeContext'

const STEPS = [
	{
		icon: Camera,
		title: 'A photo, every day',
		body: "Show the habit and the day's challenge, so it can't be an old photo."
	},
	{
		icon: Sparkles,
		title: 'The AI takes a look',
		body: 'It flags anything odd and adds a one-liner. It never fails anyone.'
	},
	{
		icon: Link2Off,
		title: 'Miss a day, the chain breaks',
		body: 'The day counts only when everyone is in. The whole crew sees it.'
	}
] as const

/** The pact in three steps, for whoever is about to make or join one. */
export function HowItWorks() {
	const c = useColors()
	return (
		<Card padding="normal" style={s.card}>
			<Text variant="eyebrow" tone="tertiary">
				How it works
			</Text>
			{STEPS.map(({ icon: Icon, title, body }, i) => (
				<View key={title} style={s.step}>
					<View style={[s.icon, { backgroundColor: c.brandDim }]}>
						<Icon size={20} color={c.brandInk} />
					</View>
					<View style={s.text}>
						<Text variant="label">
							{i + 1}. {title}
						</Text>
						<Text variant="caption" tone="secondary">
							{body}
						</Text>
					</View>
				</View>
			))}
		</Card>
	)
}

const s = StyleSheet.create({
	card: { gap: 14 },
	step: { flexDirection: 'row', gap: 12, alignItems: 'center' },
	icon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
	text: { flex: 1, gap: 2 }
})
