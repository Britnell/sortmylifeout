import { toolDefinition } from '@tanstack/ai'
import { getDb } from '@/lib/db'

const db = getDb()

export function createSearchEventsTool(userId: string) {
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
