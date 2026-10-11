'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import { INVITE_CODE_ALPHABET, INVITE_CODE_LENGTH } from '@app/contract'
import { cn } from '@/lib/utils'

const NOT_IN_ALPHABET = new RegExp(`[^${INVITE_CODE_ALPHABET}]`, 'g')

/** Six invite characters, then the pact's join page. Used on the landing page and the 404. */
export function CodeForm({ className }: { className?: string }) {
	const router = useRouter()
	const [code, setCode] = useState('')
	const [error, setError] = useState(false)
	const complete = code.length === INVITE_CODE_LENGTH

	return (
		<form
			className={cn('space-y-2', className)}
			onSubmit={(e) => {
				e.preventDefault()
				if (!complete) return setError(true)
				router.push(`/join/${code}`)
			}}
		>
			<div className="flex gap-2">
				<label className="flex-1">
					<span className="sr-only">Invite code</span>
					<input
						value={code}
						onChange={(e) => {
							setError(false)
							setCode(
								e.target.value
									.toUpperCase()
									.replace(NOT_IN_ALPHABET, '')
									.slice(0, INVITE_CODE_LENGTH)
							)
						}}
						autoCapitalize="characters"
						autoComplete="off"
						spellCheck={false}
						placeholder="STREAK"
						className={cn(
							'h-14 w-full rounded-full border bg-surface px-6 font-mono text-xl tracking-[0.3em] text-ink outline-none placeholder:text-ink-disabled',
							error ? 'border-error-text' : 'border-line-soft focus:border-brand-ink'
						)}
					/>
				</label>
				<button
					type="submit"
					aria-label="Find the pact"
					className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-brand-fill text-on-brand transition active:scale-95"
				>
					<ArrowRight className="h-6 w-6" aria-hidden="true" />
				</button>
			</div>
			{error ? (
				<p className="pl-6 text-sm text-error-text">An invite code is six letters and numbers.</p>
			) : null}
		</form>
	)
}
