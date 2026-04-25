import { betterAuth } from 'better-auth'
import { kyselyAdapter } from '@better-auth/kysely-adapter'
import { Kysely } from 'kysely'
import { D1Dialect } from 'kysely-d1'
import { env } from 'cloudflare:workers'

function getDb() {
  return new Kysely({ dialect: new D1Dialect({ database: env.sortinglifedb }) })
}

export function createAuth() {
  return betterAuth({
    database: kyselyAdapter(getDb(), { type: 'sqlite' }),
    emailAndPassword: {
      enabled: true,
    },
  })
}

export type Auth = ReturnType<typeof createAuth>
