import { createServerFn } from '@tanstack/cloudflare-functions'
import { signUp } from './auth.server'

export const signUpFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { orgId: string; userId: string }) => data)
  .handler(({ data }) => signUp(data))
