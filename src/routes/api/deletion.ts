import { createFileRoute } from '@tanstack/react-router'
import { env } from 'cloudflare:workers'

function base64urlDecode(input: string): Uint8Array {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(base64)
  return Uint8Array.from(binary, (c) => c.charCodeAt(0))
}

async function parseSignedRequest(signedRequest: string) {
  const [encodedSig, payload] = signedRequest.split('.')
  if (!encodedSig || !payload) return null

  const secret = process.env.FB_APP_SECRET
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  )

  const sig = base64urlDecode(encodedSig)
  const valid = await crypto.subtle.verify(
    'HMAC',
    key,
    sig,
    new TextEncoder().encode(payload),
  )
  if (!valid) return null

  return JSON.parse(new TextDecoder().decode(base64urlDecode(payload)))
}

export const Route = createFileRoute('/api/deletion')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const formData = await request.formData()
        const signedRequest = formData.get('signed_request')

        if (!signedRequest || typeof signedRequest !== 'string') {
          return new Response('Bad Request', { status: 400 })
        }

        const data = await parseSignedRequest(signedRequest)
        if (!data) {
          return new Response('Invalid signature', { status: 403 })
        }

        const userId: string = data.user_id
        console.log('Meta deletion request for user_id:', userId)

        const code = (Math.random() * 100000).toString(16)
        const body = {
          url: `${env.BETTER_AUTH_URL}/deletion-status?code=${code}`,
          confirmation_code: code,
        }

        return new Response(JSON.stringify(body), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      },
    },
  },
})
