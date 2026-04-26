export function parseIsoDate(date: string): {
  date: string
  time?: string
  allDay: boolean
} {
  if (date.includes('T')) {
    const [d, time] = date.split('T')
    return { date: d, time, allDay: false }
  }
  return { date, allDay: true }
}

export const dateDescription =
  "'YYYY-MM-DD' (all-day) or 'YYYY-MM-DDTHH:MM' (timed, local time)"
