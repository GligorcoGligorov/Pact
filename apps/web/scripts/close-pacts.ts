/**
 * `npm run pacts:close [-- --now=YYYY-MM-DD]`: runs the pact closer (R26) once, locally, the
 * same code POST /api/cron/pacts runs (src/server/pacts/closer.ts), straight against the
 * database: no web server and no CRON_SECRET needed. Safe to run any number of times.
 *
 * `--now` runs it as if it were that day (noon UTC) or instant, to "advance time" in a demo:
 * `--now=2026-11-20` closes every day up to the 19th, and deletes photos of pacts that ended
 * more than 30 days before. Refused when NODE_ENV is production, and on any non-local database.
 */

import { parseNowOverride } from '../src/server/pacts/clock'
import { closePacts } from '../src/server/pacts/closer'

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]'])

function fail(message: string): never {
	process.stderr.write(`pacts:close: ${message}\n`)
	process.exit(1)
}

const url = process.env.DATABASE_URL
if (!url)
	fail('DATABASE_URL is not set. Run it with the local stack’s values (docs/pact-status.md).')
if (!LOCAL_HOSTS.has(new URL(url).hostname))
	fail('DATABASE_URL is not local; the closer script only runs locally.')

const raw = process.argv.find((a) => a.startsWith('--now='))?.slice('--now='.length)
const override = parseNowOverride(raw, process.env.NODE_ENV)
if (override.error) fail(override.error)
const now = override.now ?? new Date()

const s = await closePacts(now)
process.stdout.write(
	[
		`Closed as of ${now.toISOString()}${override.now ? ' (overridden)' : ''}:`,
		`  pacts advanced ${s.pacts}, days closed ${s.daysClosed}, finished ${s.finished}`,
		`  inbox messages ${s.messages}, photos deleted ${s.photosDeleted}`,
		''
	].join('\n')
)
process.exit(0)
