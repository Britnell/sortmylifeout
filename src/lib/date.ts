export const weekdays = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

export function localToday(): string {
	const d = new Date()
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function getWeekDays(weekOffset: number): Date[] {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + mondayOffset + weekOffset * 7,
  )
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(d.getDate() + i)
    return d
  })
}

export function getMonthDays(monthOffset: number): Date[][] {
	const now = new Date()
	const first = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1)
	const dayOfWeek = first.getDay()
	const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
	const gridStart = new Date(first)
	gridStart.setDate(gridStart.getDate() + mondayOffset)
	const weeks: Date[][] = []
	let cur = gridStart
	while (cur < first || cur.getMonth() === first.getMonth()) {
		weeks.push(
			Array.from({ length: 7 }, (_, i) => {
				const d = new Date(cur)
				d.setDate(d.getDate() + i)
				return d
			}),
		)
		cur = new Date(cur)
		cur.setDate(cur.getDate() + 7)
	}
	return weeks
}

export function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}
