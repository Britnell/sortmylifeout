import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getCalendarFn, createEventFn } from '@/serverFn/queries.functions'
import Dialog from '@/components/Dialog'

interface CalendarEvent {
  id: number
  user_id: string
  type: string
  date: string
  end: string | null
  title: string
  detail: string | null
  repeating: string | null
  done: number
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

export default function Calendar() {
  const queryClient = useQueryClient()
  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newItemType, setNewItemType] = useState<'event' | 'todo'>('event')

  const { data: events = [] } = useQuery({
    queryKey: ['getCalendar'],
    queryFn: () => getCalendarFn(),
  })

  const weekDays = useMemo(() => getWeekDays(weekOffset), [weekOffset])

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    ;(events as CalendarEvent[]).forEach((ev) => {
      const dateKey = ev.date?.split('T')[0]
      if (!dateKey) return
      if (!map.has(dateKey)) map.set(dateKey, [])
      map.get(dateKey)!.push(ev)
    })
    return map
  }, [events])

  const createMutation = useMutation({
    mutationFn: (data: { date: string; title: string; detail?: string }) =>
      createEventFn({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['getCalendar'] })
      setIsDialogOpen(false)
    },
  })

  const handleDayClick = (dateStr: string) => {
    setSelectedDate(dateStr)
    setIsDialogOpen(true)
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const formData = new FormData(form)
    createMutation.mutate({
      date: selectedDate!,
      title: formData.get('title') as string,
      detail: (formData.get('detail') as string) || undefined,
      type: newItemType,
    })
  }

  const today = new Date()
  const weekLabel = `${weekDays[0].toLocaleDateString('default', {
    month: 'short',
    day: 'numeric',
  })} - ${weekDays[6].toLocaleDateString('default', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })}`

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">{weekLabel}</h2>
        <div className="flex gap-2">
          <button
            className="px-3 py-1 rounded  text-sm"
            onClick={() => setWeekOffset((w) => w - 1)}
          >
            &larr; Prev
          </button>
          <button
            className="px-3 py-1  rounded  text-sm"
            onClick={() => setWeekOffset(0)}
          >
            Today
          </button>
          <button
            className="px-3 py-1  rounded  text-sm"
            onClick={() => setWeekOffset((w) => w + 1)}
          >
            Next &rarr;
          </button>
        </div>
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

        {weekDays.map((day, i) => {
          const dateStr = fmtDate(day)
          const dayEvents = eventsByDate.get(dateStr) || []
          const isToday = isSameDay(day, today)

          return (
            <div
              key={i}
              className={`border p-2 min-h-[120px] cursor-pointer  rounded-b ${isToday ? ' border-blue-300' : 'b'}`}
              onClick={() => handleDayClick(dateStr)}
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
                    >
                      <input type="checkbox" readOnly checked={!!ev.done} className="pointer-events-none shrink-0" />
                      <span className="truncate">{ev.title}</span>
                    </div>
                  ) : (
                    <div
                      key={ev.id}
                      className="text-xs bg-blue-100 text-blue-800 p-1 rounded truncate"
                    >
                      {ev.title}
                    </div>
                  ),
                )}
              </div>
            </div>
          )
        })}
      </div>

      <Dialog isOpen={isDialogOpen} onClose={() => setIsDialogOpen(false)}>
        <h3 className="text-lg font-semibold mb-4">
          {selectedDate &&
            new Date(selectedDate + 'T00:00:00').toLocaleDateString('default', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
        </h3>

        {selectedDate && (eventsByDate.get(selectedDate) || []).length > 0 && (
          <div className="space-y-2 mb-4">
            {(eventsByDate.get(selectedDate) || []).map((ev) => (
              <div key={ev.id} className="border p-3 rounded">
                {ev.type === 'todo' ? (
                  <div className="flex items-center gap-2">
                    <input type="checkbox" readOnly checked={!!ev.done} className="pointer-events-none" />
                    <h4 className="font-medium">{ev.title}</h4>
                  </div>
                ) : (
                  <h4 className="font-medium">{ev.title}</h4>
                )}
                {ev.detail && (
                  <p className="text-sm text-gray-600">{ev.detail}</p>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-4">
          <div className="flex gap-4 mb-3">
            <label className="flex items-center gap-1 text-sm cursor-pointer">
              <input
                type="radio"
                name="newItemType"
                value="event"
                checked={newItemType === 'event'}
                onChange={() => setNewItemType('event')}
              />
              Event
            </label>
            <label className="flex items-center gap-1 text-sm cursor-pointer">
              <input
                type="radio"
                name="newItemType"
                value="todo"
                checked={newItemType === 'todo'}
                onChange={() => setNewItemType('todo')}
              />
              Todo
            </label>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title
              </label>
              <input
                type="text"
                name="title"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Event title"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                name="detail"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Event description"
              ></textarea>
            </div>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="w-full py-2 px-4 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {createMutation.isPending ? 'Creating...' : `Create ${newItemType === 'todo' ? 'Todo' : 'Event'}`}
            </button>
          </form>
        </div>

        <button
          className="mt-4 px-4 py-2  rounded "
          onClick={() => setIsDialogOpen(false)}
        >
          Close
        </button>
      </Dialog>
    </>
  )
}
