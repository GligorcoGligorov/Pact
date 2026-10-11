'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Check, Loader2, Smartphone } from 'lucide-react'
import { gaEvent } from '@/lib/analytics/client'
import { JOIN_PAGE_EVENTS } from '@/lib/analytics/events'
import { createBrowserSupabaseClient } from '@/lib/supabase/browser'
import { cn } from '@/lib/utils'

const CODE_LENGTH = 6
const NAME_MAX = 40

type Step =
	| { name: 'checking' }
	| { name: 'details' }
	| { name: 'code'; email: string }
	| { name: 'ready' }
	| { name: 'joined'; fromTomorrow: boolean }
	| { name: 'member' }

/** What went wrong, in words for the person; never a raw error. */
const MESSAGES = {
	email: "That email doesn't look right.",
	name: 'Add your name, so your crew knows it’s you.',
	send: "We couldn't send the code. Try again in a minute.",
	code: "That code didn't work. Check the email, or send a new one.",
	full: 'This pact just filled up: 8 is the most.',
	closed: "This pact can't take anyone new any more.",
	join: "We couldn't join you just now. Try again."
} as const

async function accessToken(): Promise<string | null> {
	const { data } = await createBrowserSupabaseClient().auth.getSession()
	return data.session?.access_token ?? null
}

async function api(path: string, token: string, init: RequestInit = {}) {
	const res = await fetch(path, {
		...init,
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json',
			...init.headers
		}
	})
	const body: unknown = await res.json().catch(() => null)
	return { ok: res.ok, status: res.status, body }
}

function errorCode(body: unknown): string | null {
	if (typeof body !== 'object' || body === null || !('error' in body)) return null
	const error = (body as { error: unknown }).error
	return typeof error === 'object' && error !== null && 'code' in error
		? String((error as { code: unknown }).code)
		: null
}

/**
 * The join itself, in the fewest steps a stranger will take: name and email, the six-digit code
 * from the email, joined. Someone already signed in gets one button; a member gets "Open Pact".
 */
export function JoinPanel({
	code,
	pactId,
	startsInFuture
}: {
	code: string
	pactId: string
	/** In the lobby a joiner is held from the start day; once it runs, from tomorrow (R6). */
	startsInFuture: boolean
}) {
	const [step, setStep] = useState<Step>({ name: 'checking' })
	const [displayName, setDisplayName] = useState('')
	const [email, setEmail] = useState('')
	const [otp, setOtp] = useState('')
	const [busy, setBusy] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const otpRef = useRef<HTMLInputElement>(null)

	// A visitor who is already signed in (they joined another pact here) skips straight to Join.
	useEffect(() => {
		let cancelled = false
		void (async () => {
			try {
				const token = await accessToken()
				if (!token) return !cancelled && setStep({ name: 'details' })
				const res = await api(`/api/app/v1/invites/${code}`, token)
				const isMember =
					res.ok &&
					typeof res.body === 'object' &&
					res.body !== null &&
					(res.body as { invite?: { is_member?: boolean } }).invite?.is_member === true
				if (!cancelled) setStep(isMember ? { name: 'member' } : { name: 'ready' })
			} catch {
				if (!cancelled) setStep({ name: 'details' })
			}
		})()
		return () => {
			cancelled = true
		}
	}, [code])

	useEffect(() => {
		if (step.name === 'code') otpRef.current?.focus()
	}, [step.name])

	async function sendCode(e: React.FormEvent) {
		e.preventDefault()
		const trimmed = email.trim().toLowerCase()
		if (!displayName.trim()) return setError(MESSAGES.name)
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return setError(MESSAGES.email)
		setBusy(true)
		setError(null)
		const { error: sendError } = await createBrowserSupabaseClient().auth.signInWithOtp({
			email: trimmed,
			options: { shouldCreateUser: true }
		})
		setBusy(false)
		if (sendError) return setError(MESSAGES.send)
		gaEvent(JOIN_PAGE_EVENTS.joinCodeRequested)
		setStep({ name: 'code', email: trimmed })
	}

	async function verify(token: string, forEmail: string) {
		setBusy(true)
		setError(null)
		const { data, error: verifyError } = await createBrowserSupabaseClient().auth.verifyOtp({
			email: forEmail,
			token,
			type: 'email'
		})
		const access = data.session?.access_token
		if (verifyError || !access) {
			setBusy(false)
			setOtp('')
			return setError(MESSAGES.code)
		}
		gaEvent(JOIN_PAGE_EVENTS.joinSignedIn)
		// The signup, the region and last-seen, as the app reports them (user_signed_up is Tier 1).
		void api('/api/lifecycle/session', access, { method: 'POST' })
		if (displayName.trim()) {
			await api('/api/app/v1/profile', access, {
				method: 'PATCH',
				body: JSON.stringify({ display_name: displayName.trim().slice(0, NAME_MAX) })
			})
		}
		await join(access)
	}

	async function join(existing?: string) {
		setBusy(true)
		setError(null)
		const token = existing ?? (await accessToken())
		if (!token) {
			setBusy(false)
			return setStep({ name: 'details' })
		}
		const res = await api(`/api/app/v1/invites/${code}/join`, token, {
			method: 'POST',
			body: JSON.stringify({ source: 'web' })
		})
		setBusy(false)
		if (res.ok) return setStep({ name: 'joined', fromTomorrow: !startsInFuture })
		const reason = errorCode(res.body)
		setError(
			reason === 'pact_full'
				? MESSAGES.full
				: reason === 'pact_closed'
					? MESSAGES.closed
					: MESSAGES.join
		)
	}

	const openApp = (
		<a
			href={`pact://pact/${pactId}`}
			onClick={() => gaEvent(JOIN_PAGE_EVENTS.joinOpenAppClicked, { target: 'app' })}
			className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-brand-fill px-6 text-base font-semibold text-on-brand shadow-cta transition active:scale-[0.98]"
		>
			<Smartphone className="h-5 w-5" aria-hidden="true" />
			Open Pact
		</a>
	)

	return (
		<section aria-live="polite" className="border-t-2 border-ink pt-4">
			{step.name === 'checking' ? (
				<div className="flex h-28 items-center justify-center text-ink-tertiary">
					<Loader2 className="h-6 w-6 animate-spin" aria-label="Loading" />
				</div>
			) : step.name === 'joined' || step.name === 'member' ? (
				<div className="flex flex-col items-center gap-4 text-center">
					<span className="pop grid h-14 w-14 place-items-center rounded-full bg-brand-fill">
						<Check className="h-7 w-7 text-on-brand" strokeWidth={3} aria-hidden="true" />
					</span>
					<div className="space-y-1">
						<p className="font-display text-2xl font-bold text-ink">
							{step.name === 'joined' ? 'You’re in.' : 'You’re already in.'}
						</p>
						<p className="text-sm text-ink-secondary">
							{step.name === 'joined' && step.fromTomorrow
								? 'Your first check-in is tomorrow. Today is on the others.'
								: 'Check in with a photo every day, in the app.'}
						</p>
					</div>
					{openApp}
				</div>
			) : step.name === 'ready' ? (
				<div className="space-y-3">
					<button
						type="button"
						onClick={() => join()}
						disabled={busy}
						className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-brand-fill px-6 text-base font-semibold text-on-brand shadow-cta transition active:scale-[0.98] disabled:opacity-70"
					>
						{busy ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : null}
						Join the pact
					</button>
					{error ? <p className="text-center text-sm text-error-text">{error}</p> : null}
				</div>
			) : step.name === 'details' ? (
				<form onSubmit={sendCode} className="space-y-3" noValidate>
					<p className="font-display text-xl font-bold text-ink">Join in a minute</p>
					<label className="block">
						<span className="sr-only">Your name</span>
						<input
							value={displayName}
							onChange={(e) => setDisplayName(e.target.value)}
							maxLength={NAME_MAX}
							autoComplete="given-name"
							placeholder="Your first name"
							className="w-full rounded-input border border-line-soft bg-well px-4 py-3.5 text-base text-ink outline-none placeholder:text-ink-tertiary focus:border-brand-ink"
						/>
					</label>
					<label className="block">
						<span className="sr-only">Email</span>
						<input
							type="email"
							inputMode="email"
							autoComplete="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							placeholder="you@example.com"
							className="w-full rounded-input border border-line-soft bg-well px-4 py-3.5 text-base text-ink outline-none placeholder:text-ink-tertiary focus:border-brand-ink"
						/>
					</label>
					<button
						type="submit"
						disabled={busy}
						className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-brand-fill px-6 text-base font-semibold text-on-brand shadow-cta transition active:scale-[0.98] disabled:opacity-70"
					>
						{busy ? (
							<Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
						) : (
							<>
								Email me a code <ArrowRight className="h-5 w-5" aria-hidden="true" />
							</>
						)}
					</button>
					{error ? <p className="text-center text-sm text-error-text">{error}</p> : null}
					<p className="text-center text-xs text-ink-tertiary">
						No password. We email you a six-digit code.
					</p>
				</form>
			) : (
				<div className="space-y-3">
					<p className="font-display text-xl font-bold text-ink">Check your email</p>
					<p className="text-sm text-ink-secondary">
						We sent a six-digit code to <span className="font-semibold text-ink">{step.email}</span>
						.
					</p>
					<input
						ref={otpRef}
						value={otp}
						onChange={(e) => {
							const next = e.target.value.replace(/\D/g, '').slice(0, CODE_LENGTH)
							setOtp(next)
							if (next.length === CODE_LENGTH && !busy) void verify(next, step.email)
						}}
						inputMode="numeric"
						autoComplete="one-time-code"
						aria-label="Six-digit code"
						placeholder="••••••"
						className={cn(
							'w-full rounded-input border bg-well px-4 py-4 text-center font-sans text-3xl tracking-[0.5em] text-ink outline-none placeholder:text-ink-disabled',
							error ? 'border-error-text' : 'border-line-soft focus:border-brand-ink'
						)}
					/>
					{busy ? (
						<p className="flex items-center justify-center gap-2 text-sm text-ink-secondary">
							<Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Joining you…
						</p>
					) : null}
					{error ? <p className="text-center text-sm text-error-text">{error}</p> : null}
					<button
						type="button"
						onClick={() => {
							setOtp('')
							setError(null)
							setStep({ name: 'details' })
						}}
						className="w-full text-center text-sm font-medium text-brand-ink underline-offset-4 hover:underline"
					>
						Use another email, or send a new code
					</button>
				</div>
			)}
		</section>
	)
}
