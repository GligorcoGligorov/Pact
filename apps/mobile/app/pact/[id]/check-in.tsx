import { useCallback, useEffect, useRef, useState } from 'react'
import { Linking, StyleSheet, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { Image } from 'expo-image'
import type * as ImagePicker from 'expo-image-picker'
import { useQueryClient } from '@tanstack/react-query'
import { CameraOff, CircleCheck, ScanEye, SearchX } from 'lucide-react-native'
import { CHECK_IN_NOTE_MAX, type CheckIn, type Verdict } from '@app/contract'
import { VerdictView } from '@/components/pact/VerdictView'
import { QueryErrorState } from '@/components/QueryError'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader, ScreenTitle } from '@/components/ui/PageHeader'
import { Screen } from '@/components/ui/Screen'
import { CardSkeleton } from '@/components/ui/Skeleton'
import { Text } from '@/components/ui/Text'
import TextInputField from '@/components/ui/TextInputField'
import { useColors } from '@/contexts/ThemeContext'
import { useProfile } from '@/hooks/useProfile'
import { track } from '@/lib/analytics'
import { api, errorMessage } from '@/lib/api'
import { haptic } from '@/lib/haptics'
import {
	checkInFailure,
	pactKeys,
	submitPhotoCheckIn,
	useCheckIn,
	usePact,
	type CheckInFailure
} from '@/lib/pacts'
import { takeProofPhoto, USES_SIMULATOR_LIBRARY_FALLBACK } from '@/lib/proofPhoto'

/** How long the verdict screen waits on the judge before it says "still thinking". */
const JUDGE_WAIT_MS = 12_000

/** A "not now" on the consent screen lasts until the app restarts, so it isn't asked every time. */
let consentDeclinedThisSession = false

type Asset = ImagePicker.ImagePickerAsset
type Phase =
	| { name: 'consent' }
	| { name: 'capture' }
	| { name: 'no_camera' }
	| { name: 'preview'; asset: Asset }
	| { name: 'sending'; asset: Asset }
	| { name: 'failed'; asset: Asset; reason: CheckInFailure; message: string }
	| { name: 'verdict'; asset: Asset; checkIn: CheckIn }

/**
 * R11–R16: consent (first time), the camera, a preview with today's challenge and an optional
 * note, then the upload, a short "judging…" and the verdict with the AI's caption.
 */
export default function CheckInScreen() {
	const { id } = useLocalSearchParams<{ id: string }>()
	const pact = usePact(id)
	const profile = useProfile()
	const queryClient = useQueryClient()
	const [phase, setPhase] = useState<Phase | null>(null)
	const [note, setNote] = useState('')

	const today = pact.data?.today ?? null
	const challenge = today?.challenge ?? null
	const owesToday = !!today && today.me.held && today.me.state === 'out'

	useEffect(() => track('check_in_started', { pact_id: id }), [id])

	// Decide the first step once the pact and the profile are in.
	useEffect(() => {
		if (phase || !owesToday || !profile.data) return
		setPhase(
			profile.data.aiConsent || consentDeclinedThisSession
				? { name: 'capture' }
				: { name: 'consent' }
		)
	}, [phase, owesToday, profile.data])

	const capture = useCallback(async () => {
		const result = await takeProofPhoto()
		if (result.status === 'taken') {
			track('check_in_photo_taken', { pact_id: id })
			setPhase({ name: 'preview', asset: result.asset })
		} else if (result.status === 'no_permission') {
			setPhase({ name: 'no_camera' })
		} else {
			// Cancelled the camera: back to the board. (Capture only runs from the capture step.)
			router.back()
		}
	}, [id])

	useEffect(() => {
		if (phase?.name === 'capture') void capture()
	}, [phase?.name, capture])

	async function answerConsent(granted: boolean) {
		track('ai_consent_answered', { granted })
		if (granted) {
			try {
				await api('updateProfile', { body: { ai_consent: true } })
				await queryClient.invalidateQueries({ queryKey: ['profile'] })
			} catch {
				// The server re-checks consent before judging; without it the verdict is `skipped`.
			}
		} else {
			consentDeclinedThisSession = true
		}
		setPhase({ name: 'capture' })
	}

	async function send(asset: Asset) {
		setPhase({ name: 'sending', asset })
		try {
			const checkIn = await submitPhotoCheckIn(id, asset, note.trim() || null)
			track('check_in_submitted', { pact_id: id, kind: 'photo' })
			void queryClient.invalidateQueries({ queryKey: pactKeys.all })
			setPhase({ name: 'verdict', asset, checkIn })
		} catch (error) {
			const reason = checkInFailure(error)
			track('check_in_failed', { pact_id: id, reason })
			haptic.error()
			setPhase({ name: 'failed', asset, reason, message: errorMessage(error) })
		}
	}

	function close() {
		void queryClient.invalidateQueries({ queryKey: pactKeys.all })
		router.back()
	}

	if (phase?.name === 'verdict') {
		return <Judged pactId={id} asset={phase.asset} initial={phase.checkIn} onDone={close} />
	}

	return (
		<Screen
			header={<PageHeader backIcon="close" onBack={close} />}
			gap={20}
			footer={
				phase?.name === 'preview' || phase?.name === 'sending' || phase?.name === 'failed' ? (
					<PreviewActions
						phase={phase}
						onRetake={() => setPhase({ name: 'capture' })}
						onSend={() => send(phase.asset)}
						onClose={close}
					/>
				) : phase?.name === 'consent' ? (
					<View style={s.footer}>
						<Button
							label="Yes, let the AI judge"
							size="lg"
							fullWidth
							onPress={() => answerConsent(true)}
						/>
						<Button
							label="Not now"
							variant="ghost"
							fullWidth
							onPress={() => answerConsent(false)}
						/>
					</View>
				) : undefined
			}
		>
			{pact.data === undefined && pact.isError ? (
				<QueryErrorState
					error={pact.error}
					title="Couldn't load this pact"
					onRetry={() => pact.refetch()}
				/>
			) : pact.data === undefined || (owesToday && !phase) ? (
				<CardSkeleton height={420} />
			) : pact.data === null ? (
				<EmptyState
					icon={SearchX}
					title="This pact is gone"
					body="It may have been cancelled, or you're no longer in it."
					action={{ label: 'Back home', onPress: () => router.replace('/') }}
				/>
			) : !owesToday ? (
				<EmptyState
					icon={CircleCheck}
					title={
						today?.me.state && today.me.state !== 'out'
							? "You're already in today"
							: 'No check-in today'
					}
					body={
						today?.me.state && today.me.state !== 'out'
							? 'One check-in a day. Come back tomorrow.'
							: today && !today.me.held
								? "You're held from your first full day. Today is on the others."
								: 'This pact has no check-in today.'
					}
					action={{ label: 'Back to the pact', onPress: close }}
				/>
			) : phase?.name === 'consent' ? (
				<>
					<ScreenTitle
						eyebrow="Before your first check-in"
						title="Let the AI judge your photos?"
						subtitle="Your photo goes to an AI model that checks it against the habit and today's challenge, and writes a one-line comment. It only advises: every check-in counts either way."
					/>
					<Card tier="well" padding="spacious">
						<Text variant="bodySm" tone="secondary">
							Photos are stored privately, and only the pact&apos;s members see them. Say no and
							your check-ins simply aren&apos;t judged.
						</Text>
					</Card>
				</>
			) : phase?.name === 'no_camera' ? (
				<EmptyState
					icon={CameraOff}
					title="Camera access is off"
					body="Pact needs the camera for today's photo. Turn it on in Settings, then come back."
					action={{ label: 'Open Settings', onPress: () => Linking.openSettings() }}
				/>
			) : phase?.name === 'capture' ? (
				<EmptyState
					icon={ScanEye}
					title={challenge ?? 'Opening the camera'}
					body={
						USES_SIMULATOR_LIBRARY_FALLBACK
							? 'Simulator: pick a photo from the library (development builds only).'
							: 'Take a photo that shows today’s challenge.'
					}
					action={{ label: 'Open the camera', onPress: () => void capture() }}
				/>
			) : phase && 'asset' in phase ? (
				<>
					<View style={s.photoWrap}>
						<Image source={{ uri: phase.asset.uri }} style={s.photo} contentFit="cover" />
						{challenge ? <ChallengeTag challenge={challenge} /> : null}
					</View>
					<TextInputField
						placeholder="Add a note (optional)"
						value={note}
						onChangeText={setNote}
						maxLength={CHECK_IN_NOTE_MAX}
						editable={phase.name !== 'sending'}
					/>
					{phase.name === 'failed' ? (
						<Text variant="bodySm" tone="error" style={s.center}>
							{phase.message}
						</Text>
					) : null}
				</>
			) : null}
		</Screen>
	)
}

function ChallengeTag({ challenge }: { challenge: string }) {
	const c = useColors()
	return (
		<View style={[s.tag, { backgroundColor: c.hero }]}>
			<Text variant="caption" style={{ color: c.heroTextSecondary }}>
				Today&apos;s challenge
			</Text>
			<Text variant="label" style={{ color: c.heroText }}>
				{challenge}
			</Text>
		</View>
	)
}

function PreviewActions({
	phase,
	onRetake,
	onSend,
	onClose
}: {
	phase: Extract<Phase, { name: 'preview' | 'sending' | 'failed' }>
	onRetake: () => void
	onSend: () => void
	onClose: () => void
}) {
	if (
		phase.name === 'failed' &&
		(phase.reason === 'already_checked_in' || phase.reason === 'not_held')
	) {
		return <Button label="Back to the pact" size="lg" fullWidth onPress={onClose} />
	}
	return (
		<View style={s.row}>
			<Button
				label="Retake"
				variant="outline"
				size="lg"
				disabled={phase.name === 'sending'}
				onPress={onRetake}
				style={s.flex}
			/>
			<Button
				label={phase.name === 'failed' ? 'Try again' : 'Send'}
				size="lg"
				loading={phase.name === 'sending'}
				onPress={onSend}
				style={s.grow}
			/>
		</View>
	)
}

/** The verdict, polled until the judge answers or the wait runs out. */
function Judged({
	pactId,
	asset,
	initial,
	onDone
}: {
	pactId: string
	asset: Asset
	initial: CheckIn
	onDone: () => void
}) {
	const query = useCheckIn(initial.id)
	const checkIn = query.data ?? initial
	const [waitedOut, setWaitedOut] = useState(false)

	useEffect(() => {
		const timer = setTimeout(() => setWaitedOut(true), JUDGE_WAIT_MS)
		return () => clearTimeout(timer)
	}, [])

	const verdict: Verdict | undefined =
		checkIn.verdict !== 'pending' ? checkIn.verdict : waitedOut ? 'pending' : undefined

	const viewed = useRef(false)
	const onViewed = useCallback(
		(shown: Verdict) => {
			if (viewed.current) return
			viewed.current = true
			track('check_in_verdict_viewed', { pact_id: pactId, verdict: shown })
		},
		[pactId]
	)

	return (
		<VerdictView
			photoUri={asset.uri}
			verdict={verdict}
			caption={checkIn.ai_caption}
			reason={checkIn.ai_reason}
			challenge={checkIn.challenge}
			onDone={onDone}
			onViewed={onViewed}
		/>
	)
}

const s = StyleSheet.create({
	footer: { gap: 6 },
	row: { flexDirection: 'row', gap: 10 },
	flex: { flex: 1 },
	grow: { flex: 2 },
	photoWrap: { borderRadius: 24, overflow: 'hidden' },
	photo: { width: '100%', aspectRatio: 3 / 4 },
	tag: {
		position: 'absolute',
		left: 14,
		bottom: 14,
		borderRadius: 16,
		paddingHorizontal: 14,
		paddingVertical: 10,
		gap: 2
	},
	center: { textAlign: 'center' }
})
