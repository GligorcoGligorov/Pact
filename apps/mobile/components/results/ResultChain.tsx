import { StyleSheet, View } from 'react-native'
import { Check, X } from 'lucide-react-native'
import type { PactResult } from '@app/contract'
import { Pop } from '@/components/motion/Pop'
import { useColors } from '@/contexts/ThemeContext'
import { crewTone } from '@/lib/crew'
import { REVEAL } from '@/lib/reveal'

/**
 * The crew's final chain, day by day, in the crew's colour: kept days filled, broken days left
 * hollow. The tiles pop in left to right and the whole run lands inside REVEAL.chainMs, however
 * long the pact was. With Reduce Motion they simply appear (Pop's spring respects it).
 */
export function ResultChain({ chain, color }: { chain: PactResult['chain']; color: string }) {
	const c = useColors()
	const tone = crewTone(c, color)
	const step = Math.min(REVEAL.chainStepMs, REVEAL.chainMs / Math.max(chain.length, 1))
	return (
		<View
			style={s.wrap}
			accessible
			accessibilityLabel={`${chain.filter((d) => d.status === 'kept').length} of ${chain.length} days kept`}
		>
			{chain.map(({ day, status }, i) => (
				<Pop key={day} delay={Math.round(i * step)}>
					<View
						style={[
							s.tile,
							status === 'kept'
								? { backgroundColor: tone.fill, borderColor: tone.fill }
								: { backgroundColor: 'transparent', borderColor: tone.track }
						]}
					>
						{status === 'kept' ? (
							<Check size={16} color={tone.onFill} strokeWidth={3} />
						) : (
							<X size={14} color={c.textTertiary} strokeWidth={2.6} />
						)}
					</View>
				</Pop>
			))}
		</View>
	)
}

const s = StyleSheet.create({
	wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
	tile: {
		width: 34,
		height: 34,
		borderRadius: 11,
		borderWidth: 2,
		alignItems: 'center',
		justifyContent: 'center'
	}
})
