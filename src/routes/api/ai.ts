import { chat, toolDefinition } from '@tanstack/ai'
import { createOpenRouterText } from '@tanstack/ai-openrouter'
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

// --- search tool (read-only, safe) ---

function createSearchEventsTool(userId: string) {
  const db = getDb()
  return toolDefinition({
    name: 'search_events',
    description: `Search your calendar events/todos/shopping items. All filters are optional and combined with AND. Results are always sorted by begin date.`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        type: {
          type: 'string',
          enum: ['event', 'todo', 'shopping'],
          description: 'Filter by item type',
        },
        completed: {
          type: 'boolean',
          description: 'Filter todos/shopping by completed status',
        },
        date_from: {
          type: 'string',
          description:
            'Search window start date YYYY-MM-DD. Returns all items whose begin or end falls within [date_from, date_to].',
        },
        date_to: {
          type: 'string',
          description:
            'Search window end date YYYY-MM-DD. Set same as date_from to search a single day.',
        },
      },
      required: [],
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
    const { type, completed, date_from, date_to } = args as {
      type?: string
      completed?: boolean
      date_from?: string
      date_to?: string
    }

    let query = db.selectFrom('event').selectAll().where('user_id', '=', userId)

    if (type != null) query = query.where('type', '=', type)
    if (completed != null)
      query = query.where('completed', '=', completed ? 1 : 0)

    if (date_from != null && date_to != null) {
      // Items that overlap the search window:
      // begin <= date_to AND (end >= date_from OR begin >= date_from)
      query = query
        .where('begin', '<=', date_to + 'T99:99')
        .where((eb) =>
          eb.or([eb('end', '>=', date_from), eb('begin', '>=', date_from)]),
        )
    } else if (date_from != null) {
      query = query
        .where('begin', '>=', date_from)
        .where('begin', '<=', date_from + 'T99:99')
    }

    query = query.orderBy('begin', 'asc')

    const rows = await query.execute()
    return { rows, rowCount: rows.length }
  })
}

// --- create / update tools ---

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

const dateDescription = "'YYYY-MM-DD' (all-day) or 'YYYY-MM-DDTHH:MM' (timed, local time)"

function createCreateEventTool(userId: string) {
  return toolDefinition({
    name: 'create_event',
    description: 'Insert a new calendar row (event, todo, or shopping item).',
    inputSchema: {
      type: 'object' as const,
      properties: {
        type: {
          type: 'string',
          enum: ['event', 'todo', 'shopping'],
          description: 'Row type — required',
        },
        title: { type: 'string', description: 'Title — required' },
        detail: { type: 'string', description: 'Optional extra info' },
        begin: {
          type: 'string',
          description: `${dateDescription}. Required for type='event'. Optional for todo/shopping.`,
        },
        end: {
          type: 'string',
          description: `${dateDescription}. Required for type='event'.`,
        },
        completed: {
          type: 'boolean',
          description: "Required for todo/shopping (default false). Omit for events.",
        },
      },
      required: ['type', 'title'],
    },
    outputSchema: {
      type: 'object' as const,
      properties: { id: { type: 'number' } },
      required: ['id'],
    },
  }).server(async (args) => {
    const { type, title, detail, begin, end, completed } = args as {
      type: string
      title: string
      detail?: string
      begin?: string
      end?: string
      completed?: boolean
    }

    const parsed = begin
      ? parseIsoDate(begin)
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
    return { id: result.id }
  })
}

function createUpdateEventTool(userId: string) {
  const db = getDb()
  return toolDefinition({
    name: 'update_event',
    description: 'Update fields on an existing calendar row. Only provided fields are changed.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        id: { type: 'number', description: 'ID of the row to update — required' },
        type: { type: 'string', enum: ['event', 'todo', 'shopping'] },
        title: { type: 'string' },
        detail: { type: 'string' },
        begin: { type: 'string', description: dateDescription },
        end: { type: 'string', description: dateDescription },
        completed: { type: 'boolean' },
      },
      required: ['id'],
    },
    outputSchema: {
      type: 'object' as const,
      properties: { id: { type: 'number' } },
      required: ['id'],
    },
  }).server(async (args) => {
    const { id, type, title, detail, begin, end, completed } = args as {
      id: number
      type?: string
      title?: string
      detail?: string
      begin?: string
      end?: string
      completed?: boolean
    }

    const updates: Record<string, unknown> = {}
    if (type != null) updates.type = type
    if (title != null) updates.title = title
    if (detail != null) updates.detail = detail
    if (end != null) updates.end = end
    if (completed != null) updates.completed = completed ? 1 : 0
    if (begin != null) {
      const parsed = parseIsoDate(begin)
      updates.begin = parsed.allDay ? parsed.date : `${parsed.date}T${parsed.time}`
      updates.all_day = parsed.allDay ? 1 : 0
    }

    await db
      .updateTable('event')
      .set(updates)
      .where('id', '=', id)
      .where('user_id', '=', userId)
      .execute()
    return { id }
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
    tools: [createSearchEventsTool(userId), createCreateEventTool(userId), createUpdateEventTool(userId)],
  })
}
