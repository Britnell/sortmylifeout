import { chat, toolDefinition } from '@tanstack/ai'
import { createOpenRouterText } from '@tanstack/ai-openrouter'
import { sql } from 'kysely'
import { getDb } from '@/lib/db'
import { createEvent } from '@/serverFn/date.server'

const models = {
  deepseek: 'deepseek/deepseek-v3.2',
  gemma26: 'google/gemma-4-26b-a4b-it',
  gemma31: 'google/gemma-4-31b-it',
} as const

export const MODEL = models.gemma31

export function getAdapter() {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not configured')
  return createOpenRouterText(MODEL, apiKey)
}

function stripStringLiterals(query: string): string {
  return query.replace(/'(?:[^']|'')*'/g, "''")
}

function validateSelectOnly(query: string): void {
  if (!/^\s*select\s/i.test(query)) {
    throw new Error('Only SELECT queries are permitted')
  }
  const stripped = stripStringLiterals(query)
  const forbidden =
    /\b(drop|delete|truncate|alter|create|insert|replace|update|attach|detach|pragma|vacuum|reindex)\b/i
  const match = stripped.match(forbidden)
  if (match) {
    throw new Error(
      `Query contains forbidden keyword: ${match[0].toUpperCase()}`,
    )
  }
}

export const SYSTEM_PROMPT = (userId: string) => {
  const d = new Date()
  return `You are my personal assistant - help me sort my life out by handling my calendar.

'week' refers to a calendar week Mo - Su
We track events & todos in sql calendar which you have access to
all are are in 'events' table with different type

- event - classic appointment / calendar entry w a start & end date/datetime. optionally with time or as all day
- todo - type = 'todo' + 'completed' col. standard todo list by leaving date empty
- todo - 'begin' date to mark date and/or time i want to get this done or be reminded of it

Today: ${d.toDateString()} ${d.toTimeString()} (UTC)
Current user_id: ${userId} — always filter queries and set this on new events.
`
}

const EVENT_SCHEMA = `
CREATE TABLE IF NOT EXISTS event (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK(type IN ('event', 'todo')),
  title TEXT NOT NULL,
  detail TEXT,
  completed INTEGER DEFAULT 0,
  all_day INTEGER NOT NULL,
  begin TEXT, -- date/datetime
  end TEXT,   -- date/datetime
  -- both begin + end date :
  -- 'YYYY-MM-DD' : all_day=1,
  -- 'YYYY-MM-DDTHH:MM' (local time, no TZ suffix) : all_day=0
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
`

const sqlPrompt = `Run a read-only SELECT query against the database.
Database: Cloudflare D1 (SQLite syntax).
Schema:${EVENT_SCHEMA}`

const upsertPrompt = `Create or update a calendar event row.
Omit 'id' to create. Include 'id' to update — only provided fields are updated.`

// --- query tool (read-only) ---

function sqlQueryTool() {
  const db = getDb()
  return toolDefinition({
    name: 'query_events',
    description: sqlPrompt,
    inputSchema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'A SELECT statement' },
      },
      required: ['query'],
    },
    outputSchema: {
      type: 'object' as const,
      properties: {
        rows: { type: 'array', items: { type: 'object' } },
        rowCount: { type: 'number' },
      },
      required: ['rows', 'rowCount'],
    },
  }).server(async (args) => {
    const { query } = args as { query: string }
    validateSelectOnly(query)
    const result = await db.executeQuery(sql.raw(query).compile(db as never))
    const rows = (result.rows as Array<Record<string, unknown>>) ?? []
    return { rows, rowCount: rows.length }
  })
}

// --- upsert tool ---

function parseIsoDate(date: string): {
  date: string
  time?: string
  allDay: boolean
} {
  if (date.includes('T')) {
    const [d, time] = date.split('T')
    return { date: d, time, allDay: false }
  }
  return { date, allDay: true }
}

function createUpsertEventTool(userId: string) {
  const db = getDb()
  return toolDefinition({
    name: 'upsert_event',
    description: upsertPrompt,
    inputSchema: {
      type: 'object' as const,
      properties: {
        id: {
          type: 'number',
          description: 'Existing event id (omit to create)',
        },
        type: { type: 'string', enum: ['event', 'todo', 'reminder'] },
        title: { type: 'string' },
        detail: { type: 'string' },
        date: {
          type: 'string',
          description: "'YYYY-MM-DD' or 'YYYY-MM-DDTHH:MM' (local time)",
        },
        end: {
          type: 'string',
          description: "'YYYY-MM-DD' or 'YYYY-MM-DDTHH:MM' (local time)",
        },
        completed: { type: 'boolean' },
      },
      required: [],
    },
    outputSchema: {
      type: 'object' as const,
      properties: {
        id: { type: 'number' },
        created: { type: 'boolean' },
      },
      required: ['id', 'created'],
    },
  }).server(async (args) => {
    const { id, type, title, detail, date, end, completed } = args as {
      id?: number
      type?: string
      title?: string
      detail?: string
      date?: string
      end?: string
      completed?: boolean
    }

    if (id != null) {
      const updates: Record<string, unknown> = {}
      if (type != null) updates.type = type
      if (title != null) updates.title = title
      if (detail != null) updates.detail = detail
      if (end != null) updates.end = end
      if (completed != null) updates.completed = completed ? 1 : 0
      if (date != null) {
        const parsed = parseIsoDate(date)
        updates.begin = parsed.allDay
          ? parsed.date
          : `${parsed.date}T${parsed.time}`
        updates.all_day = parsed.allDay ? 1 : 0
      }

      await db
        .updateTable('event')
        .set(updates)
        .where('id', '=', id)
        .where('user_id', '=', userId)
        .execute()
      return { id, created: false }
    } else {
      if (!type || !title)
        throw new Error('type and title are required when creating an event')

      const parsed = date
        ? parseIsoDate(date)
        : { date: undefined, time: undefined, allDay: true }
      const result = await createEvent(userId, {
        type,
        title,
        detail,
        date: parsed.date,
        time: parsed.time,
        allDay: parsed.allDay,
        end,
        completed: completed ?? false,
      })
      return { id: result.id, created: true }
    }
  })
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
    tools: [sqlQueryTool(), createUpsertEventTool(userId)],
  })
}
