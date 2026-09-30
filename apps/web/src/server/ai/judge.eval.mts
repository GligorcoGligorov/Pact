// The judge's eval: labelled test photos through the real prompt and providers, and how often
// the verdict agrees with the label. Run by hand, never in `npm test` (it calls real APIs):
//
//   npm run eval:judge --workspace=@app/web                      # Gemini, falling back to Groq
//   npm run eval:judge --workspace=@app/web -- --provider=groq   # one provider alone
//
// Photos live in apps/web/eval-photos/, which is gitignored: every folder in it with a
// labels.json is read. Only test photos go in there, never a real check-in. Each label:
//
//   { "file": "run.jpg", "habit": "Run 3 km before 9", "challenge": "Hold up three fingers",
//     "expected": "pass" | "suspicious", "why": "what the photo shows" }
//
// The synthetic fakes come from `swift apps/web/scripts/eval-synthetic-photos.swift`. Nothing
// is written to the database: these calls are not app usage. The plan's bar is 16 of 20.
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { extname, join } from 'node:path'
import { JUDGE_SYSTEM_PROMPT, judgeUserPrompt, parseJudgeAnswer } from './prompt'
import { ProviderError, type VisionProvider } from './providers'
import { configuredProviders } from './registry'

type Label = { file: string; habit: string; challenge: string; expected: string; why: string }

const ROOT = join(import.meta.dirname, '../../../eval-photos')
const TIMEOUT_MS = 30_000
// Free tiers count requests per minute; a pause keeps a 20-photo run inside them.
const PAUSE_MS = 1_500
const MIME: Record<string, string> = {
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.png': 'image/png',
	'.webp': 'image/webp',
	'.heic': 'image/heic'
}

const only = process.argv.find((arg) => arg.startsWith('--provider='))?.split('=')[1]
const providers = configuredProviders().filter((p) => !only || p.name === only)
if (providers.length === 0) {
	console.error(
		only
			? `No ${only} key set (apps/web/.env.local).`
			: 'Neither GEMINI_API_KEY nor GROQ_API_KEY is set (apps/web/.env.local).'
	)
	process.exit(1)
}
if (!existsSync(ROOT)) {
	console.error(`No eval photos: ${ROOT} doesn't exist.`)
	process.exit(1)
}

const sets = readdirSync(ROOT, { withFileTypes: true })
	.filter((entry) => entry.isDirectory() && existsSync(join(ROOT, entry.name, 'labels.json')))
	.map((entry) => entry.name)
	.sort()

async function judge(label: Label, folder: string) {
	const bytes = readFileSync(join(folder, label.file))
	const mimeType = MIME[extname(label.file).toLowerCase()] ?? 'image/jpeg'
	for (const provider of providers) {
		const started = Date.now()
		try {
			const result = await provider.complete({
				system: JUDGE_SYSTEM_PROMPT,
				user: judgeUserPrompt({ habit: label.habit, challenge: label.challenge }),
				image: { bytes, mimeType },
				signal: AbortSignal.timeout(TIMEOUT_MS)
			})
			const answer = parseJudgeAnswer(result.text)
			if (answer) return { provider, answer, ms: Date.now() - started }
			console.log(`    ${provider.name}: not the JSON asked for; next`)
		} catch (err) {
			console.log(
				`    ${provider.name}: ${err instanceof ProviderError ? err.code : String(err)}; next`
			)
		}
	}
	return null
}

let total = 0
let agreed = 0
let failed = 0
console.log(
	`Providers: ${providers.map((p: VisionProvider) => `${p.name} (${p.model})`).join(' → ')}\n`
)
for (const set of sets) {
	const folder = join(ROOT, set)
	const labels = JSON.parse(readFileSync(join(folder, 'labels.json'), 'utf8')) as Label[]
	console.log(`── ${set} (${labels.length}) ──`)
	for (const label of labels) {
		total++
		const result = await judge(label, folder)
		if (!result) {
			failed++
			console.log(`✗ ${label.file}: every provider failed (verdict: error)`)
		} else {
			const ok = result.answer.verdict === label.expected
			if (ok) agreed++
			console.log(
				`${ok ? '✓' : '✗'} ${label.file}: ${result.answer.verdict} (expected ${label.expected}; ${label.why})` +
					`\n    ${result.provider.name}, ${result.ms} ms · reason: ${result.answer.reason}` +
					`\n    caption: ${result.answer.caption}`
			)
		}
		await new Promise((resolve) => setTimeout(resolve, PAUSE_MS))
	}
	console.log('')
}
console.log(`Agreement: ${agreed} of ${total}${failed ? ` (${failed} with no verdict)` : ''}`)
