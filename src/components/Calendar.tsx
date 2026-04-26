import { useState, useMemo, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  searchEventsFn,
  createEventFn,
  updateEventFn,
  deleteEventFn,
  toggleTodoDoneFn,
} from '@/serverFn/queries.functions'
import Dialog from '@/components/Dialog'

interface CalendarEvent {
  id: number
  user_id: string
  type: string
  all_day: number
  begin: string | null
  end: string | null
  title: string
  detail: string | null
  completed: number
}

const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function getWeekDays(weekOffset: number): Date[] {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + mondayOffset + weekOffset * 7,
  )
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(d.getDate() + i)
    return d
  })
}

function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function computeEnd(
  beginDate: string,
  beginTime: string,
  isAllDay: boolean,
  duration: string,
): { endDate: string; endTime: string } {
  if (!duration || !beginDate) return { endDate: '', endTime: '' }
  if (isAllDay) {
    const d = new Date(beginDate + 'T00:00:00')
    d.setDate(d.getDate() + parseInt(duration))
    return { endDate: fmtDate(d), endTime: '' }
  } else {
    const mins = parseInt(duration)
    if (!beginTime) return { endDate: beginDate, endTime: '' }
    const [h, m] = beginTime.split(':').map(Number)
    const totalMins = h * 60 + m + mins
    const endH = Math.floor(totalMins / 60) % 24
    const endM = totalMins % 60
    const dayOverflow = Math.floor(totalMins / (24 * 60))
    const d = new Date(beginDate + 'T00:00:00')
    d.setDate(d.getDate() + dayOverflow)
    return {
      endDate: fmtDate(d),
      endTime: `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`,
    }
  }
}

export default function Calendar() {
  const queryClient = useQueryClient()
  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [itemType, setItemType] = useState<'event' | 'todo'>('event')
  const [allDay, setAllDay] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [beginDate, setBeginDate] = useState<string>('')
  const [beginTime, setBeginTime] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [endTime, setEndTime] = useState<string>('')
  const [duration, setDuration] = useState<string>('0')
  const timeRef = useRef<HTMLInputElement>(null)

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

  const { data: events = [] } = useQuery({
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

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ['getCalendar', date_from, date_to],
    })

  const createMutation = useMutation({
    mutationFn: (data: {
      date: string
      time?: string
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
      date: string
      time?: string
      allDay: boolean
      title: string
      detail?: string
      type?: string
      end?: string
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

  const toggleDoneMutation = useMutation({
    mutationFn: (data: { id: number; completed: boolean }) =>
      toggleTodoDoneFn({ data }),
    onSuccess: invalidate,
  })

  const closeDialog = () => {
    setDialogOpen(false)
    setEditingEvent(null)
    setConfirmDelete(false)
  }

  const openCreate = (dateStr: string) => {
    setSelectedDate(dateStr)
    setEditingEvent(null)
    setItemType('event')
    setAllDay(true)
    setBeginDate(dateStr)
    setBeginTime('')
    setDuration('0')
    const { endDate: ed } = computeEnd(dateStr, '', true, '0')
    setEndDate(ed)
    setEndTime('')
    setDialogOpen(true)
  }

  const openEdit = (ev: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingEvent(ev)
    setItemType(ev.type as 'event' | 'todo')
    setAllDay(!!ev.all_day)
    setBeginDate(ev.begin?.split('T')[0] ?? '')
    setBeginTime(ev.begin?.includes('T') ? ev.begin.split('T')[1] : '')
    setEndDate(ev.end?.split('T')[0] ?? '')
    setEndTime(ev.end?.includes('T') ? ev.end.split('T')[1] : '')
    setDuration('')
    setConfirmDelete(false)
    setDialogOpen(true)
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const title = formData.get('title') as string
    const detail = (formData.get('detail') as string) || undefined

    if (editingEvent) {
      let end: string | undefined
      if (endDate) {
        end = allDay ? endDate : endTime ? `${endDate}T${endTime}` : undefined
      }
      updateMutation.mutate({
        id: editingEvent.id,
        date: beginDate,
        time: allDay ? undefined : beginTime || undefined,
        allDay,
        title,
        detail,
        type: itemType,
        end,
      })
    } else {
      let end: string | undefined
      if (endDate) {
        end = allDay ? endDate : endTime ? `${endDate}T${endTime}` : undefined
      }
      createMutation.mutate({
        date: beginDate,
        time: allDay ? undefined : beginTime || undefined,
        allDay,
        end,
        title,
        detail,
        type: itemType,
      })
    }
  }

  const today = new Date()
  const firstDay = allWeekDays[0][0]
  const lastDay = allWeekDays[2][6]
  const weekLabel = `${firstDay.toLocaleDateString('default', { month: 'short', day: 'numeric' })} - ${lastDay.toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' })}`
  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">{weekLabel}</h2>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {weekdays.map((day) => (
          <div
            key={day}
            className="text-center font-medium p-2  rounded-t text-sm"
          >
            {day}
          </div>
        ))}

        {allWeekDays.map((weekDays, wi) =>
          weekDays.map((day, i) => {
            const dateStr = fmtDate(day)
            const dayEvents = eventsByDate.get(dateStr) || []
            const isToday = isSameDay(day, today)

            return (
              <div
                key={`${wi}-${i}`}
                className={`border p-2 min-h-[120px] cursor-pointer rounded ${isToday ? 'border-blue-300' : ''}`}
                onClick={() => openCreate(dateStr)}
              >
                <div
                  className={`text-sm font-medium ${isToday ? 'text-blue-600' : ''}`}
                >
                  {day.getDate()}
                </div>
                <div className="mt-1 space-y-1">
                  {dayEvents.map((ev) =>
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
                            toggleDoneMutation.mutate({
                              id: ev.id,
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
                        {!ev.all_day && ev.begin?.includes('T') && (
                          <span className="opacity-70 mr-1">
                            {ev.begin.split('T')[1]}
                          </span>
                        )}
                        {ev.title}
                      </div>
                    ),
                  )}
                </div>
              </div>
            )
          }),
        )}
      </div>

      <Dialog isOpen={dialogOpen} onClose={closeDialog}>
        {editingEvent && confirmDelete ? (
          <>
            <h3 className="text-lg font-semibold mb-2">
              Delete {editingEvent.type === 'todo' ? 'Todo' : 'Event'}?
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              "{editingEvent.title}" will be permanently deleted.
            </p>
            <div className="flex gap-2">
              <button
                className="flex-1 py-2 px-4 bg-red-600 text-white font-medium rounded-md hover:bg-red-700 disabled:opacity-50"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(editingEvent.id)}
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Yes, delete'}
              </button>
              <button
                className="flex-1 py-2 px-4 border rounded-md hover:bg-gray-50"
                onClick={() => setConfirmDelete(false)}
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <h3 className="text-lg font-semibold">
              {editingEvent
                ? `Edit ${itemType === 'todo' ? 'Todo' : 'Event'}`
                : 'Create'}
            </h3>

            <div className="flex gap-4">
              <label className="flex items-center gap-1 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="itemType"
                  value="event"
                  checked={itemType === 'event'}
                  onChange={() => setItemType('event')}
                />
                Event
              </label>
              <label className="flex items-center gap-1 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="itemType"
                  value="todo"
                  checked={itemType === 'todo'}
                  onChange={() => setItemType('todo')}
                />
                Todo
              </label>
            </div>

            {editingEvent?.type === 'todo' && (
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!editingEvent.completed}
                  onChange={(e) =>
                    setEditingEvent({
                      ...editingEvent,
                      completed: e.target.checked ? 1 : 0,
                    })
                  }
                />
                Completed
              </label>
            )}

            <input
              type="text"
              name="title"
              required
              defaultValue={editingEvent?.title ?? ''}
              key={editingEvent?.id ?? 'new'}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Title"
            />

            {itemType !== 'todo' && (
              <>
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    From
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={beginDate}
                      required
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      onChange={(e) => {
                        setBeginDate(e.target.value)
                        if (duration) {
                          const { endDate: ed, endTime: et } = computeEnd(
                            e.target.value,
                            beginTime,
                            allDay,
                            duration,
                          )
                          setEndDate(ed)
                          setEndTime(et)
                        }
                      }}
                    />
                    <input
                      ref={timeRef}
                      type="time"
                      value={beginTime}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      onChange={(e) => {
                        const t = e.target.value
                        setBeginTime(t)
                        if (t) {
                          setAllDay(false)
                          const dur = duration === '0' ? '30' : duration
                          setDuration(dur)
                          const { endDate: ed, endTime: et } = computeEnd(
                            beginDate,
                            t,
                            false,
                            dur,
                          )
                          setEndDate(ed)
                          setEndTime(et)
                        }
                      }}
                    />
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={allDay}
                        onChange={(e) => {
                          const next = e.target.checked
                          setAllDay(next)
                          const bt = next ? '' : beginTime
                          if (next) {
                            setBeginTime('')
                            setEndTime('')
                          }
                          const defaultDuration = next ? '0' : '30'
                          setDuration(defaultDuration)
                          const { endDate: ed, endTime: et } = computeEnd(
                            beginDate,
                            bt,
                            next,
                            defaultDuration,
                          )
                          setEndDate(ed)
                          setEndTime(et)
                        }}
                      />
                      All day
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    To
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={endDate}
                      required={itemType === 'event'}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      onChange={(e) => {
                        setEndDate(e.target.value)
                        setDuration('')
                      }}
                    />
                    <input
                      type="time"
                      value={endTime}
                      required={itemType === 'event' && !allDay}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      onChange={(e) => {
                        setEndTime(e.target.value)
                        setDuration('')
                      }}
                    />
                    <select
                      value={duration}
                      className="px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      onChange={(e) => {
                        const d = e.target.value
                        setDuration(d)
                        if (d) {
                          const { endDate: ed, endTime: et } = computeEnd(
                            beginDate,
                            beginTime,
                            allDay,
                            d,
                          )
                          setEndDate(ed)
                          setEndTime(et)
                        }
                      }}
                    >
                      <option value="">— manual —</option>
                      {allDay ? (
                        <>
                          <option value="0">1 day</option>
                          <option value="1">2 days</option>
                          <option value="2">3 days</option>
                          <option value="6">1 week</option>
                        </>
                      ) : (
                        <>
                          <option value="15">15 min</option>
                          <option value="30">30 min</option>
                          <option value="60">1 hour</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>
              </>
            )}

            <textarea
              name="detail"
              rows={3}
              defaultValue={editingEvent?.detail ?? ''}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Description"
            />

            <button
              type="submit"
              disabled={isPending}
              className="w-full py-2 px-4 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isPending
                ? editingEvent
                  ? 'Saving...'
                  : 'Creating...'
                : editingEvent
                  ? 'Save'
                  : `Create ${itemType === 'todo' ? 'Todo' : 'Event'}`}
            </button>

            {editingEvent && (
              <button
                type="button"
                className="w-full py-2 px-4 bg-red-600 text-white font-medium rounded-md hover:bg-red-700"
                onClick={() => setConfirmDelete(true)}
              >
                Delete
              </button>
            )}
          </form>
        )}
      </Dialog>
    </>
  )
}
