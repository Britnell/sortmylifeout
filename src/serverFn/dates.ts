import * as chrono from 'chrono-node'

const weekday = (d: Date) =>
	[
		'Sunday',
		'Monday',
		'Tuesday',
		'Wednesday',
		'Thursday',
		'Friday',
		'Saturday',
	][d.getUTCDay()]

const candidate = (d: Date) => {
	const date = d.toISOString().slice(0, 10)
	return { key: date, value: `${weekday(d)} ${date}` }
}

// chrono hard-codes weeks to a Sunday start (and "this week" resolves to
// the past Sunday). Override: this/last/next week = Mon - Su.
const THIS_WEEK = /\b(this|the) (current )?week\b/i
const LAST_WEEK = /\blast week\b/i
const NEXT_WEEK = /\bnext week\b/i

const dayOffset = (d: Date, days: number) =>
	new Date(d.getTime() + days * 86400000)

// Monday of the given date's week (UTC)
const monday = (d: Date) => dayOffset(d, -((d.getUTCDay() + 6) % 7))

const weekOverride = (message: string) => {
	const mon = monday(new Date())
	if (LAST_WEEK.test(message))
		return {
			week: { from: dayOffset(mon, -7), to: dayOffset(mon, -1) },
			rolling: null,
		} // last Mo - Su
	if (NEXT_WEEK.test(message))
		return {
			week: { from: dayOffset(mon, 7), to: dayOffset(mon, 13) },
			rolling: null,
		} // next Mo - Su
	if (THIS_WEEK.test(message)) {
		const now = new Date()
		return {
			week: { from: mon, to: dayOffset(mon, 6) }, // this Mo - Su
			rolling: { from: now, to: dayOffset(now, 7) }, // today -> +7 days
		}
	}
	return null
}

// parse a message with chrono, replacing the built-in sunday-start week
// results with Mon - Su candidates
const parseDates = (message: string) => {
	const results: { text: string; start: { date: () => Date } }[] =
		chrono.en.GB
			.parse(message)
			.filter(
				(r) =>
					!THIS_WEEK.test(r.text) &&
					!LAST_WEEK.test(r.text) &&
					!NEXT_WEEK.test(r.text),
			)
	const week = weekOverride(message)
	if (week) {
		results.push(
			{ text: 'week (from Monday)', start: { date: () => week.week.from } },
			{ text: 'week (until Sunday)', start: { date: () => week.week.to } },
		)
		if (week.rolling) {
			results.push(
				{ text: 'today', start: { date: () => week.rolling.from } },
				{
					text: 'today + 7 days',
					start: { date: () => week.rolling.to },
				},
			)
		}
		console.log(
			'[parseDates] week override:',
			results.map((r) => ({ text: r.text, date: r.start.date() })),
		)
	}
	return { results, week: week !== null }
}

// DD.MM(.YY) style dates, e.g. "5.11." or "24.12.26"
const euDateCandidates = (message: string) =>
	[
		...message.matchAll(/\b(\d{1,2})[.-](\d{1,2})(?:[.-](\d{2,4}))?\b/g),
	].flatMap((m): { key: string; value: string }[] => {
		const day = +m[1]
		const month = +m[2]
		if (day < 1 || day > 31 || month < 1 || month > 12) return []
		const year = m[3]
			? +(m[3].length === 2 ? 2000 + +m[3] : m[3])
			: new Date().getUTCFullYear()
		const d = new Date(Date.UTC(year, month - 1, day))
		if (d.getUTCDate() !== day || d.getUTCMonth() !== month - 1) return []
		return [candidate(d)]
	})

/** date candidates ('YYYY-MM-DD' -> 'Weekday YYYY-MM-DD') from a user prompt */
export const dateCandidates = (message: string) => {
	const { results, week } = parseDates(message)
	const list = week
		? results.map((r) => candidate(r.start.date()))
		: [
				...results.map((r) => candidate(r.start.date())),
				...euDateCandidates(message),
			]
	return Object.fromEntries(
		list.map((d) => [d.key, d.value]),
	)
}

/** datetime candidates (YYYY-MM-DDTHH:mm) for prompts with explicit times */
export const datetimeCandidates = (message: string) =>
	Object.fromEntries(
		chrono.en.GB
			.parse(message)
			.filter((r) => r.start.isCertain('hour'))
			.map((r) => {
				const d = r.start.date()
				const iso = d.toISOString()
				const key = `${iso.slice(0, 10)}T${iso.slice(11, 16)}`
				return [key, `${weekday(d)} ${key}`]
			}),
	)
