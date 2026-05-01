import { toolDefinition } from '@tanstack/ai'
import { db } from '@/lib/db'
import { dateDescription } from './dateUtils'

export function createUpdateEventTool(userId: string) {
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
      updates.begin = begin
      updates.all_day = begin.includes('T') ? 0 : 1
    }

    await db
      .updateTable('event')
      .set(updates)
      .where('id', '=', id)
      .where('user_id', '=', userId)
      .execute()

    const row = await db
      .selectFrom('event')
      .selectAll()
      .where('id', '=', id)
      .where('user_id', '=', userId)
      .executeTakeFirstOrThrow()
    return row
  })
}
