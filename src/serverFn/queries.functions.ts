import { createServerFn } from '@tanstack/react-start'
import { getSessionUser } from '../lib/auth'
import { createEvent, getCalendarEvents, getMonthEvents, getWeekEvents } from './date.server'

export const getSessionFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    const user = await getSessionUser()
    return user?.id ?? null
  },
)

export const getWeekFn = createServerFn({ method: 'GET' })
  .inputValidator((d: { weekOffset: number }) => d)
  .handler(async ({ data }) => {
    const user = await getSessionUser()
    if (!user) return []
    return getWeekEvents(user.id, data.weekOffset)
  })

export const createEventFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (d: { date: string; title: string; detail?: string; type?: string }) => d,
  )
  .handler(async ({ data }) => {
    const user = await getSessionUser()
    if (!user) throw new Error('Unauthorized')
    return createEvent(user.id, data)
  })

export const getMonthFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    const user = await getSessionUser()
    if (!user) return []
    return getMonthEvents(user.id)
  },
)

export const getCalendarFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    const user = await getSessionUser()
    if (!user) return []
    return getCalendarEvents(user.id)
  },
)
