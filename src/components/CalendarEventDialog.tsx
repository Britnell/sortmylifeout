import { useState, useRef, useEffect } from 'react'
import type { UseMutationResult } from '@tanstack/react-query'
import Dialog from '@/components/Dialog'

export interface CalendarEvent {
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

function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
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

interface Props {
  isOpen: boolean
  onClose: () => void
  editingEvent: CalendarEvent | null
  selectedDate: string | null
  createMutation: UseMutationResult<any, any, any, any>
  updateMutation: UseMutationResult<any, any, any, any>
  deleteMutation: UseMutationResult<any, any, any, any>
}

export default function CalendarEventDialog({
  isOpen,
  onClose,
  editingEvent,
  selectedDate,
  createMutation,
  updateMutation,
  deleteMutation,
}: Props) {
  const [itemType, setItemType] = useState<'event' | 'todo'>('event')
  const [allDay, setAllDay] = useState(true)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [beginDate, setBeginDate] = useState<string>('')
  const [beginTime, setBeginTime] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [endTime, setEndTime] = useState<string>('')
  const [duration, setDuration] = useState<string>('0')
  const [localEditing, setLocalEditing] = useState<CalendarEvent | null>(null)
  const timeRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isOpen) return
    if (editingEvent) {
      setLocalEditing(editingEvent)
      setItemType(editingEvent.type as 'event' | 'todo')
      setAllDay(!!editingEvent.all_day)
      setBeginDate(editingEvent.begin?.split('T')[0] ?? '')
      setBeginTime(
        editingEvent.begin?.includes('T')
          ? editingEvent.begin.split('T')[1]
          : '',
      )
      setEndDate(editingEvent.end?.split('T')[0] ?? '')
      setEndTime(
        editingEvent.end?.includes('T') ? editingEvent.end.split('T')[1] : '',
      )
      setDuration('')
      setShowDeleteConfirm(false)
    } else {
      setLocalEditing(null)
      setItemType('event')
      setAllDay(true)
      setBeginDate(selectedDate ?? '')
      setBeginTime('')
      setDuration('0')
      const { endDate: ed } = computeEnd(selectedDate ?? '', '', true, '0')
      setEndDate(ed)
      setEndTime('')
      setShowDeleteConfirm(false)
    }
  }, [isOpen, editingEvent, selectedDate])

  const handleClose = () => {
    setShowDeleteConfirm(false)
    onClose()
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const title = formData.get('title') as string
    const detail = (formData.get('detail') as string) || undefined

    let end: string | undefined
    if (endDate) {
      end = allDay ? endDate : endTime ? `${endDate}T${endTime}` : undefined
    }

    const begin = beginDate
      ? allDay
        ? beginDate
        : beginTime
          ? `${beginDate}T${beginTime}`
          : beginDate
      : undefined

    if (localEditing) {
      updateMutation.mutate({
        id: localEditing.id,
        begin: begin ?? localEditing.begin ?? '',
        allDay,
        title,
        detail,
        type: itemType,
        end,
        completed: localEditing.completed ? true : undefined,
      })
    } else {
      createMutation.mutate({
        begin,
        allDay,
        end,
        title,
        detail,
        type: itemType,
      })
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} closeOnOutsideClick>
      <form onSubmit={handleSubmit} className="space-y-3">
        <h3 className="text-lg font-semibold">
          {localEditing
            ? `Edit ${itemType === 'todo' ? 'Todo' : 'Event'}`
            : 'Create'}
        </h3>

        <div className="flex gap-0 border border-gray-300 rounded-md overflow-hidden">
          <label
            className={`flex-1 py-2 px-4 text-sm cursor-pointer text-center font-medium transition-colors ${itemType === 'event' ? 'bg-blue-50 border-r border-gray-300 text-blue-700' : 'border-r border-gray-300 text-gray-600 '}`}
          >
            <input
              type="radio"
              name="itemType"
              value="event"
              checked={itemType === 'event'}
              onChange={() => setItemType('event')}
              className="sr-only"
            />
            Event
          </label>
          <label
            className={`flex-1 py-2 px-4 text-sm cursor-pointer text-center font-medium transition-colors ${itemType === 'todo' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 '}`}
          >
            <input
              type="radio"
              name="itemType"
              value="todo"
              checked={itemType === 'todo'}
              onChange={() => setItemType('todo')}
              className="sr-only"
            />
            Todo
          </label>
        </div>

        {localEditing?.type === 'todo' && (
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={!!localEditing.completed}
              onChange={(e) =>
                setLocalEditing({
                  ...localEditing,
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
          defaultValue={localEditing?.title ?? ''}
          key={localEditing?.id ?? 'new'}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Title"
        />

        <div>
          <label className="block mb-1 text-sm font-medium text-gray-700">
            {itemType === 'todo' ? 'Date' : 'Start'}
          </label>
          {itemType === 'todo' && !beginDate ? (
            <button
              type="button"
              className="w-full py-2 px-3 border border-gray-300 rounded-md text-sm text-gray-600 hover:bg-gray-50"
              onClick={() => {
                const today = fmtDate(new Date())
                setBeginDate(today)
                setEndDate(today)
              }}
            >
              + Add date
            </button>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              <input
                type="date"
                value={beginDate}
                required={itemType === 'event'}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
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
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
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
              {itemType === 'todo' && (
                <button
                  type="button"
                  className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-sm font-medium text-gray-600"
                  onClick={() => {
                    setBeginDate('')
                    setBeginTime('')
                    setEndDate('')
                    setEndTime('')
                    setDuration('0')
                  }}
                >
                  ✕
                </button>
              )}
              {itemType === 'event' && (
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
              )}
            </div>
          )}
        </div>

        {itemType !== 'todo' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End
            </label>
            <div className="grid grid-cols-3 gap-2">
              <input
                type="date"
                value={endDate}
                required={itemType === 'event'}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                onChange={(e) => {
                  setEndDate(e.target.value)
                  setDuration('')
                }}
              />
              <input
                type="time"
                value={endTime}
                required={itemType === 'event' && !allDay}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                onChange={(e) => {
                  setEndTime(e.target.value)
                  setDuration('')
                }}
              />
              <select
                value={duration}
                className="w-full px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
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
        )}

        <textarea
          name="detail"
          rows={3}
          defaultValue={localEditing?.detail ?? ''}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Description"
        />

        <button
          type="submit"
          disabled={isPending}
          className="w-full py-2 px-4 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {isPending
            ? localEditing
              ? 'Saving...'
              : 'Creating...'
            : localEditing
              ? 'Save'
              : `Create ${itemType === 'todo' ? 'Todo' : 'Event'}`}
        </button>

        {localEditing &&
          (showDeleteConfirm ? (
            <div className="pt-2">
              <div className="flex gap-2">
                <button
                  type="button"
                  className="flex-1 py-2 px-4 border rounded-md hover:bg-gray-50"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="flex-1 py-2 px-4 bg-red-600 text-white font-medium rounded-md hover:bg-red-700 disabled:opacity-50"
                  disabled={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate(localEditing.id)}
                >
                  {deleteMutation.isPending ? 'Deleting...' : 'Yes, delete'}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="w-full py-2 px-4 bg-red-600 text-white font-medium rounded-md hover:bg-red-700"
              onClick={() => setShowDeleteConfirm(true)}
            >
              Delete
            </button>
          ))}
      </form>
    </Dialog>
  )
}
