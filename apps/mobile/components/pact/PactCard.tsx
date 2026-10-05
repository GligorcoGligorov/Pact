import { StyleSheet, View } from 'react-native'
import { router } from 'expo-router'
import { Camera, Check, Flame } from 'lucide-react-native'
import type { PactListItem } from '@app/contract'
import { Pop } from '@/components/motion/Pop'
import { PressableScale } from '@/components/motion/PressableScale'
import { Button } from '@/components/ui/Button'
import { Text } from '@/components/ui/Text'
import { useTheme } from '@/contexts/ThemeContext'
import { daysBetween, localIsoDate, shortDay } from '@/lib/pacts'
import { AvatarStack, crewLine } from './Avatars'
import { Ring } from './Ring'
import { StateChip, type ChipTone } from './StateChip'

/** Where the caller stands in a pact today, when there is no board to show it. */
function statusChip(pact: PactListItem): { label: string; tone: ChipTone } | null {
	switch (pact.status) {
		case 'lobby':
			return { label: `Starts ${shortDay(pact.start_day)}`, tone: 'info' }
		case 'completed':
			return { label: 'Finished', tone: 'neutral' }
		case 'cancelled':
			return { label: 'Cancelled', tone: 'neutral' }
		case 'active':
			return pact.my_state_today === null ? { label: 'Rest day', tone: 'neutral' } : null
	}
}

/** Home's order: today's to-dos first, then the rest of what's running, then what's coming. */
export function pactRank(pact: PactListItem): number {
	if (pact.status === 'active') return pact.my_state_today === 'out' ? 0 : 1
	if (pact.status === 'lobby') return 2
	return 3
}

/**
 * A pact on home, social first (ref 01, 02, 04): the habit and the crew's ring, everyone's face
 * with who's in today, the streak, and the check-in two taps from home.
 */
export function PactCard({ pact, myId }: { pact: PactListItem; myId: string | null }) {
	const { colors: c, elevation } = useTheme()
	const board = pact.today
	const chip = statusChip(pact)
	const owes = pact.status === 'active' && pact.my_state_today === 'out'
	const done = pact.my_state_today === 'in' || pact.my_state_today === 'saver'
	const total = daysBetween(pact.start_day, pact.end_day) + 1
	const day = Math.min(daysBetween(pact.start_day, localIsoDate()) + 1, total)
	const streak = pact.progress.current_streak

	return (
		<PressableScale
			scaleTo="card"
			lift={{ from: elevation.card, to: elevation.raised }}
			onPress={() => router.push(`/pact/${pact.id}`)}
			accessibilityRole="button"
			accessibilityLabel={`${pact.name}: ${pact.habit}.${board ? ` ${crewLine(board.members, myId)}.` : ''}`}
			style={[
				s.card,
				{ backgroundColor: c.surface, borderColor: c.borderHairline },
				elevation.card
			]}
		>
			<View style={s.top}>
				<View style={s.title}>
					<Text variant="eyebrow" tone="tertiary" numberOfLines={1}>
						{pact.name}
						{pact.status === 'active' ? ` · Day ${day}/${total}` : ''}
					</Text>
					<Text variant="h2" numberOfLines={2}>
						{pact.habit}
					</Text>
					{chip ? <StateChip label={chip.label} tone={chip.tone} /> : null}
				</View>
				{board && board.held_count > 0 ? (
					<Ring
						value={board.in_count}
						max={board.held_count}
						size={68}
						stroke={8}
						color={c.brandFill}
						track={c.tintTrack}
					>
						{board.in_count === board.held_count ? (
							// Lands once the ring has filled.
							<Pop delay={RING_FILL_MS}>
								<Check size={24} color={c.brandInk} strokeWidth={3} />
							</Pop>
						) : (
							<Text variant="label" tabular>
								{board.in_count}/{board.held_count}
							</Text>
						)}
					</Ring>
				) : null}
			</View>

			<View style={s.social}>
				{board && board.members.length > 0 ? (
					<View style={s.crew}>
						<AvatarStack members={board.members} size={32} max={5} />
						<Text variant="caption" tone="secondary" numberOfLines={1} style={s.crewText}>
							{crewLine(board.members, myId, { short: true })}
						</Text>
					</View>
				) : (
					<View style={s.crew} />
				)}
				<View style={s.streak} accessibilityLabel={`${streak} day streak`}>
					<Flame
						size={20}
						color={streak > 0 ? c.warning : c.textDisabled}
						fill={streak > 0 ? c.warningSoft : 'none'}
					/>
					<Text variant="h3" tabular>
						{streak}
					</Text>
				</View>
			</View>

			{owes ? (
				<Button
					label="Check in"
					fullWidth
					haptic="snap"
					icon={(color) => <Camera size={18} color={color} strokeWidth={2.2} />}
					onPress={() => router.push(`/pact/${pact.id}/check-in`)}
				/>
			) : done ? (
				<View style={[s.doneBar, { backgroundColor: c.successSoft }]}>
					<Pop>
						<Check size={16} color={c.successText} strokeWidth={3} />
					</Pop>
					<Text variant="label" tone="success">
						{pact.my_state_today === 'saver' ? 'Saver used today' : "You're in today"}
					</Text>
				</View>
			) : null}
		</PressableScale>
	)
}

/** About when Ring's gentle spring has nearly filled the arc. */
const RING_FILL_MS = 250

const s = StyleSheet.create({
	card: {
		borderRadius: 28,
		borderWidth: StyleSheet.hairlineWidth,
		padding: 20,
		gap: 18
	},
	top: { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
	title: { flex: 1, gap: 6 },
	social: { flexDirection: 'row', alignItems: 'center', gap: 12 },
	crew: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
	crewText: { flex: 1 },
	streak: { flexDirection: 'row', alignItems: 'center', gap: 4 },
	doneBar: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 6,
		minHeight: 44,
		borderRadius: 999
	}
})
