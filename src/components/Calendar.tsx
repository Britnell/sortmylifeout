import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getCalendarFn,
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

export default function Calendar() {
  const queryClient = useQueryClient()
  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newItemType, setNewItemType] = useState<'event' | 'todo'>('event')
  const [allDay, setAllDay] = useState(true)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [editAllDay, setEditAllDay] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const { data: events = [] } = useQuery({
    queryKey: ['getCalendar'],
    queryFn: () => getCalendarFn(),
  })

  console.log(events)
  const weekDays = useMemo(() => getWeekDays(weekOffset), [weekOffset])

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
    queryClient.invalidateQueries({ queryKey: ['getCalendar'] })

  const createMutation = useMutation({
    mutationFn: (data: {
      date: string
      time?: string
      allDay: boolean
      title: string
      detail?: string
      type?: string
    }) => createEventFn({ data }),
    onSuccess: () => {
      invalidate()
      setIsDialogOpen(false)
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
    }) => updateEventFn({ data }),
    onSuccess: () => {
      invalidate()
      setEditingEvent(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteEventFn({ data: { id } }),
    onSuccess: () => {
      invalidate()
      setEditingEvent(null)
      setConfirmDelete(false)
    },
  })

  const toggleDoneMutation = useMutation({
    mutationFn: (data: { id: number; completed: boolean }) =>
      toggleTodoDoneFn({ data }),
    onSuccess: invalidate,
  })

  const handleDayClick = (dateStr: string) => {
    setSelectedDate(dateStr)
    setIsDialogOpen(true)
  }

  const handleCreateSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const formData = new FormData(form)
    createMutation.mutate({
      date: selectedDate!,
      time: allDay ? undefined : (formData.get('time') as string) || undefined,
      allDay,
      title: formData.get('title') as string,
      detail: (formData.get('detail') as string) || undefined,
      type: newItemType,
    })
  }

  const handleEditClick = (ev: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditAllDay(!!ev.all_day)
    setEditingEvent(ev)
  }

  const handleEditSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingEvent) return
    const form = e.currentTarget
    const formData = new FormData(form)
    updateMutation.mutate({
      id: editingEvent.id,
      date: editingEvent.begin?.split('T')[0] ?? selectedDate!,
      time: editAllDay
        ? undefined
        : (formData.get('time') as string) || undefined,
      allDay: editAllDay,
      title: formData.get('title') as string,
      detail: (formData.get('detail') as string) || undefined,
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
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEditClick(ev, e)
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
                        handleEditClick(ev, e)
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
        })}
      </div>

      {/* Edit event dialog */}
      <Dialog isOpen={!!editingEvent} onClose={() => { setEditingEvent(null); setConfirmDelete(false) }}>
        {editingEvent && confirmDelete ? (
          <>
            <h3 className="text-lg font-semibold mb-2">Delete {editingEvent.type === 'todo' ? 'Todo' : 'Event'}?</h3>
            <p className="text-sm text-gray-600 mb-4">"{editingEvent.title}" will be permanently deleted.</p>
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
        ) : editingEvent && (
          <>
            <h3 className="text-lg font-semibold mb-4">
              Edit {editingEvent.type === 'todo' ? 'Todo' : 'Event'}
            </h3>
            <form onSubmit={handleEditSubmit} className="space-y-3">
              {editingEvent.type === 'todo' && (
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
              {editingEvent.type !== 'todo' && (
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editAllDay}
                    onChange={(e) => setEditAllDay(e.target.checked)}
                  />
                  All day
                </label>
              )}
              {!editAllDay && editingEvent.type !== 'todo' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Time
                  </label>
                  <input
                    type="time"
                    name="time"
                    defaultValue={
                      editingEvent.begin?.includes('T')
                        ? editingEvent.begin.split('T')[1]
                        : ''
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  name="title"
                  required
                  defaultValue={editingEvent.title}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  name="detail"
                  rows={3}
                  defaultValue={editingEvent.detail ?? ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                type="submit"
                disabled={updateMutation.isPending}
                className="w-full py-2 px-4 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {updateMutation.isPending ? 'Saving...' : 'Save'}
              </button>
            </form>
            <button
              className="mt-3 w-full py-2 px-4 bg-red-600 text-white font-medium rounded-md hover:bg-red-700"
              onClick={() => setConfirmDelete(true)}
            >
              Delete
            </button>
          </>
        )}
      </Dialog>

      {/* Create dialog */}
      <Dialog isOpen={isDialogOpen} onClose={() => setIsDialogOpen(false)}>
        <h3 className="text-lg font-semibold mb-1">Create</h3>
        <p className="text-sm text-gray-500 mb-4">
          {selectedDate &&
            new Date(selectedDate + 'T00:00:00').toLocaleDateString('default', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
        </p>

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
        <form onSubmit={handleCreateSubmit} className="space-y-3">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={allDay}
              onChange={(e) => setAllDay(e.target.checked)}
            />
            All day
          </label>
          {!allDay && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Time
              </label>
              <input
                type="time"
                name="time"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title
            </label>
            <input
              type="text"
              name="title"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Title"
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
              placeholder="Description"
            ></textarea>
          </div>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="w-full py-2 px-4 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {createMutation.isPending
              ? 'Creating...'
              : `Create ${newItemType === 'todo' ? 'Todo' : 'Event'}`}
          </button>
        </form>
      </Dialog>
    </>
  )
}
