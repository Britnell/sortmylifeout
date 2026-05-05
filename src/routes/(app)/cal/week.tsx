import { useState, useMemo, useRef, useEffect } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import CalViewSwitcher from '@/components/CalViewSwitcher'
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

export const Route = createFileRoute('/(app)/cal/week')({
  component: RouteComponent,
})

function DayPopover({
  dateStr,
  dayEvents,
  onClose,
  onEdit,
  onCreateNew,
  updateMutation,
  anchorRect,
}: {
  dateStr: string
  dayEvents: CalendarEvent[]
  onClose: () => void
  onEdit: (ev: CalendarEvent) => void
  onCreateNew: (dateStr: string) => void
  updateMutation: ReturnType<
    typeof useMutation<
      unknown,
      unknown,
      {
        id: number
        begin: string
        allDay: boolean
        title: string
        detail?: string
        completed?: boolean
      }
    >
  >
  anchorRect: DOMRect
}) {
  const allDayEvs = dayEvents.filter(
    (ev) => ev.all_day || !ev.begin?.includes('T'),
  )
  const timedEvs = dayEvents
    .filter((ev) => !ev.all_day && ev.begin?.includes('T'))
    .sort((a, b) => (a.begin ?? '').localeCompare(b.begin ?? ''))

  const label = new Date(dateStr + 'T12:00:00').toLocaleDateString('default', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })

  const dialogRef = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    dialog.showModal()
    dialog.style.margin = '0'
    dialog.style.position = 'fixed'
    dialog.style.left = `${anchorRect.left}px`
    dialog.style.top = `${anchorRect.top}px`
  }, [])

  return (
    <dialog
      ref={dialogRef}
      className="rounded-lg shadow-lg border border-gray-200 p-3 w-52 flex flex-col gap-1 backdrop:bg-black/20"
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose()
      }}
    >
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
            className={`text-xs p-1 rounded flex items-center gap-1 ${ev.type === 'todo' ? 'bg-gray-100 text-gray-800 hover:bg-gray-200' : 'hover:bg-gray-100'}`}
          >
            {ev.type === 'todo' && (
              <input
                type="checkbox"
                checked={!!ev.completed}
                className="shrink-0"
                onChange={(e) => {
                  e.stopPropagation()
                  updateMutation.mutate({
                    id: ev.id,
                    begin: ev.begin ?? '',
                    allDay: false,
                    title: ev.title,
                    detail: ev.detail ?? undefined,
                    completed: e.target.checked,
                  })
                }}
                onClick={(e) => e.stopPropagation()}
              />
            )}
            <span className="block truncate">{ev.title}</span>
          </div>
        </div>
      ))}
      <button
        className="mt-auto pt-2 w-full text-xs text-gray-400 hover:text-gray-700 flex items-center justify-center gap-1 border-t border-gray-100"
        onClick={() => {
          onClose()
          onCreateNew(dateStr)
        }}
      >
        <span className="text-base leading-none">+</span> New event
      </button>
    </dialog>
  )
}

function RouteComponent() {
  const [weekOffset] = useState(0)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [expandedDay, setExpandedDay] = useState<string | null>(null)
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null)

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
    <div className="">
      <div className="flex items-center gap-4 mb-4">
        <CalViewSwitcher />
        <h2 className="text-xl font-semibold">{weekLabel}</h2>
      </div>

      <div className="grid grid-cols-7 sm:gap-1">
        {weekdays.map((day) => (
          <div
            key={day}
            className="text-center font-medium p-2 text-gray-600 text-sm"
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
                >
                  <input
                    type="checkbox"
                    checked={!!ev.completed}
                    className="shrink-0 hidden sm:inline"
                    readOnly
                  />
                  <span className="truncate">{ev.title}</span>
                </div>
              ) : (
                <div
                  key={ev.id}
                  className="text-xs bg-blue-100 text-blue-800 p-1 rounded truncate"
                >
                  {ev.title}
                </div>
              )

            const totalEvents = allDayEvs.length + timedEvs.length
            const fewEvents = totalEvents === 0
            const MAX_VISIBLE = 3
            const visibleAllDay = allDayEvs.slice(0, MAX_VISIBLE)
            const visibleTimed = timedEvs.slice(
              0,
              Math.max(0, MAX_VISIBLE - allDayEvs.length),
            )
            const hasMore = totalEvents > MAX_VISIBLE

            return (
              <button
                key={`${wi}-${i}`}
                className={`group flex flex-col border border-gray-400 -mt-px -ml-px p-1 sm:p-2 min-h-[120px] sm:rounded text-left w-full cursor-pointer ${isToday ? ' bg-blue-200' : ''}`}
                onClick={(e) => {
                  if (fewEvents) {
                    openCreate(dateStr)
                  } else {
                    setAnchorRect(e.currentTarget.getBoundingClientRect())
                    setExpandedDay(dateStr)
                  }
                }}
              >
                <div
                  className={`text-sm font-medium ${isToday ? 'text-blue-600' : ''}`}
                >
                  {day.getDate()}
                </div>
                <div className="mt-1 space-y-1">
                  {visibleAllDay.map(renderAllDay)}
                  {visibleTimed.map((ev) => (
                    <div key={ev.id}>
                      <span className="text-[10px] text-gray-500 leading-tight block">
                        {ev.begin!.split('T')[1].slice(0, 5)}
                      </span>
                      <div
                        className={`text-xs p-1 rounded overflow-hidden ${ev.type === 'todo' ? 'bg-gray-100 text-gray-800 flex items-center gap-1' : ''}`}
                      >
                        {ev.type === 'todo' && (
                          <input
                            type="checkbox"
                            checked={!!ev.completed}
                            className="shrink-0 hidden sm:inline "
                            readOnly
                          />
                        )}
                        <span className="block truncate">{ev.title}</span>
                      </div>
                    </div>
                  ))}
                  {hasMore && (
                    <div className="text-xs text-gray-400 px-1">
                      +{totalEvents - MAX_VISIBLE} more
                    </div>
                  )}
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

      {expandedDay && anchorRect && (
        <DayPopover
          dateStr={expandedDay}
          dayEvents={eventsByDate.get(expandedDay) || []}
          onClose={() => setExpandedDay(null)}
          onEdit={(ev) => openEdit(ev)}
          onCreateNew={openCreate}
          updateMutation={updateMutation}
          anchorRect={anchorRect}
        />
      )}
    </div>
  )
}
