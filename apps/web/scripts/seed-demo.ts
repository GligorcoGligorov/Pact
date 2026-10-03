/**
 * `npm run seed:demo`: a lived-in demo pact on the LOCAL stack (R29), so every screen has
 * something to show and the developer's own account can join it from the phone.
 *
 * It makes four demo accounts (Supabase Auth, email confirmed, so the simulator signs in with
 * an emailed code from Mailpit) and one active pact, invite code STREAK, that started 7 days
 * ago in the Mac's timezone. The week behind it: five kept days, a Cleo streak saver, a day
 * Dan missed (broken), a `suspicious` check-in from Ben, and today half done (Ben and Cleo
 * in, Ana and Dan out, Dan nudged by Ben). Ana is out on purpose: she is the account a live
 * demo checks in with. Placeholder photos go to storage under each
 * member's `<user id>/proofs/`.
 *
 * Idempotent: run it again and it moves the pact to "started 7 days ago" from the new today
 * and rewrites the demo members' check-ins, photos and nudges in place. The row counts stay
 * the same. Anyone else who joined the pact (the developer) keeps their membership and their
 * check-ins.
 *
 * Refuses any database that is not on this machine. Options: --timezone=<IANA name>.
 */

import { PrismaClient } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'
import { crc32, deflateSync } from 'node:zlib'
import { challengeFor } from '../src/lib/pacts/challenges'
import {
	addDays,
	canonicalTimeZone,
	closesAt,
	dateFromDay,
	endDayFor,
	todayIn,
	type Day
} from '../src/lib/pacts/day'

const INVITE_CODE = 'STREAK'
const PACT_DAYS = 21
const DAYS_AGO_STARTED = 7
const BUCKET = 'user-uploads'
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]'])
const HOUR_MS = 3_600_000
const JUDGE_DELAY_MS = 6_000

type DemoMember = {
	key: 'ana' | 'ben' | 'cleo' | 'dan'
	email: string
	name: string
	/** RGB of their placeholder photos. */
	colour: [number, number, number]
}

const MEMBERS: DemoMember[] = [
	{ key: 'ana', email: 'ana.demo@example.com', name: 'Ana', colour: [70, 130, 180] },
	{ key: 'ben', email: 'ben.demo@example.com', name: 'Ben', colour: [205, 92, 92] },
	{ key: 'cleo', email: 'cleo.demo@example.com', name: 'Cleo', colour: [60, 160, 110] },
	{ key: 'dan', email: 'dan.demo@example.com', name: 'Dan', colour: [218, 165, 32] }
]

// Day offsets from the start: 0..6 are the closed week, 7 is today.
const TODAY_OFFSET = DAYS_AGO_STARTED
const CLEO_SAVER_OFFSET = 4
const DAN_MISSED_OFFSET = 5
const BEN_SUSPICIOUS_OFFSET = 3
const IN_TODAY = new Set<DemoMember['key']>(['ben', 'cleo'])

const CAPTIONS = [
	'Three fingers, zero excuses.',
	'The habit has been witnessed.',
	'Proof, reluctantly accepted.',
	'Another day, another tiny victory.',
	'The group chat will hear about this.',
	'Consistency looks good on you.',
	'Evidence filed. Carry on.'
]

function fail(message: string): never {
	process.stderr.write(`seed:demo: ${message}\n`)
	process.exit(1)
}

function option(name: string): string | undefined {
	const prefix = `--${name}=`
	return process.argv.find((a) => a.startsWith(prefix))?.slice(prefix.length)
}

function requireLocal(name: string, url: string | undefined): string {
	if (!url) fail(`${name} is not set. Run it with the local stack's values (docs/ENV_SETUP.md).`)
	const host = new URL(url).hostname
	if (!LOCAL_HOSTS.has(host)) fail(`${name} points at ${host}; the demo seed only runs locally.`)
	return url
}

/** A solid placeholder "photo" with a darker band, as a PNG: no image library needed. */
function placeholderPng([r, g, b]: [number, number, number], width = 360, height = 480): Buffer {
	const row = Buffer.alloc(1 + width * 3)
	const rows: Buffer[] = []
	for (let y = 0; y < height; y++) {
		const shade = y > height * 0.4 && y < height * 0.6 ? 0.7 : 1
		for (let x = 0; x < width; x++) {
			row[1 + x * 3] = r * shade
			row[2 + x * 3] = g * shade
			row[3 + x * 3] = b * shade
		}
		rows.push(Buffer.from(row))
	}
	const chunk = (type: string, data: Buffer) => {
		const length = Buffer.alloc(4)
		length.writeUInt32BE(data.length)
		const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
		const crc = Buffer.alloc(4)
		crc.writeUInt32BE(crc32(body))
		return Buffer.concat([length, body, crc])
	}
	const header = Buffer.alloc(13)
	header.writeUInt32BE(width, 0)
	header.writeUInt32BE(height, 4)
	header[8] = 8 // bit depth
	header[9] = 2 // truecolour RGB
	return Buffer.concat([
		Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
		chunk('IHDR', header),
		chunk('IDAT', deflateSync(Buffer.concat(rows))),
		chunk('IEND', Buffer.alloc(0))
	])
}

const databaseUrl = requireLocal('DATABASE_URL', process.env.DATABASE_URL)
const supabaseUrl = requireLocal(
	'SUPABASE_URL',
	process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
)
const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
if (!secretKey) fail('SUPABASE_SECRET_KEY is not set (`supabase status` shows the local one).')

const requestedZone = option('timezone') ?? Intl.DateTimeFormat().resolvedOptions().timeZone
const timezone = canonicalTimeZone(requestedZone)
if (!timezone) fail(`"${requestedZone}" is not an IANA timezone.`)

const db = new PrismaClient({ datasources: { db: { url: databaseUrl } } })
const supabase = createClient(supabaseUrl, secretKey, {
	auth: { autoRefreshToken: false, persistSession: false }
})

/** The demo accounts, created on the first run and found by email after that. */
async function ensureUsers(): Promise<Map<DemoMember['key'], string>> {
	const existing = new Map<string, string>()
	for (let page = 1; ; page++) {
		const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 })
		if (error) fail(`listing users: ${error.message}`)
		for (const u of data.users) if (u.email) existing.set(u.email, u.id)
		if (data.users.length < 1000) break
	}
	const ids = new Map<DemoMember['key'], string>()
	for (const m of MEMBERS) {
		let id = existing.get(m.email)
		if (!id) {
			const { data, error } = await supabase.auth.admin.createUser({
				email: m.email,
				email_confirm: true,
				user_metadata: { display_name: m.name }
			})
			if (error || !data.user) fail(`creating ${m.email}: ${error?.message}`)
			id = data.user.id
		}
		// The on_auth_user_created trigger made the profile; name it and let the judge see it.
		await db.profile.update({
			where: { id },
			data: { displayName: m.name, aiConsentAt: new Date() }
		})
		ids.set(m.key, id)
	}
	return ids
}

type Plan = { key: DemoMember['key']; offset: number; kind: 'photo' | 'saver' }

/** Who checked in on which day of the week, per the story in the header. */
function checkInPlan(): Plan[] {
	const plan: Plan[] = []
	for (let offset = 0; offset <= TODAY_OFFSET; offset++) {
		for (const m of MEMBERS) {
			if (offset === TODAY_OFFSET && !IN_TODAY.has(m.key)) continue
			if (m.key === 'dan' && offset === DAN_MISSED_OFFSET) continue
			const saver = m.key === 'cleo' && offset === CLEO_SAVER_OFFSET
			plan.push({ key: m.key, offset, kind: saver ? 'saver' : 'photo' })
		}
	}
	return plan
}

async function main() {
	const today = todayIn(timezone!, new Date())
	const startDay: Day = addDays(today, -DAYS_AGO_STARTED)
	const endDay = endDayFor(startDay, PACT_DAYS)
	const ids = await ensureUsers()
	const idOf = (key: DemoMember['key']) => ids.get(key)!
	const demoIds = [...ids.values()]

	const pactFields = {
		ownerId: idOf('ana'),
		name: '6am Run Club',
		habit: 'Run for 20 minutes',
		cadence: 'daily' as const,
		timezone: timezone!,
		startDay: dateFromDay(startDay),
		endDay: dateFromDay(endDay),
		stake: 'Loser buys the coffees',
		cancelledAt: null,
		closedThrough: null
	}
	const pact = await db.pact.upsert({
		where: { inviteCode: INVITE_CODE },
		create: { ...pactFields, inviteCode: INVITE_CODE },
		update: pactFields
	})

	const plan = checkInPlan()
	const photoPath = (p: Plan) => `${idOf(p.key)}/proofs/demo-${p.offset}.png`

	for (const m of MEMBERS) {
		const photos = plan.filter((p) => p.key === m.key && p.kind === 'photo')
		const png = placeholderPng(m.colour)
		for (const p of photos) {
			const { error } = await supabase.storage
				.from(BUCKET)
				.upload(photoPath(p), png, { contentType: 'image/png', upsert: true })
			if (error) fail(`uploading ${photoPath(p)}: ${error.message}`)
		}
	}

	const checkIns = plan.map((p, i) => {
		const day = addDays(startDay, p.offset)
		// Spread through the evening before the day closed: 2 to 9 hours before midnight.
		const createdAt = new Date(closesAt(timezone!, day).getTime() - (2 + (i % 8)) * HOUR_MS)
		const suspicious = p.key === 'ben' && p.offset === BEN_SUSPICIOUS_OFFSET
		const isPhoto = p.kind === 'photo'
		return {
			pactId: pact.id,
			userId: idOf(p.key),
			day: dateFromDay(day),
			kind: p.kind,
			challenge: isPhoto ? challengeFor(pact.id, day) : null,
			photoPath: isPhoto ? photoPath(p) : null,
			verdict: !isPhoto
				? ('skipped' as const)
				: suspicious
					? ('suspicious' as const)
					: ('pass' as const),
			aiReason: !isPhoto
				? null
				: suspicious
					? 'The photo looks like a screenshot of an older photo, and the challenge is not visible.'
					: 'The challenge is clearly shown and the photo fits the habit.',
			aiCaption: isPhoto ? CAPTIONS[i % CAPTIONS.length] : null,
			judgedAt: isPhoto ? new Date(createdAt.getTime() + JUDGE_DELAY_MS) : null,
			createdAt
		}
	})

	await db.$transaction([
		// Demo rows are rewritten in place; anyone else's are left alone.
		db.checkIn.deleteMany({ where: { pactId: pact.id, userId: { in: demoIds } } }),
		db.nudge.deleteMany({ where: { pactId: pact.id, fromUserId: { in: demoIds } } }),
		...MEMBERS.map((m) =>
			db.pactMember.upsert({
				where: { pactId_userId: { pactId: pact.id, userId: idOf(m.key) } },
				create: {
					pactId: pact.id,
					userId: idOf(m.key),
					role: m.key === 'ana' ? 'owner' : 'member',
					joinedDay: dateFromDay(startDay),
					saverUsedDay: m.key === 'cleo' ? dateFromDay(addDays(startDay, CLEO_SAVER_OFFSET)) : null
				},
				update: {
					role: m.key === 'ana' ? 'owner' : 'member',
					joinedDay: dateFromDay(startDay),
					leftAt: null,
					leftDay: null,
					saverUsedDay: m.key === 'cleo' ? dateFromDay(addDays(startDay, CLEO_SAVER_OFFSET)) : null
				}
			})
		),
		db.checkIn.createMany({ data: checkIns }),
		db.nudge.create({
			data: {
				pactId: pact.id,
				fromUserId: idOf('ben'),
				toUserId: idOf('dan'),
				day: dateFromDay(today)
			}
		})
	])

	const [members, checkInCount, nudges] = await Promise.all([
		db.pactMember.count({ where: { pactId: pact.id } }),
		db.checkIn.count({ where: { pactId: pact.id } }),
		db.nudge.count({ where: { pactId: pact.id } })
	])
	process.stdout.write(
		[
			`Demo pact "${pact.name}" (${timezone}), ${startDay} → ${endDay}, today ${today}.`,
			`  Invite code: ${INVITE_CODE}   (join from the phone: pact://join/${INVITE_CODE})`,
			`  Rows: members ${members}, check-ins ${checkInCount}, nudges ${nudges}.`,
			`  Demo accounts (sign in with the emailed code, from Mailpit):`,
			...MEMBERS.map((m) => `    ${m.email}`),
			''
		].join('\n')
	)
}

try {
	await main()
} finally {
	await db.$disconnect()
}
