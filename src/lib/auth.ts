import { betterAuth } from 'better-auth'
import { kyselyAdapter } from '@better-auth/kysely-adapter'
import { env } from 'cloudflare:workers'
import { getRequest } from '@tanstack/react-start/server'
import { db } from './db'

let authInstance: ReturnType<typeof betterAuth> | null = null

export function createAuth() {
  if (!authInstance) {
    authInstance = betterAuth({
      database: kyselyAdapter(db, { type: 'sqlite' }),
      secret: env.BETTER_AUTH_SECRET,
      baseURL: env.BETTER_AUTH_URL,
      emailAndPassword: {
        enabled: true,
      },
    })
  }
  return authInstance
}

export type Auth = ReturnType<typeof createAuth>

export async function getSessionUser() {
  const request = getRequest()
  const session = await createAuth().api.getSession({
    headers: request.headers,
  })
  return session?.user ?? null
}
