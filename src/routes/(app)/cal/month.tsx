import { useState, useMemo, useRef, useEffect } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import CalendarMenuBar from '#/components/CalendarMenuBar'
import Icon from '@/components/Icon'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  searchEventsFn,
  createEventFn,
  updateEventFn,
  deleteEventFn,
} from '@/serverFn/queries.functions'
import CalendarEventDialog from '@/components/CalendarEventDialog'
import type { CalendarEvent } from '@/components/CalendarEventDialog'
import { fmtDate, getMonthDays, isSameDay, weekdays } from '#/lib/date'

export const Route = createFileRoute('/(app)/cal/month')({
  component: RouteComponent,
})

function RouteComponent() {
  const [monthOffset, setMonthOffset] = useState(0)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [expandedDay, setExpandedDay] = useState<string | null>(null)
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null)

  const today = new Date()

  const weeks = useMemo(() => getMonthDays(monthOffset), [monthOffset])

  const date_from = fmtDate(weeks[0][0])
  const date_to = fmtDate(weeks[weeks.length - 1][6])

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

  const monthDate = new Date(
    today.getFullYear(),
    today.getMonth() + monthOffset,
    1,
  )
  const monthLabel = monthDate.toLocaleDateString('default', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="flex flex-col gap-3">
      {/* Toolbar */}
      <CalendarMenuBar onAdd={() => openCreate(fmtDate(today))} />

      {/* Date stepper row */}
      <div className="flex items-center justify-between border-y border-[#E7E8E5] py-2">
        <button
          className="text-[#666666] hover:text-black px-1"
          onClick={() => setMonthOffset((o) => o - 1)}
          aria-label="Previous month"
        >
          <Icon name="chevron" className="rotate-90 text-lg" />
        </button>
        <h2 className="text-base font-semibold text-[#111111]">
          {monthLabel}
        </h2>
        <button
          className="text-[#666666] hover:text-black px-1"
          onClick={() => setMonthOffset((o) => o + 1)}
          aria-label="Next month"
        >
          <Icon name="chevron" className="-rotate-90 text-lg" />
        </button>
      </div>

      {/* Month grid */}
      <div className="flex flex-col gap-1 flex-1 min-h-[640px]">
        <div className="grid grid-cols-7 gap-1">
          {weekdays.map((w) => (
            <span
              key={w}
              className="text-center text-xs font-medium text-[#666666]"
            >
              {w}
            </span>
          ))}
        </div>
        <div className="flex flex-col gap-1 flex-1">
          {weeks.map((weekDays) => (
            <div key={fmtDate(weekDays[0])} className="grid grid-cols-7 gap-1 flex-1">
              {weekDays.map((day) => (
                <DayCell
                  key={fmtDate(day)}
                  day={day}
                  monthDate={monthDate}
                  dayEvents={eventsByDate.get(fmtDate(day)) || []}
                  onOpen={(rect) => {
                    setAnchorRect(rect)
                    setExpandedDay(fmtDate(day))
                  }}
                  onCreate={() => openCreate(fmtDate(day))}
                />
              ))}
            </div>
          ))}
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

const MAX_EVENTS = 3

function DayCell({
  day,
  monthDate,
  dayEvents,
  onOpen,
  onCreate,
}: {
  day: Date
  monthDate: Date
  dayEvents: CalendarEvent[]
  onOpen: (rect: DOMRect) => void
  onCreate: () => void
}) {
  const today = new Date()
  const isToday = isSameDay(day, today)
  const inMonth = day.getMonth() === monthDate.getMonth()

  const sorted = [...dayEvents].sort((a, b) =>
    (a.begin ?? '').localeCompare(b.begin ?? ''),
  )
  const visible = sorted.slice(0, MAX_EVENTS)
  const rest = sorted.length - visible.length

  const chipBg = isToday ? 'bg-white' : 'bg-[#E7E8E5]'

  const Chip = ({ ev }: { ev: CalendarEvent }) => (
    <div
      className={`flex items-center gap-1 w-full px-1.5 py-[3px] rounded-[3px] ${chipBg}`}
    >
      {ev.type === 'todo' && (
        <input
          type="checkbox"
          checked={!!ev.completed}
          className="shrink-0 size-[11px] accent-white rounded-[3px]"
          readOnly
        />
      )}
      <span className="text-[11px] text-[#111111] truncate">{ev.title}</span>
    </div>
  )

  const EventItem = ({ ev }: { ev: CalendarEvent }) =>
    ev.begin?.includes('T') ? (
      <div className="flex flex-col gap-0.5 w-full">
        <span className="text-[9px] font-mono text-[#666666] leading-none">
          {ev.begin!.split('T')[1].slice(0, 5)}
        </span>
        <Chip ev={ev} />
      </div>
    ) : (
      <Chip ev={ev} />
    )

  return (
    <button
      className={`flex flex-col gap-1 p-1.5 text-left w-full cursor-pointer rounded-md border ${
        isToday
          ? 'bg-[var(--primary)] border-[#FFC98A]'
          : inMonth
            ? 'bg-white border-[#CBCCC9]'
            : 'bg-[#F2F3F0] border-[#CBCCC9] opacity-55'
      }`}
      onClick={(e) =>
        dayEvents.length === 0
          ? onCreate()
          : onOpen(e.currentTarget.getBoundingClientRect())
      }
    >
      <span
        className={`text-[13px] font-semibold ${isToday ? 'text-[var(--primary-foreground)]' : inMonth ? 'text-[#111111]' : 'text-[#666666]'}`}
      >
        {day.getDate()}
      </span>
      <div className="flex flex-col gap-1 overflow-hidden">
        {visible.map((ev) => (
          <EventItem key={ev.id} ev={ev} />
        ))}
        {rest > 0 && (
          <span className="text-[11px] text-[#666666]">+{rest} more</span>
        )}
      </div>
    </button>
  )
}

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
      {timedEvs.map((ev) => (
        <div key={ev.id} className="cursor-pointer" onClick={() => onEdit(ev)}>
          <span className="text-[10px] text-gray-400 leading-tight block">
            {ev.begin!.split('T')[1].slice(0, 5)}
          </span>
          <div className="text-xs p-1 rounded flex items-center gap-1 hover:bg-gray-100">
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
