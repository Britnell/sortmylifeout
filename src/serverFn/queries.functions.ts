import { createServerFn } from '@tanstack/react-start'
import { getSessionUser } from '../lib/auth'
import { getDb } from '../lib/db'
import { createEvent, deleteEvent, updateEvent, searchEvents } from './date.server'

export const getSessionFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    const user = await getSessionUser()
    return user?.id ?? null
  },
)

export const createEventFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (d: { begin?: string; allDay: boolean; end?: string; title: string; detail?: string; type?: string; completed?: boolean }) => d,
  )
  .handler(async ({ data }) => {
    const user = await getSessionUser()
    if (!user) throw new Error('Unauthorized')
    return createEvent(user.id, data)
  })

export const updateEventFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (d: { id: number; begin?: string; allDay?: boolean; end?: string | null; title?: string; detail?: string; type?: string; completed?: boolean }) => d,
  )
  .handler(async ({ data }) => {
    const user = await getSessionUser()
    if (!user) throw new Error('Unauthorized')
    return updateEvent(user.id, data.id, data)
  })

export const deleteEventFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { id: number }) => d)
  .handler(async ({ data }) => {
    const user = await getSessionUser()
    if (!user) throw new Error('Unauthorized')
    return deleteEvent(user.id, data.id)
  })

export const getUserFn = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await getSessionUser()
  if (!user) throw new Error('Unauthorized')
  const db = getDb()
  const row = await db
    .selectFrom('user')
    .select(['id', 'name', 'email', 'phone'])
    .where('id', '=', user.id)
    .executeTakeFirstOrThrow()
  return row
})

export const updateUserFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { name?: string; phone?: string | null }) => d)
  .handler(async ({ data }) => {
    const user = await getSessionUser()
    if (!user) throw new Error('Unauthorized')
    const db = getDb()
    const updates: Record<string, unknown> = { updatedAt: Math.floor(Date.now() / 1000) }
    if (data.name !== undefined) updates.name = data.name
    if (data.phone !== undefined) updates.phone = data.phone
    await db.updateTable('user').set(updates).where('id', '=', user.id).execute()
    return { ok: true }
  })

export const searchEventsFn = createServerFn({ method: 'GET' })
  .inputValidator(
    (d: { date_from?: string; date_to?: string; type?: string; completed?: boolean }) => d,
  )
  .handler(async ({ data }) => {
    const user = await getSessionUser()
    if (!user) return []
    return searchEvents(user.id, data)
  })
