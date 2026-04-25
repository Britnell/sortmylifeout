import { chat, toolDefinition } from '@tanstack/ai'
import { createOpenRouterText } from '@tanstack/ai-openrouter'
import { z } from 'zod'
import { getDb } from '@/lib/db'

export const MODEL = 'deepseek/deepseek-v3.2'

export function getAdapter() {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not configured')
  return createOpenRouterText(MODEL, apiKey)
}

export const SYSTEM_PROMPT = ``

// --- Tools ---

const sqlQueryDef = toolDefinition({
  name: 'sql_query',
  description:
    'Execute a read-only SQL SELECT query against the application database',
  inputSchema: z.object({
    query: z.string().meta({ description: 'The SQL SELECT query to execute' }),
  }),
  outputSchema: z.object({
    rows: z.array(z.record(z.unknown())),
    rowCount: z.number(),
  }),
})

export const sqlQuery = sqlQueryDef.server(async ({ query }) => {
  const trimmed = query.trim().toLowerCase()
  if (!trimmed.startsWith('select')) {
    throw new Error('Only SELECT queries are permitted')
  }
  const db = getDb()
  const result = await db.executeQuery(db.raw(query).compile(db as never))
  const rows = (result.rows as Array<Record<string, unknown>>) ?? []
  return { rows, rowCount: rows.length }
})

export const serverTools = [sqlQuery]

export function createChatStream(messages: unknown[], conversationId?: string) {
  return chat({
    adapter: getAdapter(),
    systemPrompts: [SYSTEM_PROMPT],
    messages: messages as never,
    conversationId,
    tools: serverTools,
  })
}
