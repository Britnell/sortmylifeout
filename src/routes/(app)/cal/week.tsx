import { useState, useMemo, useRef, useEffect } from 'react'
import { Columns3 } from 'lucide-react'
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
  const lastDay = allWeekDays[1][6]
  const weekLabel = `${firstDay.toLocaleDateString('default', { month: 'short', day: 'numeric' })} - ${lastDay.toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' })}`

  const fmtMonth = (d: Date) =>
    d.toLocaleDateString('default', { month: 'long' })

  return (
    <div className="">
      {/* Toolbar */}
      <CalendarMenuBar onAdd={() => openCreate(fmtDate(today))} />

      {/* Date stepper row */}
      <div className="mb-2 flex items-center justify-between border-y border-[#E7E8E5] py-2 px-4">
        <span className="flex items-center gap-1.5 text-base font-semibold text-[#111111]">
          <Columns3 size={14} strokeWidth={2} className="shrink-0" />
          Week
        </span>
        <div className="flex items-center gap-1 mx-auto">
          <button
            className="flex items-center text-[#666666] hover:text-black px-1"
            onClick={() => setWeekOffset((o) => o - 1)}
            aria-label="Previous week"
          >
            <Icon name="chevron" className="text-lg" />
          </button>
          <h2 className="text-base font-semibold text-[#111111]">
            {weekLabel}
          </h2>
          <button
            className="flex items-center text-[#666666] hover:text-black px-1"
            onClick={() => setWeekOffset((o) => o + 1)}
            aria-label="Next week"
          >
            <Icon name="chevron" className="rotate-180 text-lg" />
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

      {/* Week grid */}
      <div className="flex flex-col gap-1 flex-1 min-h-[640px] px-4">
        {allWeekDays.map((weekDays, wi) => {
          const isCurrentWeek = wi === 1
          return (
            <div
              key={wi}
              className={`flex flex-col gap-1 ${isCurrentWeek ? 'flex-1' : 'opacity-55'}`}
            >
              <div className="grid grid-cols-7 gap-1 flex-1">
                {weekDays.map((day) => (
                  <DayCell
                    key={fmtDate(day)}
                    day={day}
                    isCurrentWeek={isCurrentWeek}
                    dayEvents={eventsByDate.get(fmtDate(day)) || []}
                    onOpen={(rect) => {
                      setAnchorRect(rect)
                      setExpandedDay(fmtDate(day))
                    }}
                    onCreate={() => openCreate(fmtDate(day))}
                  />
                ))}
              </div>
            </div>
          )
        })}

        <div className="flex items-center gap-2 px-0.5 py-0.5">
          <span className="text-[11px] font-semibold tracking-wide text-[#666666] shrink-0">
            {fmtMonth(lastDay)}
          </span>
          <div className="h-px bg-[#CBCCC9] flex-1" />
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

function DayCell({
  day,
  isCurrentWeek,
  dayEvents,
  onOpen,
  onCreate,
}: {
  day: Date
  isCurrentWeek: boolean
  dayEvents: CalendarEvent[]
  onOpen: (rect: DOMRect) => void
  onCreate: () => void
}) {
  const today = new Date()
  const isToday = isSameDay(day, today)

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

  const fewEvents = dayEvents.length === 0
  const weekday =
    weekdays[(day.getDay() + 6) % 7] ??
    day.toLocaleDateString('default', { weekday: 'short' })

  const chipBg = 'bg-[#E7E8E5]'
  const dividerColor = 'bg-[#CBCCC9]'

  const Chip = ({
    ev,
    checkbox,
  }: {
    ev: CalendarEvent
    checkbox?: boolean
  }) => (
    <div
      className={`flex items-center gap-1 w-full px-1.5 py-[3px] rounded-[3px] ${chipBg}`}
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
    </div>
  )

  const EventItem = ({ ev }: { ev: CalendarEvent }) => (
    <div className="flex flex-col gap-0.5 w-full">
      <span className="text-[9px] font-mono text-[#666666] leading-none">
        {ev.begin!.split('T')[1].slice(0, 5)}
      </span>
      <Chip ev={ev} checkbox={ev.type === 'todo'} />
    </div>
  )

  return (
    <button
      className={`group flex flex-col text-left w-full cursor-pointer rounded-md border overflow-hidden ${
        isCurrentWeek
          ? 'bg-white border-[#CBCCC9]'
          : 'bg-[#F2F3F0] border-[#CBCCC9] h-40'
      }`}
      onClick={(e) =>
        fewEvents
          ? onCreate()
          : onOpen(e.currentTarget.getBoundingClientRect())
      }
    >
      {isCurrentWeek ? (
        <>
          <div
            className={`flex items-center gap-1 px-2 pt-1.5 pb-1 ${isToday ? 'bg-[var(--primary)] border-b border-[#CBCCC9]' : ''}`}
          >
            <span className="text-[13px] font-semibold text-[#111111]">
              {day.getDate()}
            </span>
            <span className="text-[13px] font-semibold text-[#111111]">
              {weekday}
            </span>
            {isToday && (
              <span className="text-[13px] font-semibold text-[#111111]">
                Today
              </span>
            )}
          </div>
          <div className="flex flex-col gap-1 flex-1 p-1.5 pt-1">
            <div className="min-h-6 flex flex-col gap-1">
              {allDayEvs.map((ev) => (
                <Chip key={ev.id} ev={ev} checkbox={ev.type === 'todo'} />
              ))}
            </div>
            <div className={`h-px ${dividerColor}`} />
          <div className="flex flex-col gap-1 flex-1">
            <span className="text-[8px] font-mono text-[#8A8B87] leading-none">
              am
            </span>
            <div className="flex flex-col gap-1 flex-1 pt-0.5 pb-1.5">
              {amEvs.map((ev) => (
                <EventItem key={ev.id} ev={ev} />
              ))}
            </div>
            <div className={`h-px ${dividerColor}`} />
            <span className="text-[8px] font-mono text-[#8A8B87] leading-none">
              pm
            </span>
            <div className="flex flex-col gap-1 flex-1 pt-1.5">
              {pmEvs.map((ev) => (
                <EventItem key={ev.id} ev={ev} />
              ))}
            </div>
          </div>
          </div>
        </>
      ) : (
        <span className="text-[13px] font-semibold text-[#666666] px-2 pt-1.5">
          {day.getDate()}
        </span>
      )}
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
