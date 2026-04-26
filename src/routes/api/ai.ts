import { chat, toolDefinition } from '@tanstack/ai'
import { createOpenRouterText } from '@tanstack/ai-openrouter'
import { sql } from 'kysely'
import { getDb } from '@/lib/db'

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
We track events, todos and notes.
Current date/time (UTC): ${d.toDateString()} ${d.toTimeString()}
"This week" means the next 7 days / remainder of the current calendar week.
Todos are events with type='todo' and no date set.
Current user_id: ${userId} — always filter queries and set this on new events.

Use query_events to look things up.
Use upsert_event to create or update an event (omit id to create, include id to update).
Use set_event_done to mark a todo as done or not done.
`
}

const EVENT_SCHEMA = `
  CREATE TABLE IF NOT EXISTS event (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK(type IN ('event', 'todo', 'reminder')),
    title TEXT NOT NULL,
    detail TEXT,
    completed INTEGER DEFAULT 0,
    begin TEXT, -- date(time)
    end TEXT,   -- date(time)
    -- both begin + end : 'YYYY-MM-DD' when all_day=1,
    -- 'YYYY-MM-DDTHH:MM' (local time, no TZ suffix) when all_day=0
    all_day INTEGER NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );
`

const sqlPrompt = `Run a read-only SELECT query against the database.
Database: Cloudflare D1 (SQLite syntax).
Schema:${EVENT_SCHEMA}`

const upsertPrompt = `Create or update a calendar event, todo, or note.
Omit 'id' to create. Include 'id' to update — only provided fields are changed.
type: 'event' | 'todo' | 'note'.
date / end: ISO-8601. Omit date for a todo with no scheduled date.
done: 1 = complete, 0 = incomplete.`

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

function q(s: string) {
  return `'${s.replace(/'/g, "''")}'`
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
        type: { type: 'string', enum: ['event', 'todo', 'note'] },
        title: { type: 'string' },
        detail: { type: 'string' },
        date: { type: 'string', description: 'ISO-8601 start date/time' },
        end: { type: 'string', description: 'ISO-8601 end date/time' },
        repeating: { type: 'string' },
        done: { type: 'number', enum: [0, 1] },
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
    const { id, type, title, detail, date, end, repeating, done } = args as {
      id?: number
      type?: string
      title?: string
      detail?: string
      date?: string
      end?: string
      repeating?: string
      done?: number
    }

    const now = Math.floor(Date.now() / 1000)

    if (id != null) {
      const sets: string[] = []
      if (type != null) sets.push(`type = ${q(type)}`)
      if (title != null) sets.push(`title = ${q(title)}`)
      if (detail != null) sets.push(`detail = ${q(detail)}`)
      if (date != null) sets.push(`date = ${q(date)}`)
      if (end != null) sets.push(`end = ${q(end)}`)
      if (repeating != null) sets.push(`repeating = ${q(repeating)}`)
      if (done != null) sets.push(`done = ${done}`)
      sets.push(`updated_at = ${now}`)

      await db.executeQuery(
        sql
          .raw(`UPDATE event SET ${sets.join(', ')} WHERE id = ${id}`)
          .compile(db as never),
      )
      return { id, created: false }
    } else {
      if (!type || !title)
        throw new Error('type and title are required when creating an event')

      const cols = ['user_id', 'type', 'title', 'created_at', 'updated_at']
      const vals = [q(userId), q(type), q(title), String(now), String(now)]

      if (detail != null) {
        cols.push('detail')
        vals.push(q(detail))
      }
      if (date != null) {
        cols.push('date')
        vals.push(q(date))
      }
      if (end != null) {
        cols.push('end')
        vals.push(q(end))
      }
      if (repeating != null) {
        cols.push('repeating')
        vals.push(q(repeating))
      }
      if (done != null) {
        cols.push('done')
        vals.push(String(done))
      }

      const result = await db.executeQuery(
        sql
          .raw(
            `INSERT INTO event (${cols.join(', ')}) VALUES (${vals.join(', ')})`,
          )
          .compile(db as never),
      )
      const newId = (result as unknown as { insertId?: number | bigint })
        ?.insertId
      return { id: Number(newId ?? 0), created: true }
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
