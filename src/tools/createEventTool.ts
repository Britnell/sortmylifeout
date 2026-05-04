import { toolDefinition } from '@tanstack/ai'
import { createEvent } from '@/serverFn/date.server'
import { db } from '@/lib/db'
import { dateDescription } from './dateUtils'

const itemSchema = {
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
      description: 'Required for todo/shopping (default false). Omit for events.',
    },
  },
  required: ['type', 'title'],
}

export function createCreateEventTool(userId: string) {
  return toolDefinition({
    name: 'create_event',
    description:
      'Insert one or more calendar rows (events, todos, or shopping items). Pass an array — use a single-element array to create just one.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        items: {
          type: 'array',
          description: 'Array of rows to create. Must contain at least one item.',
          items: itemSchema,
        },
      },
      required: ['items'],
    },
    outputSchema: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        properties: {
          id: { type: 'number' },
          user_id: { type: 'string' },
          type: { type: 'string' },
          title: { type: 'string' },
          detail: { type: 'string' },
          begin: { type: 'string' },
          end: { type: 'string' },
          all_day: { type: 'number' },
          completed: { type: 'number' },
        },
        required: ['id'],
      },
    },
  }).server(async (args) => {
    const { items } = args as {
      items: Array<{
        type: string
        title: string
        detail?: string
        begin?: string
        end?: string
        completed?: boolean
      }>
    }

    const ids = await Promise.all(
      items.map(({ type, title, detail, begin, end, completed }) =>
        createEvent(userId, {
          type,
          title,
          detail,
          begin,
          allDay: !begin || !begin.includes('T'),
          end,
          completed: completed ?? false,
        }).then((r) => r.id),
      ),
    )

    return db
      .selectFrom('event')
      .selectAll()
      .where('id', 'in', ids)
      .execute()
  })
}
