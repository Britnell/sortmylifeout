import { chat, toServerSentEventsResponse } from '@tanstack/ai'
import { createFileRoute } from '@tanstack/react-router'
import { createOpenRouterText } from '@tanstack/ai-openrouter'

export const Route = createFileRoute('/api/chat')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const apiKey = process.env.OPENROUTER_API_KEY
          if (!apiKey) {
            throw new Error('OPENROUTER_API_KEY not configured')
          }

          const { messages, conversationId } = await request.json()

          const stream = chat({
            adapter: createOpenRouterText('deepseek/deepseek-v3.2', apiKey),
            systemPrompts: [``],
            messages,
            conversationId,
          })

          return toServerSentEventsResponse(stream)
        } catch (error) {
          return new Response(
            JSON.stringify({
              error:
                error instanceof Error ? error.message : 'An error occurred',
            }),
            { status: 500, headers: { 'Content-Type': 'application/json' } },
          )
        }
      },
    },
  },
})
