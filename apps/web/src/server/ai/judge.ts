import { PACT_EVENTS } from '@/lib/analytics/events'
import { recordUserEvent } from '@/lib/analytics/record'
import { aiUsageStore, type AiUsageStore } from '@/server/db/ai-usage'
import { pactStore, type PactStore, type Verdict } from '@/server/db/pacts'
import { profileStore } from '@/server/db/profiles'
import { log } from '@/server/lib/logger'
import { downloadProof } from '@/server/storage/proofs'
import { JUDGE_SYSTEM_PROMPT, judgeUserPrompt, parseJudgeAnswer } from './prompt'
import { configuredProviders, ProviderError, type VisionProvider } from './providers'

// The AI judge (R13–R16): one check-in's photo → a verdict, a reason and a caption.
//
// Advisory only. It runs after the check-in has been answered (the route calls it in
// `after()`), it never throws, and whatever it decides the check-in still counts (R15). The
// photo comes from storage, never from a request (R13), and only for a person who agreed to
// it (R16), checked again here in case they withdrew in between.
//
// Providers are tried in order (Gemini, then Groq): a call that fails, times out or answers
// something that isn't the JSON asked for moves on to the next. Every call writes one
// `ai_usage` row. Only a pending check-in takes a verdict, once (pactStore.setVerdict).

export const JUDGE_FEATURE = 'check_in_judge'

// Long enough for a vision model on a free tier; short enough that a stuck call doesn't hold
// the check-in at `pending` for the whole group.
const PROVIDER_TIMEOUT_MS = 20_000

export type JudgeDeps = {
	store: Pick<PactStore, 'forJudging' | 'setVerdict'>
	usage: Pick<AiUsageStore, 'record'>
	providers: () => VisionProvider[]
	hasConsent: (userId: string) => Promise<boolean>
	download: typeof downloadProof
	recordJudged: (userId: string, pactId: string, verdict: Verdict['verdict']) => Promise<void>
	now: () => Date
}

const defaults: JudgeDeps = {
	store: pactStore,
	usage: aiUsageStore,
	providers: configuredProviders,
	hasConsent: (userId) => profileStore.hasAiConsent(userId),
	download: downloadProof,
	recordJudged: (userId, pactId, verdict) =>
		recordUserEvent(userId, PACT_EVENTS.checkInJudged, {
			metadata: { pact_id: pactId, verdict },
			dedupeDaily: false
		}),
	now: () => new Date()
}

const NO_TEXT = { aiReason: null, aiCaption: null }

/**
 * Judges one check-in and stores the verdict. Returns the verdict it stored, or null when
 * there was nothing to judge (no such check-in, or it already has a verdict). Never throws.
 */
export async function judgeCheckIn(
	checkInId: string,
	deps: JudgeDeps = defaults
): Promise<Verdict['verdict'] | null> {
	try {
		const row = await deps.store.forJudging(checkInId)
		if (!row || row.verdict !== 'pending') return null

		const verdict = await decide(row, deps)
		const stored = await deps.store.setVerdict(checkInId, verdict, deps.now())
		if (!stored) return null
		await deps.recordJudged(row.userId, row.pactId, verdict.verdict)
		return verdict.verdict
	} catch (err) {
		log.error('the judge failed before a verdict', { source: 'ai/judge', checkInId, err })
		// Best effort: a check-in left `pending` would spin in the app forever.
		try {
			await deps.store.setVerdict(checkInId, { verdict: 'error', ...NO_TEXT }, deps.now())
		} catch {
			// Logged above; nothing else to do.
		}
		return 'error'
	}
}

type JudgeRow = NonNullable<Awaited<ReturnType<PactStore['forJudging']>>>

async function decide(row: JudgeRow, deps: JudgeDeps): Promise<Verdict> {
	if (row.kind !== 'photo' || !row.photoPath || !row.challenge) {
		return { verdict: 'skipped', ...NO_TEXT }
	}
	if (!(await deps.hasConsent(row.userId))) return { verdict: 'skipped', ...NO_TEXT }

	const providers = deps.providers()
	if (providers.length === 0) return { verdict: 'not_configured', ...NO_TEXT }

	const image = await deps.download(row.photoPath)
	const request = {
		system: JUDGE_SYSTEM_PROMPT,
		user: judgeUserPrompt({ habit: row.member.pact.habit, challenge: row.challenge }),
		image
	}

	for (const provider of providers) {
		const started = Date.now()
		const usage = { provider: provider.name, model: provider.model }
		try {
			const result = await provider.complete({
				...request,
				signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS)
			})
			const answer = parseJudgeAnswer(result.text)
			await recordUsage(deps, row, {
				...usage,
				outcome: answer ? 'ok' : 'error',
				errorCode: answer ? null : 'bad_answer',
				inputTokens: result.inputTokens,
				outputTokens: result.outputTokens,
				latencyMs: Date.now() - started
			})
			if (answer) {
				return { verdict: answer.verdict, aiReason: answer.reason, aiCaption: answer.caption }
			}
		} catch (err) {
			const code = err instanceof ProviderError ? err.code : 'unexpected'
			log.warn('an AI provider failed; trying the next', {
				source: 'ai/judge',
				provider: provider.name,
				code,
				err
			})
			await recordUsage(deps, row, {
				...usage,
				outcome: 'error',
				errorCode: code,
				latencyMs: Date.now() - started
			})
		}
	}
	return { verdict: 'error', ...NO_TEXT }
}

// A usage row that fails to write costs the bookkeeping, not the verdict.
async function recordUsage(
	deps: JudgeDeps,
	row: JudgeRow,
	usage: Omit<Parameters<AiUsageStore['record']>[0], 'userId' | 'feature' | 'checkInId'>
) {
	try {
		await deps.usage.record({
			...usage,
			userId: row.userId,
			feature: JUDGE_FEATURE,
			checkInId: row.id
		})
	} catch (err) {
		log.error('ai_usage row not written', { source: 'ai/judge', err })
	}
}
