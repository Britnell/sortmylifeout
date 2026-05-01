import { createFileRoute } from '@tanstack/react-router'
import { waitUntil } from 'cloudflare:workers'
import { replyToWhatsapp } from '@/tools/agent'
import { db } from '@/lib/db'

export const Route = createFileRoute('/api/wazap')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        // Meta calls GET to verify the webhook endpoint during setup
        const url = new URL(request.url)
        const mode = url.searchParams.get('hub.mode')
        const token = url.searchParams.get('hub.verify_token')
        const challenge = url.searchParams.get('hub.challenge')

        if (
          mode === 'subscribe' &&
          token === process.env.WHATSAPP_VERIFY_TOKEN
        ) {
          return new Response(challenge, { status: 200 })
        }

        return new Response('Forbidden', { status: 403 })
      },

      POST: async ({ request }) => {
        const rawBody = await request.text()

        const valid = await verifySignature(request, rawBody)

        console.log({ valid })
        if (!valid) {
          return new Response('Unauthorized', { status: 401 })
        }

        const payload = JSON.parse(rawBody) as WhatsAppWebhookPayload
        console.log(payload)

        if (payload.object !== 'whatsapp_business_account') {
          return new Response('ok', { status: 200 })
        }

        for (const entry of payload.entry) {
          for (const change of entry.changes) {
            if (change.field !== 'messages') continue
            const { messages, statuses, contacts } = change.value

            const textBodies = (messages ?? [])
              .filter((m) => m.type === 'text')
              .map(
                (m) =>
                  (m as Extract<WhatsAppBaseMessage, { type: 'text' }>).text
                    .body,
              )

            if (textBodies.length > 0) {
              const fromNumber = messages?.[0]?.from
              const user = await db
                .selectFrom('user')
                .select(['id'])
                .where('phone', '=', `+${fromNumber}`)
                .executeTakeFirst()

              if (!user || !fromNumber) {
                console.error(
                  `WhatsApp message from unknown number: ${fromNumber}`,
                )
              } else {
                const prom = replyToWhatsapp(textBodies, user.id, fromNumber)
                waitUntil(prom)
              }
            }

            // for (const status of statuses ?? []) {
            //   console.log('status update', status.id, status.status)
            // }
          }
        }

        return new Response('ok', { status: 200 })
      },
    },
  },
})

type WhatsAppMessage =
  | { type: 'text'; text: { body: string } }
  | {
      type: 'image'
      image: { id: string; mime_type: string; sha256: string; caption?: string }
    }
  | { type: 'audio'; audio: { id: string; mime_type: string } }
  | {
      type: 'document'
      document: {
        id: string
        filename: string
        mime_type: string
        caption?: string
      }
    }
  | {
      type: 'location'
      location: {
        latitude: number
        longitude: number
        name?: string
        address?: string
      }
    }
  | { type: 'reaction'; reaction: { message_id: string; emoji: string } }
  | { type: 'unsupported' }

type WhatsAppBaseMessage = {
  id: string
  from: string
  timestamp: string
  context?: { from: string; id: string }
} & WhatsAppMessage

type WhatsAppWebhookPayload = {
  object: 'whatsapp_business_account'
  entry: Array<{
    id: string
    changes: Array<{
      field: 'messages'
      value: {
        messaging_product: 'whatsapp'
        metadata: { display_phone_number: string; phone_number_id: string }
        contacts?: Array<{ profile: { name: string }; wa_id: string }>
        messages?: WhatsAppBaseMessage[]
        statuses?: Array<{
          id: string
          status: 'sent' | 'delivered' | 'read' | 'failed'
          timestamp: string
          recipient_id: string
        }>
      }
    }>
  }>
}

async function verifySignature(
  request: Request,
  rawBody: string,
): Promise<boolean> {
  const appSecret = process.env.FB_APP_SECRET
  if (!appSecret) return false

  const signature = request.headers.get('x-hub-signature-256')
  if (!signature) return false

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(appSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const mac = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(rawBody),
  )
  const expected =
    'sha256=' +
    Array.from(new Uint8Array(mac))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')

  return signature === expected
}
