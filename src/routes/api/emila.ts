import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/emila')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawBody = await request.arrayBuffer()

        const valid = await verifySignature(request, rawBody)
        if (!valid) {
          return new Response('Unauthorized', { status: 401 })
        }

        const text = new TextDecoder().decode(rawBody)
        const email = JSON.parse(text) as OwlEmail

        console.log('emila webhook', {
          from: email.from,
          to: email.to,
          subject: email.subject,
          x: email.text,
        })

        // TODO: handle email

        return new Response('ok', { status: 200 })
      },
    },
  },
})

async function verifySignature(
  request: Request,
  body: ArrayBuffer,
): Promise<boolean> {
  const secret = process.env.OWL_WEBHOOK_SECRET
  console.log({ secret })
  if (!secret) return true // no secret configured, skip verification

  const signature = request.headers.get('x-signature')
  console.log({ signature })
  if (!signature) return false

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const mac = await crypto.subtle.sign('HMAC', key, body)
  const expected = btoa(String.fromCharCode(...new Uint8Array(mac)))

  console.log({ expected })
  return signature === expected
}

type OwlEmail = {
  from: string
  to: string
  subject: string
  text?: string
  html?: string
  headers?: Record<string, string>
  attachments?: Array<{
    filename: string
    contentType: string
    content: string
  }>
}
