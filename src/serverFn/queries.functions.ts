import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { loginUser, signupUser, logoutUser } from '../lib/auth.server'
import { getSession } from '../lib/auth'

export const loginFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { username: string; password: string }) => d)
  .handler(async ({ data }) => {
    return loginUser(data.username, data.password)
  })

export const signupFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (d: { username: string; email: string; password: string }) => d,
  )
  .handler(async ({ data }) => {
    return signupUser(data.username, data.email, data.password)
  })

export const logoutFn = createServerFn({ method: 'POST' }).handler(async () => {
  const request = getRequest()
  return logoutUser(request)
})

export const getSessionFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    const request = getRequest()
    const session = await getSession(request)
    return session?.userId ?? null
  },
)
