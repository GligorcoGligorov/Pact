import { useEffect, useRef, useState } from 'react'
import type { TextInput } from 'react-native'
import { router } from 'expo-router'
import { Button } from '@/components/ui/Button'
import { CODE_LENGTH, CodeInput } from '@/components/ui/CodeInput'
import { PageHeader, ScreenTitle } from '@/components/ui/PageHeader'
import { Screen } from '@/components/ui/Screen'

/** R5: type an invite code. A full code opens its preview, where the join happens. */
export default function JoinByCodeScreen() {
	const [code, setCode] = useState('')
	const input = useRef<TextInput>(null)
	const complete = code.length === CODE_LENGTH

	useEffect(() => {
		const timer = setTimeout(() => input.current?.focus(), 350)
		return () => clearTimeout(timer)
	}, [])

	function open(value = code) {
		if (value.length === CODE_LENGTH) {
			router.push({ pathname: '/join/[code]', params: { code: value, source: 'code' } })
		}
	}

	return (
		<Screen
			header={<PageHeader />}
			gap={28}
			footer={
				<Button label="Find pact" size="lg" fullWidth disabled={!complete} onPress={() => open()} />
			}
		>
			<ScreenTitle title="Join a pact" subtitle="Enter the six-character code a friend sent you." />
			<CodeInput
				kind="invite"
				value={code}
				inputRef={input}
				onChange={(next) => {
					setCode(next)
					if (next.length === CODE_LENGTH) open(next)
				}}
			/>
		</Screen>
	)
}
