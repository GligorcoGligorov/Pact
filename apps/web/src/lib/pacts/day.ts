/**
 * A pact's calendar: which pact-local day it is, when that day closes, which days the pact
 * counts, and which of them a member is held to (docs/pact-requirements.md, R3, R6–R9).
 *
 * Pure, with no I/O: every function takes the pact's timezone and `now` rather than reading
 * a clock, so the same input always gives the same day, and the tests can stand anywhere in
 * time. A day is a pact-local calendar date, `YYYY-MM-DD`: the same string sorts, compares
 * and is stored (`@db.Date`), so no day ever passes through a `Date` in local time.
 *
 * "Today" is the server's clock read in the pact's timezone. The client never sends a day.
 */

/** A pact-local calendar date, `YYYY-MM-DD`. */
export type Day = string

export type Cadence = 'daily' | 'weekdays'

export type PactStatus = 'lobby' | 'active' | 'completed' | 'cancelled'

/** The fields of a pact the calendar reads. */
export interface PactCalendar {
	timezone: string
	cadence: Cadence
	startDay: Day
	/** Inclusive. */
	endDay: Day
}

/** The fields of a membership the calendar reads. */
export interface MemberSpan {
	userId: string
	/** The first day the member is held. */
	joinedDay: Day
	/** The first day the member is NOT held (the day they left), or null. */
	leftDay: Day | null
}

const MS_PER_DAY = 86_400_000
const MS_PER_HOUR = 3_600_000
const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const SATURDAY = 6
const SUNDAY = 0

// Every UTC offset in use lies within UTC-12 to UTC+14, so the instant a local midnight
// falls on is within these bounds of the same wall-clock time read as UTC.
const EARLIEST_OFFSET_HOURS = 15
const LATEST_OFFSET_HOURS = 13

// IANA names are Area/Location words. Intl also accepts offsets ("+01:00") and odd
// spellings; a pact's timezone must be a real zone, so those are refused here first.
const IANA_NAME = /^(UTC|[A-Za-z]+(?:\/[A-Za-z0-9_+-]+)+)$/

const formatters = new Map<string, Intl.DateTimeFormat>()

function formatterFor(timezone: string): Intl.DateTimeFormat {
	let formatter = formatters.get(timezone)
	if (!formatter) {
		formatter = new Intl.DateTimeFormat('en-US', {
			timeZone: timezone,
			calendar: 'iso8601',
			numberingSystem: 'latn',
			year: 'numeric',
			month: '2-digit',
			day: '2-digit'
		})
		formatters.set(timezone, formatter)
	}
	return formatter
}

/**
 * The canonical spelling of an IANA timezone this runtime knows (`europe/skopje` →
 * `Europe/Skopje`), or null. A pact stores what this returns, never what the device sent.
 */
export function canonicalTimeZone(timezone: string): string | null {
	if (!IANA_NAME.test(timezone)) return null
	try {
		return formatterFor(timezone).resolvedOptions().timeZone
	} catch {
		return null
	}
}

/** True for a real calendar date written `YYYY-MM-DD`. */
export function isDay(value: string): value is Day {
	if (!DAY_PATTERN.test(value)) return false
	const date = new Date(`${value}T00:00:00Z`)
	return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value)
}

/** The pact-local day an instant falls on. */
export function todayIn(timezone: string, now: Date): Day {
	const parts = formatterFor(timezone).formatToParts(now)
	const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)!.value
	return `${part('year')}-${part('month')}-${part('day')}`
}

/** Days after `day`; negative goes back. */
export function addDays(day: Day, days: number): Day {
	return new Date(toUtcMs(day) + days * MS_PER_DAY).toISOString().slice(0, 10)
}

/** Whole days from `from` to `to`: 0 for the same day, negative when `to` is earlier. */
export function daysBetween(from: Day, to: Day): number {
	return Math.round((toUtcMs(to) - toUtcMs(from)) / MS_PER_DAY)
}

/** Sunday is 0, as `Date#getUTCDay`. */
export function weekdayOf(day: Day): number {
	return new Date(toUtcMs(day)).getUTCDay()
}

/**
 * The instant `day` closes in `timezone`: the first instant whose local date is later than
 * `day`. Usually the next local midnight; when a DST change skips midnight (Santiago,
 * Havana, Beirut), the first instant after the skip; when a zone skips the next date
 * altogether (Samoa, 2011-12-30), the instant it jumps. A day is 23, 24 or 25 hours long,
 * or none at all.
 *
 * Found by bisection over the local date, which only ever moves forward: no zone sets its
 * clock back across midnight.
 */
export function closesAt(timezone: string, day: Day): Date {
	const nextMidnightAsUtc = toUtcMs(addDays(day, 1))
	let before = nextMidnightAsUtc - EARLIEST_OFFSET_HOURS * MS_PER_HOUR
	let after = nextMidnightAsUtc + LATEST_OFFSET_HOURS * MS_PER_HOUR
	const isLater = (ms: number) => todayIn(timezone, new Date(ms)) > day
	if (isLater(before) || !isLater(after)) {
		throw new Error(`closesAt: ${day} in ${timezone} is outside every UTC offset`)
	}
	while (after - before > 1) {
		const mid = Math.floor((before + after) / 2)
		if (isLater(mid)) after = mid
		else before = mid
	}
	return new Date(after)
}

/** The inclusive end day of a pact `days` calendar days long, for either cadence. */
export function endDayFor(startDay: Day, days: number): Day {
	return addDays(startDay, days - 1)
}

/** R3: derived from the dates on every read; `cancelled` only by the owner, in the lobby. */
export function pactStatus(
	pact: PactCalendar & { cancelledAt: Date | null },
	today: Day
): PactStatus {
	if (pact.cancelledAt) return 'cancelled'
	if (today < pact.startDay) return 'lobby'
	if (today <= pact.endDay) return 'active'
	return 'completed'
}

/** A day the pact counts: within its dates and, for `weekdays`, Monday to Friday. */
export function isPactDay(pact: PactCalendar, day: Day): boolean {
	if (day < pact.startDay || day > pact.endDay) return false
	if (pact.cadence === 'daily') return true
	const weekday = weekdayOf(day)
	return weekday !== SATURDAY && weekday !== SUNDAY
}

/** The pact's days from its start through `through` (capped at its end), oldest first. */
export function pactDaysThrough(pact: PactCalendar, through: Day): Day[] {
	const last = through < pact.endDay ? through : pact.endDay
	const days: Day[] = []
	for (let day = pact.startDay; day <= last; day = addDays(day, 1)) {
		if (isPactDay(pact, day)) days.push(day)
	}
	return days
}

/**
 * R6: the first day a person joining `today` is held. In the lobby, the start day. Once the
 * pact is active, the day AFTER joining: someone who joins at 23:50 can't be expected to
 * check in within ten minutes, and a join must never break a day the group is keeping.
 *
 * A result after the pact's end day means the join would hold them to nothing: the join
 * route refuses it as `pact_closed`.
 */
export function joinedDayFor(pact: PactCalendar, today: Day): Day {
	const tomorrow = addDays(today, 1)
	return tomorrow > pact.startDay ? tomorrow : pact.startDay
}

/** R6, R7: the member is held on `day` if it is a pact day inside their membership. */
export function isHeldOn(pact: PactCalendar, member: MemberSpan, day: Day): boolean {
	if (!isPactDay(pact, day)) return false
	if (day < member.joinedDay) return false
	return member.leftDay === null || day < member.leftDay
}

/** A `@db.Date` value as Prisma returns it (UTC midnight) → its day. */
export function dayFromDate(date: Date): Day {
	return date.toISOString().slice(0, 10)
}

/** A day → the `Date` Prisma writes to a `@db.Date` column. */
export function dateFromDay(day: Day): Date {
	return new Date(toUtcMs(day))
}

function toUtcMs(day: Day): number {
	return Date.parse(`${day}T00:00:00Z`)
}
