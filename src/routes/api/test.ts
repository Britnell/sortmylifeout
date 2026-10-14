import { createFileRoute } from '@tanstack/react-router'
import { getSessionUser } from '@/lib/auth'
import { sendWhatsAppMessage } from '@/lib/whatsapp'

export const Route = createFileRoute('/api/test')({
  server: {
    handlers: {
      GET: async () => {
        const user = await getSessionUser()
        if (!user)
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          })

        const whatsapp = await sendWhatsAppMessage(
          '447769317697',
          'Echoooo: test message from sortmylifeout',
        )

        return new Response(JSON.stringify({ whatsapp }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      },
    },
  },
})
