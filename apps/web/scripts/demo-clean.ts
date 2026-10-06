/**
 * The clean-up half of `npm run demo:reset` (root): it runs first, then `seed:demo --finished`
 * re-seeds the two demo pacts and `pacts:close` closes their days, so the video starts from:
 *
 *   - 6am Run Club (STREAK), live, day 8 of 21: Ben and Cleo in, Ana and Dan not yet.
 *   - Sunrise Yoga (ZENDAY), ended yesterday, results waiting behind the 🏁 banner.
 *
 * What this script removes, for the four demo accounts only:
 *
 *   - every other pact made only of demo accounts (hand-made test pacts, round 2s), with its
 *     photos. A pact anyone else is in, the developer's own account included, is left alone.
 *   - their inbox, so no stale nudge or banner pops up mid-take.
 *   - blocks between them, so nobody's check-ins are hidden from the crew.
 *
 * Refuses any database or Supabase URL that is not on this machine, like the seed.
 */

import { PrismaClient } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'

const DEMO_EMAILS = [
	'ana.demo@example.com',
	'ben.demo@example.com',
	'cleo.demo@example.com',
	'dan.demo@example.com'
]
/** The seed's own pacts, re-seeded right after this runs. */
const SEEDED_CODES = ['STREAK', 'ZENDAY']
const BUCKET = 'user-uploads'
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]'])

function fail(message: string): never {
	process.stderr.write(`demo:reset: ${message}\n`)
	process.exit(1)
}

function requireLocal(name: string, url: string | undefined): string {
	if (!url) fail(`${name} is not set. Run it with the local stack's values (docs/pact-status.md).`)
	const host = new URL(url).hostname
	if (!LOCAL_HOSTS.has(host)) fail(`${name} points at ${host}; the demo reset only runs locally.`)
	return url
}

const databaseUrl = requireLocal('DATABASE_URL', process.env.DATABASE_URL)
const supabaseUrl = requireLocal(
	'SUPABASE_URL',
	process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
)
const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
if (!secretKey) fail('SUPABASE_SECRET_KEY is not set (`supabase status` shows the local one).')

const db = new PrismaClient({ datasources: { db: { url: databaseUrl } } })
const storage = createClient(supabaseUrl, secretKey, {
	auth: { autoRefreshToken: false, persistSession: false }
}).storage.from(BUCKET)

async function main() {
	const demo = await db.$queryRaw<{ id: string }[]>`
		select id from auth.users where email = any(${DEMO_EMAILS})`
	const demoIds = demo.map((u) => u.id)
	if (demoIds.length === 0) {
		process.stdout.write('No demo accounts yet; the seed will make them.\n')
		return
	}

	// Pacts with at least one demo member and no one else, other than the seed's own.
	const candidates = await db.pact.findMany({
		where: {
			inviteCode: { notIn: SEEDED_CODES },
			members: { some: { userId: { in: demoIds } }, every: { userId: { in: demoIds } } }
		},
		select: { id: true, name: true }
	})
	const pactIds = candidates.map((p) => p.id)
	const withPhotos = await db.checkIn.findMany({
		where: { pactId: { in: pactIds }, photoPath: { not: null } },
		select: { photoPath: true }
	})
	const photos = withPhotos.flatMap((c) => c.photoPath ?? [])
	if (photos.length > 0) {
		const { error } = await storage.remove(photos)
		if (error) fail(`removing photos: ${error.message}`)
	}

	const [pacts, inbox, blocks] = await db.$transaction([
		// Members, check-ins, nudges, reactions and the pact's inbox lines go with it (cascade).
		db.pact.deleteMany({ where: { id: { in: pactIds } } }),
		db.notification.deleteMany({ where: { userId: { in: demoIds } } }),
		db.userBlock.deleteMany({
			where: { blockerId: { in: demoIds }, blockedId: { in: demoIds } }
		})
	])
	process.stdout.write(
		[
			`Cleaned: ${pacts.count} extra pact(s)${
				candidates.length ? ` (${candidates.map((p) => p.name).join(', ')})` : ''
			}, ${photos.length} photo(s), ${inbox.count} inbox line(s), ${blocks.count} block(s).`,
			''
		].join('\n')
	)
}

try {
	await main()
} finally {
	await db.$disconnect()
}
