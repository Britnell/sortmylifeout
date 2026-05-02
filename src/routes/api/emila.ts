import { receiveEmail } from '#/tools/owl'
import { createFileRoute } from '@tanstack/react-router'
import { waitUntil } from 'cloudflare:workers'

export const Route = createFileRoute('/api/emila')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const rawBody = await request.arrayBuffer()

          const valid = await verifySignature(request, rawBody)
          if (!valid) throw new Error('unauthorized')

          const contentType = request.headers.get('content-type') ?? ''
          const response = new Response(rawBody, {
            headers: { 'content-type': contentType },
          })
          const formData = await response.formData()
          const emailJson = formData.get('email') as string
          const email = JSON.parse(emailJson) as OwlEmail

          const ip = {
            from: email.from.address,
            text: email.text,
          }
          if (!ip.text) throw new Error('empty')

          const prom = receiveEmail(ip.from, ip.text)
          waitUntil(prom)
          return new Response('ok', { status: 200 })
        } catch (e) {
          console.log(e.message)
          return new Response('nope', { status: 500 })
        }
      },
    },
  },
})

async function verifySignature(
  request: Request,
  body: ArrayBuffer,
): Promise<boolean> {
  const secret = process.env.OWL_WEBHOOK_SECRET
  if (!secret) return true
  const signature = request.headers.get('x-signature')
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
  return signature === expected
}

type OwlAddr = {
  name?: string
  address: string
}

type OwlEmail = {
  from: OwlAddr
  to: OwlAddr[]
  date: string
  subject: string
  messageId: string
  text?: string
  html?: string
  // headers?: Record<string, string>
  attachments?: Array<{
    filename: string
    contentType: string
    content: string
  }>
  originalFrom: OwlAddr
  originalTo: OwlAddr[]
}
