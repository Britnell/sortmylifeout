export type EventRow = {
  id: number
  type: 'event' | 'todo' | 'shopping'
  title?: string | null
  begin?: string | null
  end?: string | null
  completed?: string | null
  [key: string]: unknown
}

const formatDateTime = (value: string) => {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  const date = d.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
  const time = d.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })
  return value.includes('T') ? `${date} · ${time}` : date
}

export function EventCard({
  item,
  action,
}: {
  item: EventRow
  action: 'created' | 'updated' | null
}) {
  const range =
    item.begin && item.end && item.begin !== item.end
      ? `${formatDateTime(item.begin)} → ${formatDateTime(item.end)}`
      : item.begin
        ? formatDateTime(item.begin)
        : null

  return (
    <div className="px-2.5 py-2 bg-yellow-200 border border-yellow-400 rounded-lg text-xs flex items-start gap-2">
      {item.type === 'todo' && (
        <input
          type="checkbox"
          checked={!!item.completed}
          readOnly
          className="mt-0.5 accent-yellow-600"
        />
      )}
      <div className="min-w-0 flex-1">
        {range && (
          <div className="text-[10px] uppercase tracking-wide text-gray-400">
            {range}
          </div>
        )}
        <div className="font-medium text-gray-800 truncate">
          {item.title ?? '(untitled)'}
        </div>
      </div>
      {action && (
        <span className="text-gray-400 shrink-0 capitalize">{action}</span>
      )}
    </div>
  )
}
