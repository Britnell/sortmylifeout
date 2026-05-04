import { toolDefinition } from '@tanstack/ai'
import { db } from '@/lib/db'
import { dateDescription } from './dateUtils'

const itemSchema = {
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
}

export function createUpdateEventTool(userId: string) {
  return toolDefinition({
    name: 'update_event',
    description:
      'Update fields on one or more existing calendar rows. Only provided fields are changed. Pass an array — use a single-element array to update just one.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        items: {
          type: 'array',
          description: 'Array of rows to update. Each must include an id.',
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
        id: number
        type?: string
        title?: string
        detail?: string
        begin?: string
        end?: string
        completed?: boolean
      }>
    }

    await Promise.all(
      items.map(({ id, type, title, detail, begin, end, completed }) => {
        const updates: Record<string, unknown> = {}
        if (type != null) updates.type = type
        if (title != null) updates.title = title
        if (detail != null) updates.detail = detail
        if (end != null) updates.end = end
        if (completed != null) updates.completed = completed ? 1 : 0
        if (begin != null) {
          updates.begin = begin
          updates.all_day = begin.includes('T') ? 0 : 1
        }

        return db
          .updateTable('event')
          .set(updates)
          .where('id', '=', id)
          .where('user_id', '=', userId)
          .execute()
      }),
    )

    const ids = items.map((i) => i.id)
    return db
      .selectFrom('event')
      .selectAll()
      .where('id', 'in', ids)
      .where('user_id', '=', userId)
      .execute()
  })
}
