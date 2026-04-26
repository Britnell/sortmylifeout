import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { createAuth } from '../lib/auth'
import { createEvent, getMonthEvents, getWeekEvents } from './date.server'

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
    return getWeekEvents(session.user.id, data.weekOffset)
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
    return createEvent(session.user.id, data)
  })

export const getMonthFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    const request = getRequest()
    const session = await createAuth().api.getSession({
      headers: request.headers,
    })
    if (!session?.user?.id) return []
    return getMonthEvents(session.user.id)
  },
)
