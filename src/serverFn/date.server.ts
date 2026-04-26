import { getDb } from '../lib/db'

export async function updateEvent(
  userId: string,
  id: number,
  data: {
    date: string
    time?: string
    allDay: boolean
    title: string
    detail?: string
    type?: string
    end?: string
    completed?: boolean
  },
) {
  const begin = data.allDay ? data.date : `${data.date}T${data.time}`
  const db = getDb()
  await db
    .updateTable('event')
    .set({
      all_day: data.allDay ? 1 : 0,
      begin,
      title: data.title,
      detail: data.detail || null,
      ...(data.type ? { type: data.type } : {}),
      ...(data.end !== undefined ? { end: data.end || null } : {}),
      ...(data.completed !== undefined ? { completed: data.completed ? 1 : 0 } : {}),
    })
    .where('id', '=', id)
    .where('user_id', '=', userId)
    .execute()
}

export async function deleteEvent(userId: string, id: number) {
  const db = getDb()
  await db
    .deleteFrom('event')
    .where('id', '=', id)
    .where('user_id', '=', userId)
    .execute()
}

export async function searchEvents(
  userId: string,
  filters: {
    type?: string
    completed?: boolean
    date_from?: string
    date_to?: string
  },
) {
  const db = getDb()
  let query = db.selectFrom('event').selectAll().where('user_id', '=', userId)

  if (filters.type != null) query = query.where('type', '=', filters.type)
  if (filters.completed != null)
    query = query.where('completed', '=', filters.completed ? 1 : 0)

  if (filters.date_from != null && filters.date_to != null) {
    query = query
      .where('begin', '<=', filters.date_to + 'T99:99')
      .where((eb) =>
        eb.or([
          eb('end', '>=', filters.date_from!),
          eb('begin', '>=', filters.date_from!),
        ]),
      )
  } else if (filters.date_from != null) {
    query = query
      .where('begin', '>=', filters.date_from)
      .where('begin', '<=', filters.date_from + 'T99:99')
  }

  return query.orderBy('begin', 'asc').execute()
}

export async function createEvent(
  userId: string,
  data: {
    date?: string
    time?: string
    allDay: boolean
    end?: string
    title: string
    detail?: string
    type?: string
    completed?: boolean
  },
) {
  const begin = data.date
    ? data.allDay
      ? data.date
      : `${data.date}T${data.time}`
    : null
  const db = getDb()
  const result = await db
    .insertInto('event')
    .values({
      user_id: userId,
      type: (data.type as 'event' | 'todo' | 'reminder') || 'event',
      all_day: data.allDay ? 1 : 0,
      begin: begin,
      end: data.end || null,
      title: data.title,
      detail: data.detail || null,
      completed: data.completed ? 1 : 0,
    })
    .execute()

  return { id: Number(result[0].insertId) }
}
