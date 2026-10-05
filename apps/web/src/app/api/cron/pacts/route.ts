import { NextResponse, type NextRequest } from 'next/server'
import { isCronAuthorized } from '@/server/api/cron-auth'
import { parseNowOverride } from '@/server/pacts/clock'
import { closePacts } from '@/server/pacts/closer'
import { log } from '@/server/lib/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

/**
 * POST /api/cron/pacts: the pact closer (R26), safe to run any number of times
 * (src/server/pacts/closer.ts). Auth: `Authorization: Bearer <CRON_SECRET>`; unset answers 503.
 *
 * `?now=YYYY-MM-DD` (or a full ISO instant) runs it as if it were then, for "advance time"
 * demos. Refused in production. Locally, `npm run pacts:close` runs the same closer without
 * the server.
 */
export async function POST(req: NextRequest) {
	const secret = process.env.CRON_SECRET
	if (!secret) {
		return NextResponse.json(
			{ error: 'Cron is not configured on this deployment' },
			{ status: 503 }
		)
	}
	if (!isCronAuthorized(req.headers.get('authorization'), secret)) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
	}

	const override = parseNowOverride(req.nextUrl.searchParams.get('now'), process.env.NODE_ENV)
	if (override.error) return NextResponse.json({ error: override.error }, { status: 400 })

	try {
		const summary = await closePacts(override.now ?? new Date())
		return NextResponse.json({ ok: true, ...summary })
	} catch (err) {
		log.error('closing pacts failed', { source: 'api/cron/pacts', err })
		return NextResponse.json({ error: 'Closing pacts failed' }, { status: 500 })
	}
}

/** Vercel Cron sends GET; the same closer. */
export const GET = POST
