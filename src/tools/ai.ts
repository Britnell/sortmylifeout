import { chat } from '@tanstack/ai'
import { createOpenRouterText } from '@tanstack/ai-openrouter'
import { createSearchEventsTool } from '@/tools/searchEventsTool'
import { createCreateEventTool } from '@/tools/createEventTool'
import { createUpdateEventTool } from '@/tools/updateEventTool'
// import { createWorkersAiChat } from '@cloudflare/tanstack-ai'
// import { env } from 'cloudflare:workers'

// -- Providers --
const models = {
  cloudflare: {
    gemma: '@cf/google/gemma-4-26b-a4b-it',
  },
  openrouter: {
    deepseek: 'deepseek/deepseek-v3.2',
    gemma26: 'google/gemma-4-26b-a4b-it',
    gemma31: 'google/gemma-4-31b-it',
  },
} as const

export const MODEL = models.openrouter.gemma31

function getAdapter() {
  return createOpenRouterText(
    models.openrouter.gemma31,
    process.env.OPENROUTER_API_KEY!,
  )
  // return createWorkersAiChat(MODEL, { binding: env.AI })
}

export const SYSTEM_PROMPT = (userId: string) => {
  const d = new Date()
  return `You are my personal assistant - help me sort my life out. You have full access to my calendar sql table

# 'event' table
We track events, todos and shopping list in one table 'type' col
all items have a 'title' + optional 'detail' col for extra info, address, links etc.

## type='event'
- classic appointment / calendar entry
- start & end required - both as date or datetime
- all_day boolean col to indicate if date or datetime

## type='todo'
- 'completed' col required, boolean 0/1
- 'begin' date optional
  - no begin date: standard todo list of outstanding items
  - 'begin' date/datetime: when the todo is due by / will be worked on / I want to be reminded of it


## type='shopping'
- same as todo: 'completed' col required & 'begin' date optional


### Example

"a dentist appointment on Wednesday at 4pm"
{
  type: 'event',
  title: 'Dentist appointment',
  begin: '2024-04-29T16:00',
  end: '2024-04-29T:17:00',
  all_day: 0
}

"meeting my friend George this Sunday"
{
  type: 'event',
  title: 'George',
  begin: '2024-04-26',
  end: '2024-04-26',
  all_day: 1
}

"Remind me to water the flowers this weekend" (Tu 21.04.)
{
  type: 'todo',
  title: 'water flowers',
  begin: '2024-04-25'
}

"Remind me to buy eggs when I'm at the shop"
{
  type: 'shopping',
  title: 'eggs'
}

## Information
Today's date: ${d.toDateString()} ${d.toTimeString()} (UTC)
'week' refers to a calendar week from Mo - Su
Current user_id: ${userId} — always filter queries for the user_id and set this on new events.
`
}

export function createChatStream(
  messages: unknown[],
  userId: string,
  conversationId?: string,
) {
  return chat({
    adapter: getAdapter(),
    systemPrompts: [SYSTEM_PROMPT(userId)],
    messages: messages as never,
    conversationId,
    tools: [
      createSearchEventsTool(userId),
      createCreateEventTool(userId),
      createUpdateEventTool(userId),
    ],
  })
}
