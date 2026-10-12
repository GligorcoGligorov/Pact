import Link from 'next/link'
import { MissingPage } from '@/components/site/MissingPage'

/** No results here: the pact doesn't exist, was cancelled, or is still going. */
export default function ResultsNotFound() {
	return (
		<MissingPage
			label="Results · not yet"
			title={['No results here.', 'Not yet, anyway.']}
			body="Results show up the day after a pact ends. This one is still going, or it isn’t here anymore."
		>
			<Link
				href="/"
				className="inline-flex h-12 w-fit items-center rounded-pill bg-ink px-6 text-base font-semibold text-ink-inverse transition-[transform,background-color] duration-base hover:bg-ink/90 active:scale-[0.97]"
			>
				Start your own pact
			</Link>
		</MissingPage>
	)
}
