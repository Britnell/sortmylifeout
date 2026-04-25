import { chat, toServerSentEventsResponse } from '@tanstack/ai'
import { createFileRoute } from '@tanstack/react-router'
import { createOpenRouterText } from '@tanstack/ai-openrouter'

export const Route = createFileRoute('/api/chat')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // console.log(import.meta.env, process.env)
        const apiKey = process.env.OPENROUTER_API_KEY
        if (!apiKey) {
          return new Response(
            JSON.stringify({
              error: 'OPENROUTER_API_KEY not configured',
            }),
            {
              status: 500,
              headers: { 'Content-Type': 'application/json' },
            },
          )
        }

        const { messages, conversationId } = await request.json()

        try {
          const stream = chat({
            adapter: createOpenRouterText('deepseek/deepseek-v3.2', apiKey),
            messages,
            conversationId,
          })

          // Convert stream to HTTP response
          return toServerSentEventsResponse(stream)
        } catch (error) {
          return new Response(
            JSON.stringify({
              error:
                error instanceof Error ? error.message : 'An error occurred',
            }),
            {
              status: 500,
              headers: { 'Content-Type': 'application/json' },
            },
          )
        }
      },
    },
  },
})
