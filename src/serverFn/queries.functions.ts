import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { createAuth } from '../lib/auth'

export const getSessionFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    const request = getRequest()
    const session = await createAuth().api.getSession({ headers: request.headers })
    return session?.user?.id ?? null
  },
)
