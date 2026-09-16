import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
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

export const Route = createFileRoute('/(app)/cal/schedule')({
  component: RouteComponent,
})

const DAY_RANGE = 60

function getDayDate(dayOffset: number): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset)
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

function getDuration(begin: string, end: string): string {
  const diffMin = Math.round(
    (new Date(end).getTime() - new Date(begin).getTime()) / 60000,
  )
  if (diffMin < 60) return `${diffMin}m`
  const h = Math.floor(diffMin / 60)
  const m = diffMin % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
}

function fmtHeadingDate(d: Date): string {
  const weekday = d.toLocaleDateString('default', { weekday: 'short' })
  const day = d.getDate()
  const month = d.toLocaleDateString('default', { month: 'short' })
  return `${weekday}, ${day} ${month}`
}

function RouteComponent() {
  const [selectedDate, setSelectedDate] = useState(() => fmtDate(new Date()))
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)

  const today = new Date()

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

  const eventsByDate = new Map<string, CalendarEvent[]>()
  ;(events as CalendarEvent[]).forEach((ev) => {
    const dateKey = ev.begin?.split('T')[0]
    if (!dateKey) return
    if (!eventsByDate.has(dateKey)) eventsByDate.set(dateKey, [])
    eventsByDate.get(dateKey)!.push(ev)
  })

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

  const renderTimedItem = (ev: CalendarEvent) => {
    const isTodo = ev.type === 'todo'
    const done = isTodo && !!ev.completed
    return (
      <div key={ev.id} className="flex flex-col gap-0.5">
        <span className="font-mono text-[10px] text-[#666666]">
          {ev.begin!.split('T')[1].slice(0, 5)}
        </span>
        <div
          className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 w-fit cursor-pointer ${
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
          {ev.end?.includes('T') && (
            <span className="text-[11px] text-[#666666]">
              {getDuration(ev.begin!, ev.end)}
            </span>
          )}
        </div>
      </div>
    )
  }

  let prevMonth = -1

  return (
    <div>
      <div className="mb-4">
        <CalendarMenuBar onAdd={openCreate} />
      </div>

      <div className="flex items-center gap-4 px-4 py-3">
        <h1 className="text-[28px] font-bold text-[#111111]">schedule</h1>
        <div className="flex-1 h-px bg-[#CBCCC9]" />
        <div className="flex items-center gap-3">
          <button
            className="text-[#666666] hover:text-[#111111]"
            onClick={() => setSelectedDate(fmtDate(addDays(selectedDay, -1)))}
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-[15px] font-semibold text-[#111111]">
            {fmtHeadingDate(selectedDay)}
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
          {days.map((d) => {
            const dateKey = fmtDate(d)
            const dayEvents = eventsByDate.get(dateKey) ?? []
            const isToday = isSameDay(d, today)
            // skip empty days (keep today + selected always)
            if (dayEvents.length === 0 && !isToday && dateKey !== selectedDate)
              return null

            const allDayEvs = dayEvents.filter(
              (ev) => ev.all_day || !ev.begin?.includes('T'),
            )
            const timedEvs = dayEvents
              .filter((ev) => !ev.all_day && ev.begin?.includes('T'))
              .sort((a, b) => (a.begin ?? '').localeCompare(b.begin ?? ''))

            const showMonthRow = d.getMonth() !== prevMonth
            prevMonth = d.getMonth()

            return (
              <div key={dateKey} className="w-[560px] max-w-full">
                {showMonthRow && (
                  <div className="flex justify-end">
                    <span className="text-[16px] font-semibold text-[#111111]">
                      {d.toLocaleDateString('default', { month: 'long' })}
                    </span>
                  </div>
                )}
                <div className="mt-2 bg-white rounded-lg border border-[#CBCCC9]">
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
                  <div className="flex flex-col gap-2 p-3">
                    {dayEvents.length === 0 ? (
                      <span className="text-[13px] text-[#666666]">
                        Nothing scheduled
                      </span>
                    ) : (
                      <>
                        {allDayEvs.map(renderAllDayItem)}
                        {timedEvs.map(renderTimedItem)}
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
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
