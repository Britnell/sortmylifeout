import { useQueryClient } from '@tanstack/react-query'
import type { EventRow } from '../components/EventCard'

export const EVENT_MUTATING_TOOLS = new Set(['create_event', 'update_event'])

export function updateQueryCachesWithEvents(
	queryClient: ReturnType<typeof useQueryClient>,
	events: EventRow[],
) {
	const eventMap = new Map(events.map((e) => [e.id, e]))

	queryClient
		.getQueriesData({ queryKey: ['searchEventsFn'] })
		.forEach(([queryKey, data]) => {
			if (Array.isArray(data)) {
				const eventIds = new Set((data as EventRow[]).map((e) => e.id))
				let updated = (data as EventRow[]).map((e) => eventMap.get(e.id) || e)

				events.forEach((e) => {
					if (!eventIds.has(e.id)) {
						updated.push(e)
					}
				})

				updated = updated.sort((a, b) =>
					(a.begin ?? '').localeCompare(b.begin ?? ''),
				)
				queryClient.setQueryData(queryKey, updated)
			}
		})

	queryClient
		.getQueriesData({
			predicate: (query) => {
				const key = query.queryKey
				return (
					Array.isArray(key) &&
					(key[1] === 'unscheduled' ||
						key[1] === 'overdue' ||
						key[1] === 'done')
				)
			},
		})
		.forEach(([queryKey, data]) => {
			if (Array.isArray(data)) {
				const eventIds = new Set((data as EventRow[]).map((e) => e.id))
				let updated = (data as EventRow[]).map((e) => eventMap.get(e.id) || e)

				events.forEach((e) => {
					if (!eventIds.has(e.id) && e.type === queryKey[0]) {
						updated.push(e)
					}
				})

				queryClient.setQueryData(queryKey, updated)
			}
		})
}
