import { toolDefinition } from '@tanstack/ai'
import { searchEvents } from '@/serverFn/date.server'

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
    const rows = await searchEvents(userId, args as { type?: string; completed?: boolean; date_from?: string; date_to?: string })
    return { rows, rowCount: rows.length }
  })
}
