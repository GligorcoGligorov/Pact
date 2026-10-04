import 'server-only'
import { aiUsageStore } from '@/server/db/ai-usage'
import { log } from '@/server/lib/logger'
import { GROQ_MODEL } from './groq'
import { postJson, ProviderError } from './providers'

// R20's nudge, in words a friend would use: one short, playful line about the habit, written by
// the judge's fast model (Groq). Advisory and safe: kind pressure from friends, never shaming;
// never about the person's looks, body or weight. When the model is slow, fails or writes a line
// that breaks those rules, the nudge goes with a fixed friendly line instead. Every call writes
// one ai_usage row.

export const NUDGE_FEATURE = 'nudge'
/** A nudge is short or it isn't read: about twelve words, with a little give. */
export const NUDGE_MAX_WORDS = 14
const NUDGE_MAX_CHARS = 100
/** The sender is waiting on the button, so the model gets a short leash. */
const NUDGE_TIMEOUT_MS = 4_000
const ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions'
const TEMPERATURE = 0.9
const MAX_COMPLETION_TOKENS = 120

/**
 * Words a nudge never uses: anything about bodies, weight or worth, and insults. A model line
 * with one of them is thrown away for the fixed one.
 */
const NEVER =
	/\b(fat|fatty|weight|weigh|kilos?|pounds?|thin|skinny|chubby|belly|body|bodies|diet|calories|ugly|looks?|lazy|loser|failure|pathetic|stupid|useless|disappointing|shame|ashamed|guilt)\b/i

const SYSTEM = `You write one nudge that a friend sends another friend in a habit app, where a small crew keeps each other to one daily habit.
Rules:
- At most 12 words. One sentence.
- Warm, playful, a little cheeky. Friendly pressure, never shaming or guilt.
- About the habit or today's challenge, never about the person's looks, body, weight, health or worth. No insults.
- Start with the word NAME, exactly as written: it stands for the friend's first name. No emoji, no hashtags, no quotes.
Examples: "NAME, the running shoes are asking about you." "NAME, your book misses you. Five pages?"
Answer only as JSON: {"line": "..."}`

const firstName = (name: string) => name.trim().split(/\s+/)[0] || 'Hey'

/** A fenced value: the habit and names are people's own text, kept as data. */
const fence = (value: string) => value.replace(/[<>]/g, '').slice(0, 80)

/** The fixed line: always kind, always about the crew. */
export function fallbackNudge(toName: string): string {
	return `${firstName(toName)}, your crew is saving you a spot today.`
}

/** The `line` of a JSON answer, or the answer's first line when the model wrote plain text. */
function lineOf(raw: string): string {
	const json = raw.match(/\{[\s\S]*\}/)?.[0]
	if (json) {
		try {
			const parsed: unknown = JSON.parse(json)
			if (typeof parsed === 'object' && parsed !== null && 'line' in parsed) {
				return String((parsed as { line: unknown }).line)
			}
		} catch {
			// Not JSON after all: fall through to the plain line.
		}
	}
	return raw.split('\n')[0] ?? ''
}

/**
 * The stand-in the model writes for the friend's name. The real name never leaves the server: a
 * person's name is personal data, and the AI consent (R16) covers proof photos, not this.
 */
export const NAME_TOKEN = 'NAME'

/** The model's line, cleaned and with the friend's first name in, or null when it breaks a rule. */
export function acceptableLine(raw: string, toName: string): string | null {
	const line = lineOf(raw)
	const cleaned = line.replace(/["“”]/g, '').replace(/\s+/g, ' ').trim()
	if (!cleaned || cleaned.length > NUDGE_MAX_CHARS) return null
	if (cleaned.split(' ').length > NUDGE_MAX_WORDS) return null
	if (NEVER.test(cleaned)) return null
	if (!cleaned.includes(NAME_TOKEN)) return null
	return cleaned.replaceAll(NAME_TOKEN, firstName(toName))
}

type GroqAnswer = {
	choices?: { message?: { content?: string | null } }[]
	usage?: { prompt_tokens?: number; completion_tokens?: number }
}

/**
 * The nudge's text: the model's line when it is fast and follows the rules, else the fixed one.
 * Never throws: a nudge always goes out.
 */
export async function writeNudge(input: {
	fromUserId: string
	toName: string
	habit: string
	challenge: string | null
}): Promise<{ text: string; source: 'ai' | 'fallback' }> {
	const fallback = { text: fallbackNudge(input.toName), source: 'fallback' as const }
	const apiKey = process.env.GROQ_API_KEY?.trim()
	if (!apiKey) return fallback

	const started = Date.now()
	let line: string | null = null
	let errorCode: string | null = null
	let tokens: { inputTokens: number | null; outputTokens: number | null } = {
		inputTokens: null,
		outputTokens: null
	}
	try {
		const answer = (await postJson(
			ENDPOINT,
			{ authorization: `Bearer ${apiKey}` },
			{
				model: GROQ_MODEL,
				messages: [
					{ role: 'system', content: SYSTEM },
					{
						role: 'user',
						content: `<habit>${fence(input.habit)}</habit>${
							input.challenge ? `\n<challenge>${fence(input.challenge)}</challenge>` : ''
						}`
					}
				],
				// No JSON mode: Groq answers a 400 when the model's JSON doesn't validate, which
				// lost good lines. lineOf() reads either shape.
				temperature: TEMPERATURE,
				max_completion_tokens: MAX_COMPLETION_TOKENS
			},
			AbortSignal.timeout(NUDGE_TIMEOUT_MS)
		)) as GroqAnswer
		tokens = {
			inputTokens: answer.usage?.prompt_tokens ?? null,
			outputTokens: answer.usage?.completion_tokens ?? null
		}
		line = acceptableLine(answer.choices?.[0]?.message?.content ?? '', input.toName)
		if (!line) errorCode = 'rejected_line'
	} catch (error) {
		errorCode = error instanceof ProviderError ? error.code : 'unexpected'
	}

	try {
		await aiUsageStore.record({
			userId: input.fromUserId,
			feature: NUDGE_FEATURE,
			provider: 'groq',
			model: GROQ_MODEL,
			outcome: line ? 'ok' : 'error',
			errorCode,
			...tokens,
			latencyMs: Date.now() - started
		})
	} catch (recordError) {
		log.error('Recording a nudge’s ai_usage failed', { err: recordError })
	}
	return line ? { text: line, source: 'ai' } : fallback
}
