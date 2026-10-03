import { StyleSheet, View } from 'react-native'
import { Text } from '@/components/ui/Text'
import { Avatar, displayName } from './Avatars'

type Member = { user_id: string; display_name: string | null }

/** The crew by face and first name, wrapping: who you'd be making the pact with. */
export function CrewGrid({ members, myId }: { members: Member[]; myId: string | null }) {
	return (
		<View style={s.grid}>
			{members.map((m) => {
				const name = displayName(m)
				return (
					<View key={m.user_id} style={s.person}>
						<Avatar userId={m.user_id} name={name} size={48} />
						<Text variant="caption" tone="secondary" numberOfLines={1} style={s.name}>
							{m.user_id === myId ? 'You' : name.split(' ')[0]}
						</Text>
					</View>
				)
			})}
		</View>
	)
}

const s = StyleSheet.create({
	grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
	person: { width: 56, alignItems: 'center', gap: 6 },
	name: { textAlign: 'center' }
})
