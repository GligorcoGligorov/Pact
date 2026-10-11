import { StyleSheet, View } from 'react-native'
import { router } from 'expo-router'
import { Camera } from 'lucide-react-native'
import type { PactListItem } from '@app/contract'
import { PressableScale } from '@/components/motion/PressableScale'
import { Button } from '@/components/ui/Button'
import { Text } from '@/components/ui/Text'
import { useColors } from '@/contexts/ThemeContext'
import { crewTone } from '@/lib/crew'
import { shortDay } from '@/lib/pacts'
import { crewLine } from './Avatars'
import { Chain, chainTiles } from './Chain'
import { CrewHero, OnFill } from './CrewHero'

/** Home's order: today's to-dos first, then the rest of what's running, then what's coming. */
export function pactRank(pact: PactListItem): number {
	if (pact.status === 'active') return pact.my_state_today === 'out' ? 0 : 1
	if (pact.status === 'lobby') return 2
	return 3
}

/** Two digits, the way the micro-labels count. */
const pad = (n: number) => String(n).padStart(2, '0')

/** The card's mono line: "DAY 08 / 21 · 2 / 4 IN", or where the pact stands. */
function metaLine(pact: PactListItem): string {
	const days = chainTiles(pact.progress.chain, pact.start_day, pact.end_day, pact.cadence).length
	switch (pact.status) {
		case 'lobby':
			return `Starts ${shortDay(pact.start_day)} · ${pad(days)} days`
		case 'completed':
			return 'Finished · results are in'
		case 'cancelled':
			return 'Cancelled'
		case 'active': {
			const day = `Day ${pad(pact.progress.chain.length)} / ${pad(days)}`
			const board = pact.today
			if (pact.my_state_today === null || !board || board.held_count === 0)
				return `${day} · rest day`
			return `${day} · ${board.in_count} / ${board.held_count} in`
		}
	}
}

function open(pact: PactListItem) {
	router.push(pact.status === 'completed' ? `/pact/${pact.id}/result` : `/pact/${pact.id}`)
}

/**
 * A pact on home. The one the caller still owes today is the screen's loud block: the crew's
 * colour, its chain closing, and the check-in on it, one tap from home. Every other pact is a
 * quiet paper row with its chain in the crew's line.
 */
export function PactCard({
	pact,
	myId,
	loud
}: {
	pact: PactListItem
	myId: string | null
	/** The screen's one loud block. */
	loud?: boolean
}) {
	const c = useColors()
	const tone = crewTone(c, pact.color)
	const tiles = chainTiles(pact.progress.chain, pact.start_day, pact.end_day, pact.cadence)
	const board = pact.today
	const today =
		board && board.held_count > 0 ? { in: board.in_count, held: board.held_count } : undefined
	const label = `${pact.name}: ${pact.habit}.${board ? ` ${crewLine(board.members, myId)}.` : ''}`

	if (loud) {
		return (
			<CrewHero tone={tone} compact onPress={() => open(pact)} accessibilityLabel={label}>
				<OnFill tone={tone} muted variant="mono">
					{metaLine(pact)}
				</OnFill>
				<View>
					<OnFill tone={tone} variant="h1" numberOfLines={1}>
						{pact.name}
					</OnFill>
					<OnFill tone={tone} muted variant="h2" numberOfLines={2}>
						{pact.habit}
					</OnFill>
				</View>
				<Chain
					tiles={tiles}
					size="small"
					colors={{ ink: tone.onFill, track: tone.onFillTrack, glow: tone.glow }}
					today={today}
				/>
				<Button
					label="Check in"
					fullWidth
					haptic="snap"
					icon={(color) => <Camera size={18} color={color} strokeWidth={1.8} />}
					onPress={() => router.push(`/pact/${pact.id}/check-in`)}
				/>
			</CrewHero>
		)
	}

	const done = pact.my_state_today === 'in' || pact.my_state_today === 'saver'
	return (
		<PressableScale
			scaleTo="card"
			haptic="press"
			onPress={() => open(pact)}
			accessibilityRole="button"
			accessibilityLabel={label}
			style={[s.row, { borderTopColor: c.textPrimary }]}
		>
			<View style={s.rowTop}>
				<Text variant="mono" tone="secondary" style={s.flex} numberOfLines={1}>
					{metaLine(pact)}
				</Text>
				{done ? (
					<Text variant="mono">{pact.my_state_today === 'saver' ? 'Saver used' : 'You’re in'}</Text>
				) : null}
			</View>
			<View>
				<Text variant="h2" numberOfLines={1}>
					{pact.name}
				</Text>
				<Text variant="h2" tone="tertiary" numberOfLines={2}>
					{pact.habit}
				</Text>
			</View>
			<Chain
				tiles={tiles}
				size="small"
				colors={{ ink: tone.line, track: c.borderSoft }}
				today={today}
			/>
		</PressableScale>
	)
}

const s = StyleSheet.create({
	row: { borderTopWidth: StyleSheet.hairlineWidth * 2, paddingTop: 12, gap: 14 },
	rowTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
	flex: { flex: 1 }
})
