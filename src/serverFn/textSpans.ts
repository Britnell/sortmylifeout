import * as chrono from 'chrono-node'

// filler / join words - a span is dropped if its FIRST or LAST word is in here
const STOP = new Set(
	`a an the and or but to of in on at for with by from about as is are was were be been it its this that these those
	i me my we our you your he she they them what whats what's how how's when where which who whom why will would can could should
	please pls hey hi hello ok okay so just also too then than there here do does did doing any some all
	set turn put make give tell show find search look up add remind reminder list get check going go need want like
	today tomorrow tonight now`
		.split(/\s+/),
)

const MAX_SPANS = 150
const MAX_WORDS = 7

/**
 * Split a user prompt into search-term candidate strings:
 * date/time phrases (chrono) + all contiguous word spans (1..7 words)
 * whose first/last word is not a stop word. Deduped, longest first.
 */
export const promptSpans = (prompt: string): string[] => {
	const words = prompt
		.replace(/[“”"]/g, ' ')
		.split(/\s+/)
		.map((w) =>
			w.replace(/^[^\p{L}\p{N}$#@]+|[^\p{L}\p{N}%]+$/gu, ''),
		)
		.filter(Boolean)

	const out: string[] = []
	const seen = new Set<string>()
	const push = (s: string) => {
		const k = s.toLowerCase()
		if (!seen.has(k)) {
			seen.add(k)
			out.push(s)
		}
	}

	// date/time phrases: "tomorrow", "in 2 hours", "5.11." ...
	for (const r of chrono.en.GB.parse(prompt)) push(r.text)

	// contiguous spans, longest first, stop words only checked at the edges
	for (let n = Math.min(MAX_WORDS, words.length); n >= 1; n--) {
		for (let i = 0; i + n <= words.length; i++) {
			const span = words.slice(i, i + n)
			if (STOP.has(span[0].toLowerCase())) continue
			if (STOP.has(span[span.length - 1].toLowerCase())) continue
			push(span.join(' '))
		}
	}
	return out.slice(0, MAX_SPANS)
}
