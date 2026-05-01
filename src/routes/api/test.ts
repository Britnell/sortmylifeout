import { chat } from '@tanstack/ai'
import { createFileRoute } from '@tanstack/react-router'
import { getSessionUser } from '@/lib/auth'
import { getAdapter, SYSTEM_PROMPT } from '@/tools/ai'
import { createSearchEventsTool } from '@/tools/searchEventsTool'
import { createCreateEventTool } from '@/tools/createEventTool'
import { createUpdateEventTool } from '@/tools/updateEventTool'

const message = `hey, give me a briefing for today?`

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

        const response = await chat({
          adapter: getAdapter(),
          systemPrompts: [SYSTEM_PROMPT(user.id)],
          messages: [{ role: 'user', content: message }],
          stream: false,
          tools: [
            createSearchEventsTool(user.id),
            createCreateEventTool(user.id),
            createUpdateEventTool(user.id),
          ],
        })

        return new Response(JSON.stringify({ response }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      },
    },
  },
})
