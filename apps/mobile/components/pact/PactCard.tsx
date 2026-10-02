import { StyleSheet, View } from 'react-native'
import { router } from 'expo-router'
import { Camera, Check, ChevronRight } from 'lucide-react-native'
import type { PactListItem } from '@app/contract'
import { PressableScale } from '@/components/motion/PressableScale'
import { Text } from '@/components/ui/Text'
import { useColors } from '@/contexts/ThemeContext'
import { daysBetween, localIsoDate, shortDay } from '@/lib/pacts'
import { StateChip, type ChipTone } from './StateChip'

/** Where the caller stands in a pact today, as the card's chip says it. */
export function pactChip(pact: PactListItem): { label: string; tone: ChipTone } {
	switch (pact.status) {
		case 'lobby':
			return { label: `Starts ${shortDay(pact.start_day)}`, tone: 'info' }
		case 'completed':
			return { label: 'Finished', tone: 'neutral' }
		case 'cancelled':
			return { label: 'Cancelled', tone: 'neutral' }
		case 'active':
			if (pact.my_state_today === 'in') return { label: 'Done', tone: 'success' }
			if (pact.my_state_today === 'saver') return { label: 'Saver used', tone: 'info' }
			if (pact.my_state_today === 'out') return { label: 'To do', tone: 'warning' }
			return { label: 'Not today', tone: 'neutral' }
	}
}

/** Home's order: today's to-dos first, then the rest of what's running, then what's coming. */
export function pactRank(pact: PactListItem): number {
	if (pact.status === 'active') return pact.my_state_today === 'out' ? 0 : 1
	if (pact.status === 'lobby') return 2
	return 3
}

/** "Day 6 of 21" for an active pact, on this device's calendar. */
function dayOf(pact: PactListItem): { day: number; total: number } {
	return {
		day: daysBetween(pact.start_day, localIsoDate()) + 1,
		total: daysBetween(pact.start_day, pact.end_day) + 1
	}
}

export function PactCard({ pact }: { pact: PactListItem }) {
	const c = useColors()
	const chip = pactChip(pact)
	const canCheckIn = pact.status === 'active' && pact.my_state_today === 'out'
	const progress = pact.status === 'active' ? dayOf(pact) : null

	return (
		<PressableScale
			scaleTo="card"
			onPress={() => router.push(`/pact/${pact.id}`)}
			accessibilityRole="button"
			accessibilityLabel={`${pact.name}: ${pact.habit}. ${chip.label}.`}
			style={[s.card, { backgroundColor: c.surface, borderColor: c.borderHairline }]}
		>
			<View style={s.body}>
				<Text variant="h3" numberOfLines={1}>
					{pact.habit}
				</Text>
				<Text variant="bodySm" tone="secondary" numberOfLines={1}>
					{pact.name}
				</Text>
				<View style={s.meta}>
					<StateChip label={chip.label} tone={chip.tone} />
					{progress ? (
						<Text variant="caption" tone="tertiary" tabular>
							Day {Math.min(progress.day, progress.total)} of {progress.total}
						</Text>
					) : null}
				</View>
			</View>

			<View style={[s.side, { borderLeftColor: c.borderHairline }]}>
				{canCheckIn ? (
					<PressableScale
						scaleTo="button"
						haptic="snap"
						onPress={() => router.push(`/pact/${pact.id}/check-in`)}
						accessibilityRole="button"
						accessibilityLabel={`Check in to ${pact.name}`}
						style={[s.checkIn, { backgroundColor: c.brandFill }]}
					>
						<Camera size={20} color={c.onBrand} strokeWidth={2.2} />
					</PressableScale>
				) : pact.my_state_today === 'in' || pact.my_state_today === 'saver' ? (
					<View style={[s.done, { backgroundColor: c.successSoft }]}>
						<Check size={20} color={c.successText} strokeWidth={2.6} />
					</View>
				) : (
					<ChevronRight size={20} color={c.textTertiary} />
				)}
			</View>
		</PressableScale>
	)
}

const s = StyleSheet.create({
	card: {
		flexDirection: 'row',
		alignItems: 'center',
		borderRadius: 22,
		borderWidth: StyleSheet.hairlineWidth,
		paddingVertical: 16,
		paddingLeft: 18
	},
	body: { flex: 1, gap: 4 },
	meta: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
	side: {
		width: 76,
		alignSelf: 'stretch',
		alignItems: 'center',
		justifyContent: 'center',
		borderLeftWidth: StyleSheet.hairlineWidth,
		marginLeft: 12
	},
	checkIn: {
		width: 48,
		height: 48,
		borderRadius: 24,
		alignItems: 'center',
		justifyContent: 'center'
	},
	done: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' }
})
