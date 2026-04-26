import { chat, toolDefinition } from '@tanstack/ai'
import { createOpenRouterText } from '@tanstack/ai-openrouter'
import { sql } from 'kysely'
import { getDb } from '@/lib/db'

/*
 tweak prompt
 send +-1w automatically always, so only sql for inserting & further queries / searches
 tweak sql schema for better names,
 define schema of different types + what date means in each case
 repeating?
 protect users table
 only allow select + separate tool for creating / updating?
 pass user_id
*/

/*
  todos - view + create in ui
*/

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

function stripStringLiterals(sql: string): string {
  // Replace single-quoted strings (handling escaped quotes via '')
  return sql.replace(/'(?:[^']|'')*'/g, "''")
}

function validateSql(query: string): void {
  const ALLOWED_STATEMENT_TYPES = /^\s*(select|insert)\s/i
  const FORBIDDEN_KEYWORDS =
    /\b(drop|delete|truncate|alter|create|replace|update|attach|detach|pragma|vacuum|reindex)\b/i

  if (!ALLOWED_STATEMENT_TYPES.test(query)) {
    throw new Error('Only SELECT and INSERT queries are permitted')
  }
  const stripped = stripStringLiterals(query)
  const match = stripped.match(FORBIDDEN_KEYWORDS)
  if (match) {
    throw new Error(
      `Query contains forbidden keyword: ${match[0].toUpperCase()}`,
    )
  }
}

export const SYSTEM_PROMPT = () => {
  const d = new Date()
  return `You are my personal assistant - help me sort my life out by handling my calendar
we are tracking events, todos and remindes / notes
Current date/time (UTC): ${d.toDateString()} ${d.toTimeString()}
When i say speak about this week in future terms,
i mean the next 7 days / remainder of the current calendar week

my todo list is events type='todo' with no date set
`
}

function getSqlToolDescription() {
  return `Execute a SQL SELECT or INSERT query against the application database.

Database: Cloudflare D1 - Use SQLite syntax only.

Schema:
-- App tables
  CREATE TABLE IF NOT EXISTS event (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK(type IN ('event', 'todo', 'note')),

    date TEXT,
    end TEXT,

    title TEXT NOT NULL,
    detail TEXT,
    repeating TEXT,
    done INTEGER DEFAULT 0,

    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
  );
`
}

const inputSchema = {
  type: 'object' as const,
  properties: {
    query: {
      type: 'string',
      description: 'The SQL SELECT or INSERT query to execute',
    },
  },
  required: ['query'],
}

const outputSchema = {
  type: 'object' as const,
  properties: {
    rows: { type: 'array', items: { type: 'object' } },
    rowCount: { type: 'number' },
  },
  required: ['rows', 'rowCount'],
}

function createSqlQueryTool() {
  const db = getDb()
  return toolDefinition({
    name: 'sql_query',
    description: getSqlToolDescription(),
    inputSchema,
    outputSchema,
  }).server(async (args) => {
    const { query } = args as { query: string }
    validateSql(query)
    const result = await db.executeQuery(sql.raw(query).compile(db as never))
    const rows = (result.rows as Array<Record<string, unknown>>) ?? []
    return { rows, rowCount: rows.length }
  })
}

export function createChatStream(messages: unknown[], conversationId?: string) {
  return chat({
    adapter: getAdapter(),
    systemPrompts: [SYSTEM_PROMPT()],
    messages: messages as never,
    conversationId,
    tools: [createSqlQueryTool()],
  })
}
