import { createFileRoute } from '@tanstack/react-router'

const message = `hey, give me a briefing for today?`

export const Route = createFileRoute('/api/test')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        console.log(message)
        return new Response('ok', {
          status: 200,
        })
      },
    },
  },
})
