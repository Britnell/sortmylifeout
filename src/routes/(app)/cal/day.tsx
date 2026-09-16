import { useState, useMemo } from 'react'
import { AlarmClock, ChevronLeft, ChevronRight } from 'lucide-react'
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
import { fmtDate, isSameDay } from '#/lib/date'

export const Route = createFileRoute('/(app)/cal/day')({
  component: RouteComponent,
})

const DAY_RANGE = 60

const SLOT_HEIGHT = 28 // px per 30-min slot
const SLOTS_PER_HOUR = 2
const TOTAL_SLOTS = 24 * SLOTS_PER_HOUR // 48

function getDayDate(dayOffset: number): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset)
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
}

function getRelativeLabel(d: Date, today: Date): string | null {
  if (isSameDay(d, today)) return 'Today'
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  if (isSameDay(d, tomorrow)) return 'Tomorrow'
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (isSameDay(d, yesterday)) return 'Yesterday'
  return null
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0])
}

// Round a time string "HH:MM" to nearest 30-min slot index (0 = 00:00, 1 = 00:30, ...)
function timeToSlot(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number)
  const totalMins = h * 60 + m
  return Math.round(totalMins / 30)
}

function RouteComponent() {
  const [selectedDate, setSelectedDate] = useState(() => fmtDate(new Date()))
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)

  const today = useMemo(() => getDayDate(0), [])

  const { data: events = [], refetch: invalidate } = useQuery({
    queryKey: [
      'searchEventsFn',
      fmtDate(getDayDate(-DAY_RANGE)),
      fmtDate(getDayDate(DAY_RANGE)),
    ],
    queryFn: () =>
      searchEventsFn({
        data: {
          date_from: fmtDate(getDayDate(-DAY_RANGE)),
          date_to: fmtDate(getDayDate(DAY_RANGE)),
        },
      }),
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

  const [selY, selM, selD] = selectedDate.split('-').map(Number)
  const selectedDay = new Date(selY, selM - 1, selD)
  const days = Array.from({ length: 7 }, (_, i) => addDays(selectedDay, i))

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

  const openCreate = () => {
    setEditingEvent(null)
    setDialogOpen(true)
  }

  const openEdit = (ev: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingEvent(ev)
    setDialogOpen(true)
  }

  const toggleTodo = (ev: CalendarEvent, checked: boolean) => {
    updateMutation.mutate({
      id: ev.id,
      begin: ev.begin ?? '',
      allDay: !ev.begin?.includes('T'),
      title: ev.title,
      detail: ev.detail ?? undefined,
      completed: checked,
    })
  }

  const renderAllDayItem = (ev: CalendarEvent) => {
    const isTodo = ev.type === 'todo'
    const done = isTodo && !!ev.completed
    return (
      <div
        key={ev.id}
        className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 cursor-pointer ${
          done || !isTodo ? 'bg-[#E7E8E5]' : 'bg-white'
        }`}
        onClick={(e) => openEdit(ev, e)}
      >
        {isTodo && (
          <button
            className={`h-3.5 w-3.5 shrink-0 rounded-[3px] border border-[#CBCCC9] flex items-center justify-center ${
              done ? 'bg-[#111111] border-[#111111]' : 'bg-white'
            }`}
            onClick={(e) => {
              e.stopPropagation()
              toggleTodo(ev, !ev.completed)
            }}
          >
            {done && (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                <path
                  d="M20 6 9 17l-5-5"
                  stroke="#FFFFFF"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </button>
        )}
        <span className="text-[13px] text-[#111111]">{ev.title}</span>
      </div>
    )
  }

  const hours = Array.from({ length: 24 }, (_, i) => i)

  const renderDay = (d: Date) => {
    const dateKey = fmtDate(d)
    const dayEvents = eventsByDate.get(dateKey) ?? []
    const isToday = isSameDay(d, today)

    const allDayEvs = dayEvents.filter(
      (ev) => ev.all_day || !ev.begin?.includes('T'),
    )
    const timedEvs = dayEvents
      .filter((ev) => !ev.all_day && ev.begin?.includes('T'))
      .sort((a, b) => (a.begin ?? '').localeCompare(b.begin ?? ''))

    return (
      <div key={dateKey} className="w-[560px] max-w-full">
        <div className="bg-white rounded-lg border border-[#CBCCC9]">
          <div className="flex items-center justify-between bg-[var(--primary)] rounded-t-lg px-3 py-2.5">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-[#111111]">
                {d.toLocaleDateString('default', { weekday: 'long' })}
              </span>
              <span className="text-sm font-semibold text-[#111111]">
                {ordinal(d.getDate())}
              </span>
            </div>
            {(() => {
              const rel = getRelativeLabel(d, today)
              return rel ? (
                <span className="text-xs text-[#666666]">{rel}</span>
              ) : null
            })()}
          </div>

          {/* All-day events */}
          {allDayEvs.length > 0 && (
            <div className="flex flex-col gap-2 p-3 pb-0">
              {allDayEvs.map(renderAllDayItem)}
            </div>
          )}

          {/* Hourly timeline */}
          <div className="relative flex p-3">
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
              {hours.map((h) => (
                <div
                  key={h}
                  className="absolute left-0 right-0 border-t border-gray-200"
                  style={{ top: h * SLOTS_PER_HOUR * SLOT_HEIGHT }}
                />
              ))}
              {hours.map((h) => (
                <div
                  key={`h${h}`}
                  className="absolute left-0 right-0 border-t border-gray-100"
                  style={{ top: (h * SLOTS_PER_HOUR + 1) * SLOT_HEIGHT }}
                />
              ))}

              {/* Now indicator */}
              {isToday && (
                <div
                  className="absolute left-0 right-0 border-t border-red-400 z-10"
                  style={{
                    top:
                      (new Date().getHours() * 60 + new Date().getMinutes()) /
                      30 *
                      SLOT_HEIGHT,
                  }}
                />
              )}

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
                const isTodo = ev.type === 'todo'
                const done = isTodo && !!ev.completed

                return (
                  <div
                    key={ev.id}
                    className={`absolute left-1 right-1 rounded px-1.5 py-0.5 text-xs cursor-pointer overflow-hidden ${
                      done || !isTodo
                        ? 'bg-[#E7E8E5] text-[#111111]'
                        : 'bg-white text-[#111111] border border-[#CBCCC9] hover:bg-[#F5F5F4]'
                    }`}
                    style={{
                      top: startSlot * SLOT_HEIGHT + 1,
                      height: heightSlots * SLOT_HEIGHT - 2,
                    }}
                    onClick={(e) => openEdit(ev, e)}
                  >
                    <div className="font-medium truncate">{ev.title}</div>
                    <div className="text-[#666666]">
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
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4">
        <CalendarMenuBar onAdd={openCreate} />
      </div>

      <div className="flex items-center gap-4 px-4 py-3">
        <h1 className="flex items-center gap-1.5 text-[28px] font-bold text-[#111111]">
          <AlarmClock size={20} strokeWidth={2} className="shrink-0" />
          day
        </h1>
        <div className="flex-1 h-px bg-[#CBCCC9]" />
        <div className="flex items-center gap-3">
          <button
            className="text-[#666666] hover:text-[#111111]"
            onClick={() => setSelectedDate(fmtDate(addDays(selectedDay, -1)))}
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-[15px] font-semibold text-[#111111]">
            {selectedDay.toLocaleDateString('default', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })}
          </span>
          <button
            className="text-[#666666] hover:text-[#111111]"
            onClick={() => setSelectedDate(fmtDate(addDays(selectedDay, 1)))}
          >
            <ChevronRight size={18} />
          </button>
        </div>
        <button
          className="text-[12px] font-medium text-[#111111] bg-[var(--primary)] rounded-md px-3 py-1.5"
          onClick={() => setSelectedDate(fmtDate(today))}
        >
          Today
        </button>
        <div className="flex-1 h-px bg-[#CBCCC9]" />
      </div>

      <div className="h-[calc(100vh-180px)] overflow-y-auto scroll-smooth pb-4">
        <div className="flex flex-col items-center gap-2 pt-1 px-4">
          {days.map(renderDay)}
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
