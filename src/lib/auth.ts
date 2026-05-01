import { betterAuth } from 'better-auth'
import { kyselyAdapter } from '@better-auth/kysely-adapter'
import { env } from 'cloudflare:workers'
import { getRequest } from '@tanstack/react-start/server'
import { db } from './db'

export function createAuth() {
  return betterAuth({
    database: kyselyAdapter(db, { type: 'sqlite' }),
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    emailAndPassword: {
      enabled: true,
    },
  })
}

export type Auth = ReturnType<typeof createAuth>

export async function getSessionUser() {
  const request = getRequest()
  const session = await createAuth().api.getSession({
    headers: request.headers,
  })
  return session?.user ?? null
}
