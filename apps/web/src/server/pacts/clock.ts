/**
 * The closer's "advance time" override for demos: `--now=2026-10-20` (a day, read as noon UTC
 * so every timezone sees that date) or a full ISO instant. Only outside production, so a real
 * deployment can never be told it's next month.
 */
export function parseNowOverride(
	raw: string | null | undefined,
	nodeEnv: string | undefined
): { now: Date | null; error?: undefined } | { now?: undefined; error: string } {
	if (!raw) return { now: null }
	if (nodeEnv === 'production') return { error: 'now can only be overridden outside production' }
	const iso = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T12:00:00Z` : raw
	const now = new Date(iso)
	if (Number.isNaN(now.getTime())) return { error: `"${raw}" is not a date (YYYY-MM-DD)` }
	return { now }
}
