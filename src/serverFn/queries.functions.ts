import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { createAuth } from '../lib/auth'
import { getDb } from '../lib/db'

export const getSessionFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    const request = getRequest()
    const session = await createAuth().api.getSession({
      headers: request.headers,
    })
    return session?.user?.id ?? null
  },
)

export const getWeekFn = createServerFn({ method: 'GET' })
  .inputValidator((d: { weekOffset: number }) => d)
  .handler(async ({ data }) => {
    const request = getRequest()
    const session = await createAuth().api.getSession({
      headers: request.headers,
    })
    if (!session?.user?.id) return []

    const now = new Date()
    const dayOfWeek = now.getDay()
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    const monday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + mondayOffset + data.weekOffset * 7,
    )
    const sunday = new Date(
      monday.getFullYear(),
      monday.getMonth(),
      monday.getDate() + 6,
    )

    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

    const db = getDb()
    const events = await db
      .selectFrom('event')
      .selectAll()
      .where('user_id', '=', session.user.id)
      .where('date', '>=', fmt(monday))
      .where('date', '<=', fmt(sunday))
      .orderBy('date', 'asc')
      .execute()

    return events
  })

export const createEventFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (d: { date: string; title: string; detail?: string; type?: string }) => d,
  )
  .handler(async ({ data }) => {
    const request = getRequest()
    const session = await createAuth().api.getSession({
      headers: request.headers,
    })
    if (!session?.user?.id) throw new Error('Unauthorized')

    const db = getDb()
    const result = await db
      .insertInto('event')
      .values({
        user_id: session.user.id,
        type: (data.type as 'event' | 'todo' | 'note') || 'event',
        date: data.date,
        title: data.title,
        detail: data.detail || null,
      })
      .execute()

    return { id: Number(result[0].insertId) }
  })

export const getMonthFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    const request = getRequest()
    const session = await createAuth().api.getSession({
      headers: request.headers,
    })
    if (!session?.user?.id) return []

    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    const startOfMonth = `${year}-${String(month + 1).padStart(2, '0')}-01`
    const endOfMonth = `${year}-${String(month + 1).padStart(2, '0')}-${String(new Date(year, month + 1, 0).getDate()).padStart(2, '0')}`

    const db = getDb()
    const events = await db
      .selectFrom('event')
      .selectAll()
      .where('user_id', '=', session.user.id)
      .where('date', '>=', startOfMonth)
      .where('date', '<=', endOfMonth)
      .orderBy('date', 'asc')
      .execute()

    return events
  },
)
