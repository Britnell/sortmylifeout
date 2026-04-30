import { createFileRoute } from '@tanstack/react-router'

type WhatsAppMessage =
  | { type: 'text'; text: { body: string } }
  | { type: 'image'; image: { id: string; mime_type: string; sha256: string; caption?: string } }
  | { type: 'audio'; audio: { id: string; mime_type: string } }
  | { type: 'document'; document: { id: string; filename: string; mime_type: string; caption?: string } }
  | { type: 'location'; location: { latitude: number; longitude: number; name?: string; address?: string } }
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


export const Route = createFileRoute('/api/wazap')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.json()

        return new Response('ok', { status: 200 })
      },
      GET: async ({ request }) => {
        console.log(request)
        return new Response('ok', { status: 200 })
      },
    },
  },
})
