import { StyleSheet, View } from 'react-native'
import { Check, X } from 'lucide-react-native'
import type { DayStatus } from '@app/contract'
import { Text } from '@/components/ui/Text'
import { useColors } from '@/contexts/ThemeContext'
import { addIsoDays } from '@/lib/pacts'

type Tile = { day: string; status: DayStatus | 'future' }

const WEEKEND = new Set([0, 6])

function weekdayOf(iso: string): number {
	return new Date(`${iso}T12:00:00Z`).getUTCDay()
}

/** The chain plus the pact days still to come, through the end day (all of them in the lobby). */
export function chainTiles(
	chain: { day: string; status: DayStatus }[],
	startDay: string,
	endDay: string,
	cadence: 'daily' | 'weekdays'
): Tile[] {
	const tiles: Tile[] = [...chain]
	let day = chain.length > 0 ? addIsoDays(chain[chain.length - 1].day, 1) : startDay
	while (day <= endDay) {
		if (cadence === 'daily' || !WEEKEND.has(weekdayOf(day))) tiles.push({ day, status: 'future' })
		day = addIsoDays(day, 1)
	}
	return tiles
}

/**
 * R19's chain, as the brief's streak-widget row: one tile per pact day, kept (check), broken
 * (cross), today ringed, and the days still to come dim.
 */
export function Chain({ tiles }: { tiles: Tile[] }) {
	const c = useColors()
	return (
		<View style={s.wrap}>
			{tiles.map(({ day, status }) => {
				const look = {
					kept: { bg: c.brandFill, border: c.brandFill, fg: c.onBrand },
					broken: { bg: c.errorSoft, border: c.errorBorder, fg: c.errorText },
					open: { bg: c.surface, border: c.textPrimary, fg: c.textPrimary },
					future: { bg: c.well, border: 'transparent', fg: c.textDisabled }
				}[status]
				return (
					<View
						key={day}
						accessibilityLabel={`${day}: ${status === 'open' ? 'today' : status}`}
						style={[
							s.tile,
							{
								backgroundColor: look.bg,
								borderColor: look.border,
								borderWidth: status === 'open' ? 2 : StyleSheet.hairlineWidth
							}
						]}
					>
						{status === 'kept' ? (
							<Check size={16} color={look.fg} strokeWidth={3} />
						) : status === 'broken' ? (
							<X size={16} color={look.fg} strokeWidth={3} />
						) : (
							<Text variant="caption" tabular style={[s.date, { color: look.fg }]}>
								{Number(day.slice(8))}
							</Text>
						)}
					</View>
				)
			})}
		</View>
	)
}

const s = StyleSheet.create({
	wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
	tile: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
	date: { fontWeight: '600' }
})
