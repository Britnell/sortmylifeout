export type EventRow = {
	id: number
	type: 'event' | 'todo' | 'shopping'
	title?: string | null
	begin?: string | null
	end?: string | null
	completed?: number | null
	[key: string]: unknown
}

const TYPE_ICON: Record<string, string> = {
	event: '📅',
	todo: '☑',
	shopping: '🛒',
}

export function EventCard({
	item,
	action,
}: {
	item: EventRow
	action: 'created' | 'updated' | null
}) {
	const icon = TYPE_ICON[item.type] ?? '•'
	const dateStr =
		item.end && item.end !== item.begin
			? `${item.begin} → ${item.end}`
			: (item.begin ?? null)

	return (
		<div className="mt-1.5 px-2.5 py-2 bg-blue-50 border border-blue-100 rounded-lg text-xs flex items-start gap-2">
			<span className="text-sm leading-none mt-0.5">{icon}</span>
			<div className="min-w-0 flex-1">
				<div className="font-medium text-gray-800 truncate">
					{item.title ?? '(untitled)'}
				</div>
				{dateStr && <div className="text-gray-500 mt-0.5">{dateStr}</div>}
			</div>
			{action && (
				<span className="text-gray-400 shrink-0 capitalize">{action}</span>
			)}
		</div>
	)
}
