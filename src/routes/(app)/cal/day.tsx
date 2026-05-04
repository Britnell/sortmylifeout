import { useState, useMemo } from 'react'
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
import { fmtDate, isSameDay } from '#/lib/date'

export const Route = createFileRoute('/(app)/cal/day')({
  component: RouteComponent,
})

const SLOT_HEIGHT = 28 // px per 30-min slot
const SLOTS_PER_HOUR = 2
const TOTAL_SLOTS = 24 * SLOTS_PER_HOUR // 48

function toDateOnly(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function fmtDateLocal(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function getDayLabel(d: Date, today: Date): string {
  if (isSameDay(d, today)) return 'Today'
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  if (isSameDay(d, tomorrow)) return 'Tomorrow'
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (isSameDay(d, yesterday)) return 'Yesterday'
  return d.toLocaleDateString('default', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  })
}

// Round a time string "HH:MM" to nearest 30-min slot index (0 = 00:00, 1 = 00:30, ...)
function timeToSlot(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number)
  const totalMins = h * 60 + m
  return Math.round(totalMins / 30)
}

function RouteComponent() {
  const today = useMemo(() => toDateOnly(new Date()), [])
  const [currentDate, setCurrentDate] = useState<Date>(today)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const dateStr = fmtDateLocal(currentDate)

  const { data: events = [], refetch: invalidate } = useQuery({
    queryKey: ['searchEventsFn', dateStr, dateStr],
    queryFn: () =>
      searchEventsFn({ data: { date_from: dateStr, date_to: dateStr } }),
  })

  const allDayEvs = useMemo(
    () =>
      (events as CalendarEvent[]).filter(
        (ev) => ev.all_day || !ev.begin?.includes('T'),
      ),
    [events],
  )

  const timedEvs = useMemo(
    () =>
      (events as CalendarEvent[])
        .filter((ev) => !ev.all_day && ev.begin?.includes('T'))
        .sort((a, b) => (a.begin ?? '').localeCompare(b.begin ?? '')),
    [events],
  )

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

  const goDay = (delta: number) => {
    setCurrentDate((d) => {
      const next = new Date(d)
      next.setDate(next.getDate() + delta)
      return next
    })
  }

  const openEdit = (ev: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingEvent(ev)
    setDialogOpen(true)
  }

  const openCreate = () => {
    setSelectedDate(dateStr)
    setEditingEvent(null)
    setDialogOpen(true)
  }

  const hours = Array.from({ length: 24 }, (_, i) => i)

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div className="flex border border-gray-300 rounded-md overflow-hidden">
          <Link
            to="/cal/week"
            className="px-4 py-2 text-sm font-medium transition-colors text-gray-600 hover:bg-gray-50"
          >
            Week
          </Link>
          <Link
            to="/cal/schedule"
            className="px-4 py-2 text-sm font-medium transition-colors border-l border-gray-300 text-gray-600 hover:bg-gray-50"
          >
            Schedule
          </Link>
          <Link
            to="/cal/day"
            className="px-4 py-2 text-sm font-medium transition-colors border-l border-gray-300 bg-blue-600 text-white"
          >
            Day
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <button
            className="p-1 rounded hover:bg-gray-100 text-gray-600"
            onClick={() => goDay(-1)}
          >
            ‹
          </button>
          <div className="text-center min-w-32">
            <div
              className={`text-sm font-semibold ${isSameDay(currentDate, today) ? 'text-blue-600' : 'text-gray-900'}`}
            >
              {getDayLabel(currentDate, today)}
            </div>
            <div className="text-xs text-gray-400">
              {currentDate.toLocaleDateString('default', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}
            </div>
          </div>
          <button
            className="p-1 rounded hover:bg-gray-100 text-gray-600"
            onClick={() => goDay(1)}
          >
            ›
          </button>
        </div>

        <button
          className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700"
          onClick={openCreate}
        >
          + Add
        </button>
      </div>

      {/* All-day events */}
      {allDayEvs.length > 0 && (
        <div className="shrink-0 mb-2 pl-12 space-y-1">
          {allDayEvs.map((ev) =>
            ev.type === 'todo' ? (
              <div
                key={ev.id}
                className="text-sm bg-gray-100 text-gray-800 px-2 py-1 rounded flex items-center gap-2"
              >
                <input
                  type="checkbox"
                  checked={!!ev.completed}
                  className="shrink-0"
                  onChange={(e) =>
                    updateMutation.mutate({
                      id: ev.id,
                      begin: ev.begin ?? '',
                      allDay: true,
                      title: ev.title,
                      detail: ev.detail ?? undefined,
                      completed: e.target.checked,
                    })
                  }
                  onClick={(e) => e.stopPropagation()}
                />
                <span
                  className="cursor-pointer hover:underline"
                  onClick={(e) => openEdit(ev, e)}
                >
                  {ev.title}
                </span>
              </div>
            ) : (
              <div
                key={ev.id}
                className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded cursor-pointer hover:bg-blue-200"
                onClick={(e) => openEdit(ev, e)}
              >
                {ev.title}
              </div>
            ),
          )}
        </div>
      )}

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto">
        <div className="relative flex">
          {/* Hour labels */}
          <div className="shrink-0 w-10 select-none">
            {hours.map((h) => (
              <div
                key={h}
                style={{ height: SLOT_HEIGHT * SLOTS_PER_HOUR }}
                className="flex items-start justify-end pr-2 pt-0.5"
              >
                <span className="text-xs text-gray-400 leading-none">
                  {String(h).padStart(2, '0')}
                </span>
              </div>
            ))}
          </div>

          {/* Grid + events */}
          <div
            className="flex-1 relative border-l border-gray-200"
            style={{ height: TOTAL_SLOTS * SLOT_HEIGHT }}
          >
            {/* Hour lines */}
            {hours.map((h) => (
              <div
                key={h}
                className="absolute left-0 right-0 border-t border-gray-200"
                style={{ top: h * SLOTS_PER_HOUR * SLOT_HEIGHT }}
              />
            ))}
            {/* Half-hour lines (lighter) */}
            {hours.map((h) => (
              <div
                key={`h${h}`}
                className="absolute left-0 right-0 border-t border-gray-100"
                style={{ top: (h * SLOTS_PER_HOUR + 1) * SLOT_HEIGHT }}
              />
            ))}

            {/* Events */}
            {timedEvs.map((ev) => {
              const timeStr = ev.begin!.split('T')[1].slice(0, 5)
              const startSlot = Math.min(timeToSlot(timeStr), TOTAL_SLOTS - 1)
              const endSlot = ev.end?.includes('T')
                ? Math.min(
                    timeToSlot(ev.end.split('T')[1].slice(0, 5)),
                    TOTAL_SLOTS,
                  )
                : startSlot + 2
              const heightSlots = Math.max(endSlot - startSlot, 1)

              return (
                <div
                  key={ev.id}
                  className={`absolute left-1 right-1 rounded px-1.5 py-0.5 text-xs cursor-pointer overflow-hidden
                    ${ev.type === 'todo' ? 'bg-gray-200 text-gray-800 hover:bg-gray-300' : 'bg-blue-200 text-blue-900 hover:bg-blue-300'}`}
                  style={{
                    top: startSlot * SLOT_HEIGHT + 1,
                    height: heightSlots * SLOT_HEIGHT - 2,
                  }}
                  onClick={(e) => openEdit(ev, e)}
                >
                  <div className="font-medium truncate">{ev.title}</div>
                  <div className="text-blue-700/70">
                    {timeStr}
                    {ev.end?.includes('T') &&
                      ` – ${ev.end.split('T')[1].slice(0, 5)}`}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
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
    </div>
  )
}
