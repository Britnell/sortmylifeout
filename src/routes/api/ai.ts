import { chat, toolDefinition } from '@tanstack/ai'
import { createOpenRouterText } from '@tanstack/ai-openrouter'
import { sql } from 'kysely'
import { getDb } from '@/lib/db'

export const MODEL = 'deepseek/deepseek-v3.2'

export function getAdapter() {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not configured')
  return createOpenRouterText(MODEL, apiKey)
}

export const SYSTEM_PROMPT = ``

// --- Tools ---

const ALLOWED_STATEMENT_TYPES = /^\s*(select|insert)\s/i
const FORBIDDEN_KEYWORDS =
  /\b(drop|delete|truncate|alter|create|replace|update|attach|detach|pragma|vacuum|reindex)\b/i

function stripStringLiterals(sql: string): string {
  // Replace single-quoted strings (handling escaped quotes via '')
  return sql.replace(/'(?:[^']|'')*'/g, "''")
}

function validateSql(query: string): void {
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

function getSqlToolDescription() {
  const now = new Date().toISOString()
  return `Execute a SQL SELECT or INSERT query against the application database.

Database: Cloudflare D1 (SQLite-compatible). Use SQLite syntax only.
Current date/time (UTC): ${now}

Schema:
  event (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL -- 'event' | 'todo' | 'note'
    date TEXT,         -- ISO date string, nullable
    end TEXT,          -- ISO date string, nullable
    title TEXT NOT NULL,
    detail TEXT,
    repeating TEXT,
    done INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL, -- unix epoch
    updated_at INTEGER NOT NULL  -- unix epoch
  )`
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
    systemPrompts: [SYSTEM_PROMPT],
    messages: messages as never,
    conversationId,
    tools: [createSqlQueryTool()],
  })
}
