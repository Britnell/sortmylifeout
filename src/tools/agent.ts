import { waitUntil } from 'cloudflare:workers'
import { chat } from '@tanstack/ai'
import { getAdapter, SYSTEM_PROMPT } from '@/tools/ai'
import { createSearchEventsTool } from '@/tools/searchEventsTool'
import { createCreateEventTool } from '@/tools/createEventTool'
import { createUpdateEventTool } from '@/tools/updateEventTool'

export function agentMessage(messages: string[], userId: string) {
  waitUntil(
    chat({
      adapter: getAdapter(),
      systemPrompts: [SYSTEM_PROMPT(userId)],
      messages: messages.map((content) => ({ role: 'user', content })),
      stream: false,
      tools: [
        createSearchEventsTool(userId),
        createCreateEventTool(userId),
        createUpdateEventTool(userId),
      ],
    }),
  )
}
