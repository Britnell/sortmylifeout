import { useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  searchEventsFn,
  createEventFn,
  updateEventFn,
  deleteEventFn,
} from '@/serverFn/queries.functions'
import CalendarEventDialog from '@/components/CalendarEventDialog'
import type { CalendarEvent } from '@/components/CalendarEventDialog'
import { fmtDate, getWeekDays, isSameDay, weekdays } from '#/lib/date'

export const Route = createFileRoute('/(app)/app/week')({
  component: RouteComponent,
})

type ExpandedDay = { dateStr: string; rect: DOMRect }

function DayPopover({
  expandedDay,
  dayEvents,
  onClose,
  onEdit,
  onCreateNew,
  updateMutation,
}: {
  expandedDay: ExpandedDay
  dayEvents: CalendarEvent[]
  onClose: () => void
  onEdit: (ev: CalendarEvent) => void
  onCreateNew: (dateStr: string) => void
  updateMutation: ReturnType<typeof useMutation<unknown, unknown, { id: number; begin: string; allDay: boolean; title: string; detail?: string; completed?: boolean }>>
}) {
  const { rect, dateStr } = expandedDay

  const centerX = rect.left + rect.width / 2
  const centerY = rect.top + rect.height / 2
  const popW = Math.max(rect.width * 1.5, 180)
  const popH = Math.max(rect.height * 1.4, 160)
  let left = centerX - popW / 2
  let top = centerY - popH / 2
  left = Math.max(8, Math.min(left, window.innerWidth - popW - 8))
  top = Math.max(8, Math.min(top, window.innerHeight - popH - 8))

  const allDayEvs = dayEvents.filter((ev) => ev.all_day || !ev.begin?.includes('T'))
  const timedEvs = dayEvents
    .filter((ev) => !ev.all_day && ev.begin?.includes('T'))
    .sort((a, b) => (a.begin ?? '').localeCompare(b.begin ?? ''))

  const label = new Date(dateStr + 'T12:00:00').toLocaleDateString('default', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-40"
        onMouseDown={() => onClose()}
      />
    <div
      style={{
        position: 'fixed',
        left,
        top,
        width: popW,
        minHeight: popH,
        zIndex: 50,
        transformOrigin: `${centerX - left}px ${centerY - top}px`,
        animation: 'day-pop-in 0.15s ease-out forwards',
      }}
      className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 flex flex-col gap-1"
    >
      <style>{`@keyframes day-pop-in { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } }`}</style>
      <div className="text-xs font-semibold text-gray-500 mb-1">{label}</div>
      {allDayEvs.map((ev) =>
        ev.type === 'todo' ? (
          <div
            key={ev.id}
            className="text-xs bg-gray-100 text-gray-800 p-1 rounded flex items-center gap-1 cursor-pointer"
            onClick={() => onEdit(ev)}
          >
            <input
              type="checkbox"
              checked={!!ev.completed}
              className="shrink-0"
              onChange={(e) => {
                e.stopPropagation()
                updateMutation.mutate({
                  id: ev.id,
                  begin: ev.begin ?? '',
                  allDay: !ev.begin?.includes('T'),
                  title: ev.title,
                  detail: ev.detail ?? undefined,
                  completed: e.target.checked,
                })
              }}
              onClick={(e) => e.stopPropagation()}
            />
            <span className="truncate">{ev.title}</span>
          </div>
        ) : (
          <div
            key={ev.id}
            className="text-xs bg-blue-100 text-blue-800 p-1 rounded truncate cursor-pointer hover:bg-blue-200"
            onClick={() => onEdit(ev)}
          >
            {ev.title}
          </div>
        ),
      )}
      {timedEvs.map((ev) => (
        <div key={ev.id} className="cursor-pointer" onClick={() => onEdit(ev)}>
          <span className="text-[10px] text-gray-400 leading-tight block">
            {ev.begin!.split('T')[1].slice(0, 5)}
          </span>
          <div
            className={`text-xs p-1 rounded ${ev.type === 'todo' ? 'bg-gray-100 text-gray-800 hover:bg-gray-200' : 'hover:bg-gray-100'}`}
          >
            <span className="block truncate">{ev.title}</span>
          </div>
        </div>
      ))}
      <button
        className="mt-auto pt-2 w-full text-xs text-gray-400 hover:text-gray-700 flex items-center justify-center gap-1 border-t border-gray-100"
        onClick={() => { onClose(); onCreateNew(dateStr) }}
      >
        <span className="text-base leading-none">+</span> New event
      </button>
    </div>
    </>,
    document.body,
  )
}

function RouteComponent() {
  const [weekOffset] = useState(0)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [expandedDay, setExpandedDay] = useState<ExpandedDay | null>(null)

  const today = new Date()

  const allWeekDays = useMemo(
    () => [
      getWeekDays(weekOffset - 1),
      getWeekDays(weekOffset),
      getWeekDays(weekOffset + 1),
    ],
    [weekOffset],
  )

  const date_from = fmtDate(allWeekDays[0][0])
  const date_to = fmtDate(allWeekDays[2][6])

  const { data: events = [], refetch: invalidate } = useQuery({
    queryKey: ['searchEventsFn', date_from, date_to],
    queryFn: () => searchEventsFn({ data: { date_from, date_to } }),
  })

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    ;(events as CalendarEvent[]).forEach((ev) => {
      const dateKey = ev.begin?.split('T')[0]
      if (!dateKey) return
      if (!map.has(dateKey)) map.set(dateKey, [])
      map.get(dateKey)!.push(ev)
    })
    return map
  }, [events])

  const closeDialog = () => {
    setDialogOpen(false)
    setEditingEvent(null)
  }

  const createMutation = useMutation({
    mutationFn: (data: {
      begin?: string
      allDay: boolean
      end?: string
      title: string
      detail?: string
      type?: string
    }) => createEventFn({ data }),
    onSuccess: () => {
      invalidate()
      closeDialog()
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: {
      id: number
      begin: string
      allDay: boolean
      end?: string
      title: string
      detail?: string
      type?: string
      completed?: boolean
    }) => updateEventFn({ data }),
    onSuccess: () => {
      invalidate()
      closeDialog()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteEventFn({ data: { id } }),
    onSuccess: () => {
      invalidate()
      closeDialog()
    },
  })

  const openCreate = (dateStr: string) => {
    setSelectedDate(dateStr)
    setEditingEvent(null)
    setDialogOpen(true)
  }

  const openEdit = (ev: CalendarEvent, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setExpandedDay(null)
    setEditingEvent(ev)
    setDialogOpen(true)
  }

  const firstDay = allWeekDays[0][0]
  const lastDay = allWeekDays[2][6]
  const weekLabel = `${firstDay.toLocaleDateString('default', { month: 'short', day: 'numeric' })} - ${lastDay.toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' })}`

  return (
    <div className="h-screen p-4">
      <div className="flex items-center gap-4 mb-4">
        <div className="flex border border-gray-300 rounded-md overflow-hidden">
          <Link
            to="/app/week"
            className="px-4 py-2 text-sm font-medium transition-colors bg-blue-600 text-white"
          >
            Week
          </Link>
          <Link
            to="/app/day"
            className="px-4 py-2 text-sm font-medium transition-colors border-l border-gray-300 text-gray-600 hover:bg-gray-50"
          >
            Day
          </Link>
        </div>
        <h2 className="text-xl font-semibold">{weekLabel}</h2>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {weekdays.map((day) => (
          <div
            key={day}
            className="text-center font-medium p-2 rounded-t text-sm"
          >
            {day}
          </div>
        ))}

        {allWeekDays.map((weekDays, wi) =>
          weekDays.map((day, i) => {
            const dateStr = fmtDate(day)
            const dayEvents = eventsByDate.get(dateStr) || []
            const isToday = isSameDay(day, today)

            const allDayEvs = dayEvents.filter(
              (ev) => ev.all_day || !ev.begin?.includes('T'),
            )
            const timedEvs = dayEvents
              .filter((ev) => !ev.all_day && ev.begin?.includes('T'))
              .sort((a, b) => (a.begin ?? '').localeCompare(b.begin ?? ''))

            const renderAllDay = (ev: CalendarEvent) =>
              ev.type === 'todo' ? (
                <div
                  key={ev.id}
                  className="text-xs bg-gray-100 text-gray-800 p-1 rounded flex items-center gap-1"
                  onClick={(e) => {
                    e.stopPropagation()
                    openEdit(ev, e)
                  }}
                >
                  <input
                    type="checkbox"
                    checked={!!ev.completed}
                    className="shrink-0"
                    onChange={(e) => {
                      e.stopPropagation()
                      updateMutation.mutate({
                        id: ev.id,
                        begin: ev.begin ?? '',
                        allDay: !ev.begin?.includes('T'),
                        title: ev.title,
                        detail: ev.detail ?? undefined,
                        completed: e.target.checked,
                      })
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span className="truncate">{ev.title}</span>
                </div>
              ) : (
                <div
                  key={ev.id}
                  className="text-xs bg-blue-100 text-blue-800 p-1 rounded truncate cursor-pointer hover:bg-blue-200"
                  onClick={(e) => {
                    e.stopPropagation()
                    openEdit(ev, e)
                  }}
                >
                  {ev.title}
                </div>
              )

            const totalEvents = allDayEvs.length + timedEvs.length
            const fewEvents = totalEvents <= 1

            return (
              <button
                key={`${wi}-${i}`}
                className={`group flex flex-col border p-2 min-h-[120px] rounded text-left w-full cursor-pointer ${isToday ? 'border-blue-500 bg-blue-50' : ''}`}
                onClick={(e) => {
                  if (fewEvents) {
                    openCreate(dateStr)
                  } else {
                    const rect = e.currentTarget.getBoundingClientRect()
                    setExpandedDay({ dateStr, rect })
                  }
                }}
              >
                <div
                  className={`text-sm font-medium ${isToday ? 'text-blue-600' : ''}`}
                >
                  {day.getDate()}
                </div>
                <div className="mt-1 space-y-1">
                  {allDayEvs.map(renderAllDay)}
                  {timedEvs.map((ev) => (
                    <div key={ev.id}>
                      <span className="text-[10px] text-gray-500 leading-tight block">
                        {ev.begin!.split('T')[1].slice(0, 5)}
                      </span>
                      <div
                        className={`text-xs p-1 rounded cursor-pointer overflow-hidden ${ev.type === 'todo' ? 'bg-gray-100 text-gray-800 hover:bg-gray-200' : ' hover:bg-gray-100'}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          openEdit(ev, e)
                        }}
                      >
                        <span className="block truncate">{ev.title}</span>
                      </div>
                    </div>
                  ))}
                  {fewEvents && (
                    <div className="invisible group-hover:visible w-full text-xs p-1 rounded bg-gray-100 text-gray-500 flex items-center justify-center">
                      +
                    </div>
                  )}
                </div>
              </button>
            )
          }),
        )}
      </div>

      <CalendarEventDialog
        isOpen={dialogOpen}
        onClose={closeDialog}
        editingEvent={editingEvent}
        selectedDate={selectedDate}
        createMutation={createMutation}
        updateMutation={updateMutation}
        deleteMutation={deleteMutation}
      />

      {expandedDay && (
        <DayPopover
          expandedDay={expandedDay}
          dayEvents={eventsByDate.get(expandedDay.dateStr) || []}
          onClose={() => setExpandedDay(null)}
          onEdit={(ev) => openEdit(ev)}
          onCreateNew={openCreate}
          updateMutation={updateMutation}
        />
      )}
    </div>
  )
}
