import { useEffect, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { router } from 'expo-router'
import {
	PACT_HABIT_MAX,
	PACT_NAME_MAX,
	PACT_STAKE_MAX,
	suggestCrewTheme,
	type CreatePactBody,
	type PactColor,
	type PactEmoji
} from '@app/contract'
import { CrewThemePicker } from '@/components/pact/CrewTheme'
import { Button } from '@/components/ui/Button'
import { PageHeader, ScreenTitle } from '@/components/ui/PageHeader'
import { Screen } from '@/components/ui/Screen'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Text } from '@/components/ui/Text'
import TextInputField from '@/components/ui/TextInputField'
import { track } from '@/lib/analytics'
import { ApiError, errorMessage } from '@/lib/api'
import { haptic } from '@/lib/haptics'
import { addIsoDays, deviceTimeZone, localIsoDate, useCreatePact } from '@/lib/pacts'

type Cadence = CreatePactBody['cadence']
type Length = '7' | '14' | '21' | '30'
type Start = 'today' | 'tomorrow'

const LENGTHS: Length[] = ['7', '14', '21', '30']

/**
 * R1: name, habit, cadence, length, start day and an optional stake. The timezone is the device's.
 * The crew's colour and emoji follow the habit's suggestion until the person picks their own.
 */
export default function NewPactScreen() {
	const create = useCreatePact()
	const [name, setName] = useState('')
	const [habit, setHabit] = useState('')
	const [cadence, setCadence] = useState<Cadence>('daily')
	const [length, setLength] = useState<Length>('14')
	const [start, setStart] = useState<Start>('today')
	const [stake, setStake] = useState('')
	const [showErrors, setShowErrors] = useState(false)
	const [picked, setPicked] = useState<{ color?: PactColor; emoji?: PactEmoji }>({})

	const suggested = suggestCrewTheme(habit)
	const color = picked.color ?? suggested.color
	const emoji = picked.emoji ?? suggested.emoji

	useEffect(() => track('pact_create_started'), [])

	const issues = create.error instanceof ApiError ? (create.error.issues ?? []) : []
	const serverIssue = (path: string) => issues.find((issue) => issue.path === path)?.message
	const nameError = showErrors && !name.trim() ? 'Give your pact a name.' : serverIssue('name')
	const habitError =
		showErrors && !habit.trim() ? 'What does everyone do each day?' : serverIssue('habit')
	const generalError = create.isError && issues.length === 0 ? errorMessage(create.error) : null

	function submit() {
		setShowErrors(true)
		if (!name.trim() || !habit.trim()) {
			haptic.error()
			return
		}
		const today = localIsoDate()
		const body: CreatePactBody = {
			name: name.trim(),
			habit: habit.trim(),
			color,
			emoji,
			cadence,
			days: Number(length),
			start_day: start === 'today' ? today : addIsoDays(today, 1),
			timezone: deviceTimeZone(),
			stake: stake.trim() || null
		}
		create.mutate(body, {
			onSuccess: (pact) => {
				haptic.success()
				track('pact_created', {
					pact_id: pact.id,
					cadence: body.cadence,
					days: body.days,
					has_stake: !!body.stake,
					color,
					emoji,
					theme_source: picked.color || picked.emoji ? 'picked' : 'suggested'
				})
				// Sign the pact first, then bring the crew.
				router.replace({
					pathname: '/pact/[id]/sign',
					params: { id: pact.id, source: 'create', next: `/pact/${pact.id}/invite` }
				})
			},
			onError: () => haptic.error()
		})
	}

	return (
		<Screen
			header={<PageHeader backIcon="close" />}
			gap={22}
			footer={
				<View style={s.footer}>
					{generalError ? (
						<Text variant="bodySm" tone="error" style={s.center}>
							{generalError}
						</Text>
					) : null}
					<Button
						label="Create pact"
						size="lg"
						fullWidth
						loading={create.isPending}
						onPress={submit}
					/>
				</View>
			}
		>
			<ScreenTitle
				variant="display"
				title="New pact"
				subtitle="Pick one habit. Everyone checks in with a photo every day, or the day breaks for all of you."
			/>

			<TextInputField
				label="Pact name"
				placeholder="Morning run crew"
				value={name}
				onChangeText={setName}
				maxLength={PACT_NAME_MAX}
				error={nameError}
				returnKeyType="next"
			/>
			<TextInputField
				label="The habit"
				placeholder="Run for 20 minutes"
				value={habit}
				onChangeText={setHabit}
				maxLength={PACT_HABIT_MAX}
				error={habitError}
				hint="One thing a photo can prove."
			/>

			<Field label="Your crew">
				<CrewThemePicker
					color={color}
					emoji={emoji}
					onColor={(next) => setPicked((p) => ({ ...p, color: next }))}
					onEmoji={(next) => setPicked((p) => ({ ...p, emoji: next }))}
				/>
			</Field>

			<Field label="How often">
				<SegmentedControl
					segments={[
						{ value: 'daily', label: 'Every day' },
						{ value: 'weekdays', label: 'Weekdays' }
					]}
					value={cadence}
					onChange={setCadence}
					accessibilityLabel="How often"
				/>
			</Field>

			<Field label="For how long">
				<SegmentedControl
					segments={LENGTHS.map((days) => ({ value: days, label: `${days} days` }))}
					value={length}
					onChange={setLength}
					accessibilityLabel="Pact length"
				/>
			</Field>

			<Field label="Starting">
				<SegmentedControl
					segments={[
						{ value: 'today', label: 'Today' },
						{ value: 'tomorrow', label: 'Tomorrow' }
					]}
					value={start}
					onChange={setStart}
					accessibilityLabel="Start day"
				/>
			</Field>

			<TextInputField
				label="The stake (optional)"
				placeholder="Loser buys coffee"
				value={stake}
				onChangeText={setStake}
				maxLength={PACT_STAKE_MAX}
				error={serverIssue('stake')}
				hint="Bragging rights or a round of coffee. Never money."
			/>
		</Screen>
	)
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<View style={s.field}>
			<Text variant="label" tone="secondary">
				{label}
			</Text>
			{children}
		</View>
	)
}

const s = StyleSheet.create({
	field: { gap: 10 },
	footer: { gap: 10 },
	center: { textAlign: 'center' }
})
