import { CodeForm } from '@/components/join/CodeForm'
import { MissingPage } from '@/components/site/MissingPage'

/** An invite code that doesn't exist: say so kindly, and let them try another. */
export default function JoinNotFound() {
	return (
		<MissingPage
			label="Invite · not found"
			title={['No pact with that code.', 'Typo, maybe?']}
			body="Check it with whoever sent it, or try it again here."
		>
			<CodeForm />
		</MissingPage>
	)
}
