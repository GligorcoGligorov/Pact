import { StyleSheet, View } from 'react-native'
import { Check } from 'lucide-react-native'
import type { MemberState, TodayBoard } from '@app/contract'
import { Text } from '@/components/ui/Text'
import { useColors } from '@/contexts/ThemeContext'
import { getInitials } from '@/lib/utils'

type BoardMember = TodayBoard['members'][number]

/** A stable pick from a small set, so a person keeps their colour on every screen. */
function hueIndex(userId: string, count: number): number {
	let hash = 0
	for (let i = 0; i < userId.length; i++) hash = (hash * 31 + userId.charCodeAt(i)) >>> 0
	return hash % count
}

export function displayName(member: { display_name: string | null }): string {
	return member.display_name?.trim() || 'A member'
}

/**
 * A member as coloured initials. `state` adds today's mark: a green check once they're in (or
 * a saver), dimmed while they still owe the day.
 */
export function Avatar({
	userId,
	name,
	state,
	size = 36
}: {
	userId: string
	name: string
	state?: MemberState
	size?: number
}) {
	const c = useColors()
	const palette = [
		{ bg: c.brandDim, fg: c.brandInk },
		{ bg: c.infoSoft, fg: c.infoText },
		{ bg: c.warningSoft, fg: c.warningText },
		{ bg: c.errorSoft, fg: c.errorText },
		{ bg: c.surface3, fg: c.textPrimary }
	]
	const look = palette[hueIndex(userId, palette.length)]
	const done = state === 'in' || state === 'saver'
	const badge = Math.round(size * 0.42)
	return (
		<View
			style={[
				s.avatar,
				{
					width: size,
					height: size,
					borderRadius: size / 2,
					backgroundColor: look.bg,
					borderColor: c.surface,
					opacity: state === 'out' ? 0.55 : 1
				}
			]}
		>
			<Text style={{ color: look.fg, fontSize: size * 0.36, fontWeight: '700' }}>
				{getInitials(name)}
			</Text>
			{done ? (
				<View
					style={[
						s.badge,
						{
							width: badge,
							height: badge,
							borderRadius: badge / 2,
							backgroundColor: state === 'saver' ? c.info : c.brandFill,
							borderColor: c.surface
						}
					]}
				>
					<Check size={badge * 0.6} color={c.onBrand} strokeWidth={3.5} />
				</View>
			) : null}
		</View>
	)
}

/** The crew, overlapping: everyone held today, those who are in first. */
export function AvatarStack({
	members,
	size = 36,
	max = 5
}: {
	members: BoardMember[]
	size?: number
	max?: number
}) {
	const c = useColors()
	const order = [...members].sort((a, b) => Number(a.state === 'out') - Number(b.state === 'out'))
	const shown = order.slice(0, max)
	const extra = order.length - shown.length
	return (
		<View style={s.stack} accessibilityLabel={crewLine(members, null)}>
			{shown.map((m, i) => (
				<View key={m.user_id} style={{ marginLeft: i === 0 ? 0 : -size * 0.3, zIndex: max - i }}>
					<Avatar userId={m.user_id} name={displayName(m)} state={m.state} size={size} />
				</View>
			))}
			{extra > 0 ? (
				<View
					style={[
						s.avatar,
						{
							width: size,
							height: size,
							borderRadius: size / 2,
							marginLeft: -size * 0.3,
							backgroundColor: c.surface3,
							borderColor: c.surface
						}
					]}
				>
					<Text variant="caption" tone="secondary">
						+{extra}
					</Text>
				</View>
			) : null}
		</View>
	)
}

/** "3 of 4 in · waiting on Marko", or "Everyone's in today". */
export function crewLine(members: BoardMember[], myId: string | null): string {
	const waiting = members.filter((m) => m.state === 'out')
	const inCount = members.length - waiting.length
	if (members.length === 0) return 'Nobody is held today'
	if (waiting.length === 0) return "Everyone's in today"
	const names = waiting.map((m) => (m.user_id === myId ? 'you' : displayName(m).split(' ')[0]))
	const who =
		names.length === 1
			? names[0]
			: names.length === 2
				? `${names[0]} and ${names[1]}`
				: `${names[0]}, ${names[1]} and ${names.length - 2} more`
	return `${inCount} of ${members.length} in · waiting on ${who}`
}

const s = StyleSheet.create({
	avatar: { alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
	badge: {
		position: 'absolute',
		right: -3,
		bottom: -3,
		alignItems: 'center',
		justifyContent: 'center',
		borderWidth: 2
	},
	stack: { flexDirection: 'row', alignItems: 'center' }
})
