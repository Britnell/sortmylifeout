import { createServerFn } from '@tanstack/react-start'
import { getSessionUser } from '../lib/auth'
import { createEvent, getCalendarEvents, getMonthEvents, getWeekEvents, updateEvent, toggleTodoDone } from './date.server'

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
    (d: { date: string; time?: string; allDay: boolean; title: string; detail?: string; type?: string }) => d,
  )
  .handler(async ({ data }) => {
    const user = await getSessionUser()
    if (!user) throw new Error('Unauthorized')
    return createEvent(user.id, data)
  })

export const updateEventFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (d: { id: number; date: string; time?: string; allDay: boolean; title: string; detail?: string }) => d,
  )
  .handler(async ({ data }) => {
    const user = await getSessionUser()
    if (!user) throw new Error('Unauthorized')
    return updateEvent(user.id, data.id, data)
  })

export const toggleTodoDoneFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { id: number; completed: boolean }) => d)
  .handler(async ({ data }) => {
    const user = await getSessionUser()
    if (!user) throw new Error('Unauthorized')
    return toggleTodoDone(user.id, data.id, data.completed)
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
