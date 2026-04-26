import { getDb } from '../lib/db'

const fmt = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export async function getWeekEvents(userId: string, weekOffset: number) {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + mondayOffset + weekOffset * 7,
  )
  const sunday = new Date(
    monday.getFullYear(),
    monday.getMonth(),
    monday.getDate() + 6,
  )

  const db = getDb()
  return db
    .selectFrom('event')
    .selectAll()
    .where('user_id', '=', userId)
    .where('date', '>=', fmt(monday))
    .where('date', '<=', fmt(sunday))
    .orderBy('date', 'asc')
    .execute()
}

export async function getMonthEvents(userId: string) {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const startOfMonth = `${year}-${String(month + 1).padStart(2, '0')}-01`
  const endOfMonth = `${year}-${String(month + 1).padStart(2, '0')}-${String(new Date(year, month + 1, 0).getDate()).padStart(2, '0')}`

  const db = getDb()
  return db
    .selectFrom('event')
    .selectAll()
    .where('user_id', '=', userId)
    .where('date', '>=', startOfMonth)
    .where('date', '<=', endOfMonth)
    .orderBy('date', 'asc')
    .execute()
}

export async function createEvent(
  userId: string,
  data: { date: string; title: string; detail?: string; type?: string },
) {
  const db = getDb()
  const result = await db
    .insertInto('event')
    .values({
      user_id: userId,
      type: (data.type as 'event' | 'todo' | 'note') || 'event',
      date: data.date,
      title: data.title,
      detail: data.detail || null,
    })
    .execute()

  return { id: Number(result[0].insertId) }
}
