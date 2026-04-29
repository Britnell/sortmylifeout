import { toolDefinition } from '@tanstack/ai'
import { createEvent } from '@/serverFn/date.server'
import { parseIsoDate, dateDescription } from './dateUtils'

export function createCreateEventTool(userId: string) {
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
          description: 'Required for todo/shopping (default false). Omit for events.',
        },
      },
      required: ['type', 'title'],
    },
    outputSchema: {
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

    const { id } = await createEvent(userId, {
      type,
      title,
      detail,
      date: parsed.date,
      time: parsed.time,
      allDay: parsed.allDay,
      end,
      completed: completed ?? false,
    })

    const { getDb } = await import('@/lib/db')
    const row = await getDb()
      .selectFrom('event')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirstOrThrow()
    return row
  })
}
