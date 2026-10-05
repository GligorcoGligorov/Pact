/**
 * The crew feed's day sections. The feed arrives newest first by when each check-in was made,
 * but a section is the pact-local DAY it counts for, and the two orders disagree: a crew in
 * Tokyo checks in for the 6th while a crew in Los Angeles is still on the 5th, and a check-in
 * made just after midnight can sort among the previous day's. Grouping only consecutive entries
 * made the same day two sections (and React two children with one key). So each day is one
 * section, wherever its entries fall; sections run newest day first, and entries keep the
 * feed's order inside them.
 */
export function groupByDay<T extends { day: string }>(entries: readonly T[]) {
	const byDay = new Map<string, T[]>()
	for (const entry of entries) {
		const group = byDay.get(entry.day)
		if (group) group.push(entry)
		else byDay.set(entry.day, [entry])
	}
	return [...byDay.entries()]
		.sort(([a], [b]) => (a < b ? 1 : a > b ? -1 : 0))
		.map(([day, group]) => ({ day, entries: group }))
}
