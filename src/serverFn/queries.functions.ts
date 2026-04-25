import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { createAuth } from '../lib/auth'
import { getDb } from '../lib/db'

export const getSessionFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    const request = getRequest()
    const session = await createAuth().api.getSession({ headers: request.headers })
    return session?.user?.id ?? null
  },
)

export const getMonthFn = createServerFn({ method: 'GET' }).handler(async () => {
    const request = getRequest()
    const session = await createAuth().api.getSession({ headers: request.headers })
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
