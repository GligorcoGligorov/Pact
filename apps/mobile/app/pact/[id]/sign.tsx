import { useCallback, useEffect, useRef, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import Animated, { Keyframe } from 'react-native-reanimated'
import { pledgeLine } from '@app/contract'
import { CardSkeleton } from '@/components/ui/Skeleton'
import { Signature } from '@/components/sign/Signature'
import { SignaturePad } from '@/components/sign/SignaturePad'
import { QueryErrorState } from '@/components/QueryError'
import { Button } from '@/components/ui/Button'
import { CornerMarks } from '@/components/ui/CornerMarks'
import { PageHeader } from '@/components/ui/PageHeader'
import { Screen } from '@/components/ui/Screen'
import { Text } from '@/components/ui/Text'
import { useColors } from '@/contexts/ThemeContext'
import { useToast } from '@/contexts/ToastContext'
import { track } from '@/lib/analytics'
import { errorCode, errorMessage } from '@/lib/api'
import { crewTone } from '@/lib/crew'
import { haptic } from '@/lib/haptics'
import { useReducedMotion } from '@/lib/motion'
import { pactDayCount, useMyUserId, usePact, useSignPact } from '@/lib/pacts'
import { CELEBRATION } from '@/lib/streaks'

/** The stamp lands: big and tilted, then down onto the card, inside the celebration budget. */
const stamp = new Keyframe({
	0: { opacity: 0, transform: [{ scale: 1.6 }, { rotate: '-14deg' }] },
	100: { opacity: 1, transform: [{ scale: 1 }, { rotate: '-8deg' }] }
}).duration(CELEBRATION.landMs)

/** After the stamp, a beat to read it, then on to the next screen. */
const ONWARD_MS = 900

type Source = 'create' | 'join'

/**
 * The signed pact: on create and on join, each member signs the pact's card with a finger. The
 * card says it in their own voice ("I, Ana, will run for 20 minutes every day for 21 days. If I
 * break it, I buy the coffees."), shows whoever has signed already, and stamps SIGNED when they
 * do. Then on to `next`: the invite screen after create, the board after join.
 */
export default function SignPactScreen() {
	const c = useColors()
	const {
		id,
		source = 'join',
		next
	} = useLocalSearchParams<{
		id: string
		source?: Source
		next?: string
	}>()
	const pact = usePact(id)
	const { data: myId } = useMyUserId()
	const sign = useSignPact(id)
	const { showToast } = useToast()
	const reduced = useReducedMotion()
	const [path, setPath] = useState<string | null>(null)
	const [clearKey, setClearKey] = useState(0)
	const [signed, setSigned] = useState(false)
	const viewed = useRef(false)
	const onward = useCallback(() => router.replace((next as never) ?? `/pact/${id}`), [id, next])

	const detail = pact.data
	const me = detail?.members.find((m) => m.user_id === myId) ?? null
	const already = !!me?.signature

	useEffect(() => {
		if (!detail || viewed.current) return
		viewed.current = true
		track('pact_sign_viewed', { pact_id: id, source })
	}, [detail, id, source])

	function submit() {
		if (!path) return
		sign.mutate(path, {
			onSuccess: () => {
				haptic.success()
				track('pact_signed', { pact_id: id, source })
				setSigned(true)
				setTimeout(onward, reduced ? 300 : ONWARD_MS)
			},
			onError: (error) => {
				if (errorCode(error) === 'already_signed') return onward()
				haptic.error()
				showToast(errorMessage(error), 'error')
			}
		})
	}

	const tone = detail ? crewTone(c, detail.pact.color) : null
	const others = (detail?.members ?? []).filter(
		(m) => m.user_id !== myId && m.signature && !m.left_day
	)

	return (
		<Screen
			ground={tone?.deep}
			header={<PageHeader backIcon="close" onBack={onward} />}
			gap={24}
			footer={
				detail && !already && !signed ? (
					<View style={s.actions}>
						<Button
							label="Clear"
							variant="outline"
							size="lg"
							disabled={!path}
							onPress={() => {
								setPath(null)
								setClearKey((k) => k + 1)
							}}
						/>
						<View style={s.flex}>
							<Button
								label="Sign the pact"
								size="lg"
								fullWidth
								haptic="snap"
								disabled={!path}
								loading={sign.isPending}
								onPress={submit}
							/>
						</View>
					</View>
				) : detail && already ? (
					<Button label="Continue" size="lg" fullWidth onPress={onward} />
				) : undefined
			}
		>
			{detail === undefined && pact.isError ? (
				<QueryErrorState
					error={pact.error}
					title="Couldn't load the pact"
					onRetry={() => pact.refetch()}
				/>
			) : !detail || !tone ? (
				<CardSkeleton height={420} />
			) : (
				<>
					<View>
						<Text variant="display">Make it official.</Text>
						<Text variant="display" tone="tertiary">
							Sign the pact.
						</Text>
					</View>

					<CornerMarks>
						<View style={[s.card, { backgroundColor: c.inkOnArt }]}>
							<View style={s.cardTop}>
								<Text variant="mono" style={{ color: c.hero }}>
									Pact · {detail.pact.invite_code}
								</Text>
								<Text variant="mono" style={{ color: c.hero }}>
									{detail.pact.name}
								</Text>
							</View>
							<Text variant="h2" style={{ color: c.hero }}>
								{pledgeLine(
									(me?.display_name ?? 'me').split(' ')[0] ?? 'me',
									detail.pact.habit,
									detail.pact.cadence,
									pactDayCount(detail.pact.start_day, detail.pact.end_day, detail.pact.cadence),
									detail.pact.stake
								)}
							</Text>

							<View style={[s.line, { borderBottomColor: c.hero }]}>
								<Text variant="mono" style={[s.x, { color: c.hero }]}>
									×
								</Text>
								{already && me?.signature ? (
									<Signature path={me.signature} ink={c.hero} width={260} />
								) : (
									<SignaturePad ink={c.hero} onChange={setPath} clearKey={clearKey} />
								)}
								{signed ? (
									<Animated.View
										entering={reduced ? undefined : stamp}
										style={[s.stamp, { borderColor: tone.fill }]}
										pointerEvents="none"
									>
										<Text variant="h2" style={{ color: tone.fill }}>
											Signed
										</Text>
									</Animated.View>
								) : null}
							</View>
							<Text variant="mono" style={{ color: c.hero, opacity: 0.6 }}>
								{(me?.display_name ?? 'You').split(' ')[0]} · signature
							</Text>

							{others.length > 0 ? (
								<View style={[s.others, { borderTopColor: c.hero }]}>
									{others.map((m) => (
										<View key={m.user_id} style={s.other}>
											<Signature path={m.signature!} ink={c.hero} width={96} />
											<Text variant="mono" style={{ color: c.hero, opacity: 0.6 }}>
												{(m.display_name ?? 'A member').split(' ')[0]}
											</Text>
										</View>
									))}
								</View>
							) : null}
						</View>
					</CornerMarks>
				</>
			)}
		</Screen>
	)
}

const s = StyleSheet.create({
	actions: { flexDirection: 'row', gap: 10 },
	flex: { flex: 1 },
	card: { borderRadius: 6, padding: 20, gap: 20 },
	cardTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
	line: { borderBottomWidth: StyleSheet.hairlineWidth * 2, position: 'relative' },
	x: { position: 'absolute', left: 0, bottom: 6 },
	stamp: {
		position: 'absolute',
		right: 8,
		top: 16,
		borderWidth: 3,
		borderRadius: 6,
		paddingHorizontal: 14,
		paddingVertical: 4
	},
	others: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 16,
		paddingTop: 16,
		borderTopWidth: StyleSheet.hairlineWidth
	},
	other: { gap: 4 }
})
