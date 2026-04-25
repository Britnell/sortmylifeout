import { betterAuth } from 'better-auth'
import { kyselyAdapter } from '@better-auth/kysely-adapter'
import { env } from 'cloudflare:workers'
import { getDb } from './db'

export function createAuth() {
  return betterAuth({
    database: kyselyAdapter(getDb(), { type: 'sqlite' }),
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    emailAndPassword: {
      enabled: true,
    },
  })
}

export type Auth = ReturnType<typeof createAuth>
