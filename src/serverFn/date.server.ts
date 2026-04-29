import * as v from 'valibot'
import { getDb } from '../lib/db'

const EVENT_TYPES = ['event', 'todo', 'shopping'] as const

// YYYY-MM-DD or YYYY-MM-DDTHH:MM
const DateString = v.pipe(
  v.string(),
  v.regex(
    /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/,
    "Date must be 'YYYY-MM-DD' (all-day) or 'YYYY-MM-DDTHH:MM' (timed). Example: '2025-06-15' or '2025-06-15T09:30'",
  ),
)

function formatIssues(issues: v.BaseIssue<unknown>[]): string {
  return issues
    .map(
      (i) => `${i.path?.map((p) => p.key).join('.') ?? 'input'}: ${i.message}`,
    )
    .join('; ')
}

const UpdateEventSchema = v.object({
  date: v.pipe(
    v.string(),
    v.regex(/^\d{4}-\d{2}-\d{2}$/, "date must be 'YYYY-MM-DD'"),
  ),
  time: v.optional(
    v.pipe(v.string(), v.regex(/^\d{2}:\d{2}$/, "time must be 'HH:MM'")),
  ),
  allDay: v.boolean(),
  title: v.pipe(v.string(), v.minLength(1, 'title must not be empty')),
  detail: v.optional(v.string()),
  type: v.optional(
    v.picklist(EVENT_TYPES, `type must be one of: ${EVENT_TYPES.join(', ')}`),
  ),
  end: v.optional(v.nullable(DateString)),
  completed: v.optional(v.boolean()),
})
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
  const parsed = v.safeParse(UpdateEventSchema, data)
  if (!parsed.success)
    throw new Error(
      `updateEvent validation failed — ${formatIssues(parsed.issues)}`,
    )

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
      ...(data.completed !== undefined
        ? { completed: data.completed ? 1 : 0 }
        : {}),
    })
    .where('id', '=', id)
    .where('user_id', '=', userId)
    .execute()
}

export async function deleteEvent(userId: string, id: number) {
  if (typeof id !== 'number' || !Number.isInteger(id) || id <= 0)
    throw new Error(
      `deleteEvent validation failed — id must be a positive integer, got: ${id}`,
    )
  const db = getDb()
  await db
    .deleteFrom('event')
    .where('id', '=', id)
    .where('user_id', '=', userId)
    .execute()
}

const SearchFiltersSchema = v.object({
  type: v.optional(
    v.picklist(EVENT_TYPES, `type must be one of: ${EVENT_TYPES.join(', ')}`),
  ),
  completed: v.optional(v.boolean()),
  date_from: v.optional(DateString),
  date_to: v.optional(DateString),
})

export async function searchEvents(
  userId: string,
  filters: {
    type?: string
    completed?: boolean
    date_from?: string
    date_to?: string
  },
) {
  const parsed = v.safeParse(SearchFiltersSchema, filters)
  if (!parsed.success)
    throw new Error(
      `searchEvents validation failed — ${formatIssues(parsed.issues)}`,
    )

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

const CreateEventSchema = v.object({
  date: v.optional(
    v.pipe(
      v.string(),
      v.regex(/^\d{4}-\d{2}-\d{2}$/, "date must be 'YYYY-MM-DD'"),
    ),
  ),
  time: v.optional(
    v.pipe(v.string(), v.regex(/^\d{2}:\d{2}$/, "time must be 'HH:MM'")),
  ),
  allDay: v.boolean(),
  end: v.optional(v.nullable(DateString)),
  title: v.pipe(v.string(), v.minLength(1, 'title must not be empty')),
  detail: v.optional(v.string()),
  type: v.optional(
    v.picklist(EVENT_TYPES, `type must be one of: ${EVENT_TYPES.join(', ')}`),
  ),
  completed: v.optional(v.boolean()),
})

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
  const parsed = v.safeParse(CreateEventSchema, data)
  if (!parsed.success)
    throw new Error(
      `createEvent validation failed — ${formatIssues(parsed.issues)}`,
    )

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
