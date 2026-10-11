import { useQueryClient } from '@tanstack/react-query'

type QueryClient = ReturnType<typeof useQueryClient>
import type { EventRow } from '../components/EventCard'

export const EVENT_MUTATING_TOOLS = new Set(['create_event', 'update_event'])

function eventDate(ev: EventRow): string | null {
  return ev.begin ? ev.begin.split('T')[0] : null
}

function inRange(ev: EventRow, from?: string, to?: string): boolean {
  const d = eventDate(ev)
  if (!d) return false
  // overlap of [begin, end ?? begin] with [from, to] — matches the server's
  // range query, so multi-day events beginning before the range are kept
  const start = d
  const end = ev.end ? ev.end.split('T')[0] : d
  if (from && end < from) return false
  if (to && start > to) return false
  return true
}

/**
 * Merge server-confirmed events into all cached event queries:
 * - ['searchEventsFn', date_from, date_to] (calendar views) — only kept if the
 *   event's begin date falls inside the range; events that moved out are dropped
 * - [type, 'unscheduled' | 'overdue' | 'done'] (todo/shopping lists)
 */
export function updateQueryCachesWithEvents(
  queryClient: QueryClient,
  events: EventRow[],
) {
  const eventMap = new Map(events.map((e) => [e.id, e]))
  const deletedOutsiders = (data: EventRow[], from?: string, to?: string) =>
    data.filter(
      (e) =>
        !eventMap.has(e.id) || inRange(eventMap.get(e.id)!, from, to),
    )

  queryClient
    .getQueriesData({ queryKey: ['searchEventsFn'] })
    .forEach(([queryKey, data]) => {
      if (!Array.isArray(data)) return
      const [, from, to] = queryKey as [string, string?, string?]

      const updated = deletedOutsiders(data as EventRow[], from, to).map(
        (e) => eventMap.get(e.id) || e,
      )

      events.forEach((e) => {
        if (inRange(e, from, to) && !updated.some((u) => u.id === e.id)) {
          updated.push(e)
        }
      })

      updated.sort((a, b) => (a.begin ?? '').localeCompare(b.begin ?? ''))
      queryClient.setQueryData(queryKey, updated)
    })

  queryClient
    .getQueriesData({
      predicate: (query) => {
        const key = query.queryKey
        return (
          Array.isArray(key) &&
          (key[1] === 'unscheduled' ||
            key[1] === 'overdue' ||
            key[1] === 'done' ||
            key[1] === 'upcoming')
        )
      },
    })
    .forEach(([queryKey, data]) => {
      if (!Array.isArray(data)) return
      const type = queryKey[0] as string

      const updated = (data as EventRow[])
        .map((e) => eventMap.get(e.id) || e)
        .filter((e) => {
          const next = eventMap.get(e.id)
          return !next || next.type === type
        })

      events.forEach((e) => {
        if (
          e.type === type &&
          !updated.some((u) => u.id === e.id)
        ) {
          updated.push(e)
        }
      })
      updated.sort((a, b) => (a.begin ?? '').localeCompare(b.begin ?? ''))

      queryClient.setQueryData(queryKey, updated)
    })
}

/**
 * Build an EventRow from the mutation vars the panel sends,
 * merged with the server-assigned id.
 */
export function createdEventRow(
  id: number,
  vars: {
    begin?: string
    allDay?: boolean
    end?: string | null
    title?: string
    detail?: string
    type?: string
    completed?: boolean | string
  },
): EventRow {
  return {
    id,
    type: (vars.type ?? 'event') as EventRow['type'],
    title: vars.title ?? null,
    detail: vars.detail ?? null,
    begin: vars.begin ?? null,
    end: vars.end ?? null,
    all_day: vars.allDay ? 1 : 0,
    completed:
      vars.completed !== undefined && vars.completed
        ? String(vars.completed)
        : null,
  }
}

/** Merge panel update vars over the pre-edit event row. */
export function updatedEventRow(
  base: {
    id: number
    type: string
    title?: string | null
    detail?: string | null
    begin?: string | null
    end?: string | null
    completed?: string | null
    all_day?: number
  },
  vars: Parameters<typeof createdEventRow>[1],
): EventRow {
  const b = base as unknown as EventRow
  return {
    ...b,
    type: (vars.type ?? base.type) as EventRow['type'],
    title: vars.title ?? b.title,
    detail: vars.detail ?? b.detail,
    begin: vars.begin ?? b.begin,
    end: vars.end !== undefined ? vars.end : b.end,
    all_day: vars.allDay !== undefined ? (vars.allDay ? 1 : 0) : (b.all_day as number | undefined),
    completed:
      vars.completed !== undefined
        ? vars.completed
          ? String(vars.completed)
          : null
        : b.completed,
  }
}

/**
 * Remove events (by id) from all cached event queries — after a confirmed delete.
 */
export function removeEventsFromQueryCaches(
  queryClient: QueryClient,
  ids: number[],
) {
  const idSet = new Set(ids)
  queryClient.getQueryCache().getAll().forEach((query) => {
    const queryKey = query.queryKey
    const data = query.state.data
    if (!Array.isArray(data)) return
    const arr = data as EventRow[]
    if (!arr.length || typeof arr[0]?.id !== 'number') return
    if (!arr.some((e) => idSet.has(e.id))) return
    queryClient.setQueryData(
      queryKey,
      arr.filter((e) => !idSet.has(e.id)),
    )
  })
}
