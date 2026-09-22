import { useState, useMemo, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Columns3 } from 'lucide-react'
import { createFileRoute } from '@tanstack/react-router'
import CalendarMenuBar from '#/components/CalendarMenuBar'
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

function RouteComponent() {
  const [weekOffset, setWeekOffset] = useState(0)
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

  const firstDay = allWeekDays[1][0]
  const weekLabel = firstDay.toLocaleDateString('default', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })

  return (
    <div className="">
      {/* Toolbar */}
      <CalendarMenuBar onAdd={() => openCreate(fmtDate(today))} />

      {/* Date stepper row */}
      <div className="mb-2 flex items-center gap-4 border-y border-[#E7E8E5] py-2 px-1 md:px-4">
        <span className="flex items-center gap-1.5 text-base font-semibold text-[#111111]">
          <Columns3 size={14} strokeWidth={2} className="shrink-0" />
          Week
        </span>
        <div className="flex items-center gap-3 mx-auto">
          <button
            className="flex items-center rounded-md p-1 text-[#666666] hover:bg-[#F0F0EE] hover:text-black"
            onClick={() => setWeekOffset((o) => o - 1)}
            aria-label="Previous week"
          >
            <ChevronLeft size={18} />
          </button>
          <h2 className="flex min-w-[10ch] flex-col items-center leading-tight">
            <span className="text-[15px] font-semibold text-[#111111]">
              {weekLabel}
            </span>
            <span className="text-[11px] text-[#666666]">
              {firstDay.getFullYear()}
            </span>
          </h2>
          <button
            className="flex items-center rounded-md p-1 text-[#666666] hover:bg-[#F0F0EE] hover:text-black"
            onClick={() => setWeekOffset((o) => o + 1)}
            aria-label="Next week"
          >
            <ChevronRight size={18} />
          </button>
          <button
            className={`text-[12px] font-medium text-[#111111] ${
              weekOffset === 0 ? 'bg-[var(--primary)]' : 'bg-white'
            } rounded-md px-3 py-1.5`}
            onClick={() => setWeekOffset(0)}
          >
            Today
          </button>
        </div>
      </div>

      {/* Weekday header */}
      <div className="grid grid-cols-7 gap-1 px-1 md:px-4 pb-1">
        {allWeekDays[1].map((day) => {
          const weekday =
            weekdays[(day.getDay() + 6) % 7] ??
            day.toLocaleDateString('default', { weekday: 'short' })
          return (
            <div
              key={fmtDate(day)}
              className="text-center text-[13px] font-semibold text-[#111111]"
            >
              {weekday}
            </div>
          )
        })}
      </div>

      {/* Week grid */}
      <div className="flex flex-col gap-1 flex-1 min-h-[640px] px-1 md:px-4">
        {allWeekDays.map((weekDays, wi) => {
          const isCurrentWeek = wi === 1
          return isCurrentWeek ? (
            <CurrentWeekGrid
              key={wi}
              weekDays={weekDays}
              eventsByDate={eventsByDate}
              onOpen={(dateStr, rect) => {
                setAnchorRect(rect)
                setExpandedDay(dateStr)
              }}
              onCreate={openCreate}
              onEdit={openEdit}
            />
          ) : (
            <div
              key={wi}
              className={`grid grid-cols-7 gap-1 opacity-55 hidden md:grid`}
            >
              {weekDays.map((day) => (
                <DayCell
                  key={fmtDate(day)}
                  day={day}
                  onCreate={() => openCreate(fmtDate(day))}
                />
              ))}
            </div>
          )
        })}
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

const chipBg = 'bg-[#E7E8E5]'

function Chip({
  ev,
  onEdit,
  checkbox,
}: {
  ev: CalendarEvent
  onEdit: (ev: CalendarEvent, e?: React.MouseEvent) => void
  checkbox?: boolean
}) {
  return (
    <button
      type="button"
      className={`flex items-center gap-1 w-full text-left px-1.5 py-[3px] rounded-[3px] ${chipBg} hover:bg-[#D8D9D6]`}
      onClick={(e) => onEdit(ev, e)}
    >
      {checkbox && (
        <input
          type="checkbox"
          checked={!!ev.completed}
          className="shrink-0 size-[11px] accent-white rounded-[3px]"
          readOnly
        />
      )}
      <span className="text-[11px] text-[#111111] truncate">{ev.title}</span>
    </button>
  )
}

function EventItem({
  ev,
  onEdit,
}: {
  ev: CalendarEvent
  onEdit: (ev: CalendarEvent, e?: React.MouseEvent) => void
}) {
  return (
    <div className="flex flex-col gap-0.5 w-full">
      <span className="text-[9px] font-mono text-[#666666] leading-none">
        {ev.begin!.split('T')[1].slice(0, 5)}
      </span>
      <Chip ev={ev} onEdit={onEdit} checkbox={ev.type === 'todo'} />
    </div>
  )
}

function splitEvents(dayEvents: CalendarEvent[]) {
  const allDayEvs = dayEvents.filter(
    (ev) => ev.all_day || !ev.begin?.includes('T'),
  )
  const timedEvs = dayEvents
    .filter((ev) => !ev.all_day && ev.begin?.includes('T'))
    .sort((a, b) => (a.begin ?? '').localeCompare(b.begin ?? ''))
  const amEvs = timedEvs.filter(
    (ev) => Number(ev.begin!.split('T')[1].slice(0, 2)) < 12,
  )
  const pmEvs = timedEvs.filter(
    (ev) => Number(ev.begin!.split('T')[1].slice(0, 2)) >= 12,
  )
  return { allDayEvs, amEvs, pmEvs }
}

function MoreButton({
  rest,
  dateStr,
  onOpen,
}: {
  rest: number
  dateStr: string
  onOpen: (dateStr: string, rect: DOMRect) => void
}) {
  return (
    <button
      type="button"
      className="text-left text-[11px] text-[#666666] hover:text-black hover:bg-[#E7E8E5] rounded px-1 w-full"
      onClick={(e) => {
        e.stopPropagation()
        onOpen(dateStr, e.currentTarget.getBoundingClientRect())
      }}
    >
      +{rest} more
    </button>
  )
}

function CurrentWeekGrid({
  weekDays,
  eventsByDate,
  onOpen,
  onCreate,
  onEdit,
}: {
  weekDays: Date[]
  eventsByDate: Map<string, CalendarEvent[]>
  onOpen: (dateStr: string, rect: DOMRect) => void
  onCreate: (dateStr: string) => void
  onEdit: (ev: CalendarEvent, e?: React.MouseEvent) => void
}) {
  const today = new Date()
  const days = weekDays.map((day) => {
    const dateStr = fmtDate(day)
    return {
      day,
      dateStr,
      isToday: isSameDay(day, today),
      ...splitEvents(eventsByDate.get(dateStr) || []),
    }
  })

  // all-day rows: max visible count across the week
  return (
    <div
      className="grid grid-cols-7 gap-x-1 gap-y-0 flex-1"
      style={{
        gridTemplateRows: `auto repeat(2, 1fr)`,
      }}
    >
      {/* header + all-day row */}
      {days.map(({ day, dateStr, isToday, allDayEvs }) => {
        const visible = allDayEvs.slice(0, 3)
        const rest = allDayEvs.length - visible.length
        return (
          <div
            key={dateStr}
            className={`flex flex-col gap-1 pt-1.5 pb-1.5 px-2 rounded-t-md border-x border-t border-[#CBCCC9] ${isToday ? 'bg-[var(--primary)]' : 'bg-white'}`}
            onClick={() => onCreate(dateStr)}
          >
            <div className="flex items-center gap-1">
              <span className="text-[13px] font-semibold text-[#111111]">
                {day.getDate()}
              </span>
              {isToday && (
                <span className="text-[13px] font-semibold text-[#111111] hidden md:inline">
                  Today
                </span>
              )}
            </div>
            {visible.map((ev) => (
              <Chip key={ev.id} ev={ev} onEdit={onEdit} checkbox={ev.type === 'todo'} />
            ))}
            {rest > 0 && <MoreButton rest={rest} dateStr={dateStr} onOpen={onOpen} />}
          </div>
        )
      })}

      {/* am row */}
      {days.map((d) => (
        <SectionCell
          key={d.dateStr}
          label="am"
          evs={d.amEvs}
          dateStr={d.dateStr}
          onOpen={onOpen}
          onCreate={onCreate}
          onEdit={onEdit}
        />
      ))}

      {/* pm row */}
      {days.map((d) => (
        <SectionCell
          key={d.dateStr}
          label="pm"
          evs={d.pmEvs}
          dateStr={d.dateStr}
          onOpen={onOpen}
          onCreate={onCreate}
          onEdit={onEdit}
          rounded="bottom"
        />
      ))}
    </div>
  )
}

function SectionCell({
  label,
  evs,
  dateStr,
  onOpen,
  onCreate,
  onEdit,
  rounded,
}: {
  label: string
  evs: CalendarEvent[]
  dateStr: string
  onOpen: (dateStr: string, rect: DOMRect) => void
  onCreate: (dateStr: string) => void
  onEdit: (ev: CalendarEvent, e?: React.MouseEvent) => void
  rounded?: 'bottom'
}) {
  const visible = evs.slice(0, 3)
  const rest = evs.length - visible.length
  return (
    <div
      className={`bg-white border-x border-[#CBCCC9] p-1.5 flex flex-col gap-1 flex-1 border-t ${rounded === 'bottom' ? 'border-b rounded-b-md' : ''}`}
      onClick={() => onCreate(dateStr)}
    >
      <span className="text-[8px] font-mono text-[#8A8B87] leading-none">
        {label}
      </span>
      <div className="flex flex-col gap-1 pt-0.5 pb-1.5">
        {visible.map((ev) => (
          <EventItem key={ev.id} ev={ev} onEdit={onEdit} />
        ))}
        {rest > 0 && <MoreButton rest={rest} dateStr={dateStr} onOpen={onOpen} />}
      </div>
    </div>
  )
}

function DayCell({ day, onCreate }: { day: Date; onCreate: () => void }) {
  return (
    <div
      role="button"
      tabIndex={0}
      className="group flex flex-col text-left w-full cursor-pointer rounded-md border overflow-hidden bg-[#F2F3F0] border-[#CBCCC9] h-40"
      onClick={onCreate}
    >
      <span className="text-[13px] font-semibold text-[#666666] px-2 pt-1.5">
        {day.getDate()}
      </span>
    </div>
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
