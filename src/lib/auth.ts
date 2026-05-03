import { betterAuth } from 'better-auth'
import { kyselyAdapter } from '@better-auth/kysely-adapter'
import { env } from 'cloudflare:workers'
import { getRequest } from '@tanstack/react-start/server'
import { db } from './db'

// PBKDF2 via Web Crypto — bcrypt exceeds Cloudflare Workers CPU limits
async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
    key,
    256,
  )
  const saltHex = Array.from(salt)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  const hashHex = Array.from(new Uint8Array(bits))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  const hash = `pbkdf2:${saltHex}:${hashHex}`
  console.log({ hash })
  return hash
}

async function verifyPassword(
  hash: string,
  password: string,
): Promise<boolean> {
  const [, saltHex, hashHex] = hash.split(':')
  const salt = new Uint8Array(
    saltHex.match(/.{2}/g)!.map((h) => parseInt(h, 16)),
  )
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
    key,
    256,
  )
  const candidateHex = Array.from(new Uint8Array(bits))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  return candidateHex === hashHex
}

let authInstance: ReturnType<typeof betterAuth> | null = null

export function createAuth() {
  if (!authInstance) {
    authInstance = betterAuth({
      database: kyselyAdapter(db, { type: 'sqlite' }),
      secret: env.BETTER_AUTH_SECRET,
      baseURL: env.BETTER_AUTH_URL,
      emailAndPassword: {
        enabled: true,
        password: {
          hash: hashPassword,
          verify: ({ hash, password }) => verifyPassword(hash, password),
        },
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
