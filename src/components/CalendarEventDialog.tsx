import { localToday } from '@/lib/date'
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
  completed: string | null
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
  const [title, setTitle] = useState('')
  const [detail, setDetail] = useState('')
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
      setTitle(editingEvent.title ?? '')
      setDetail(editingEvent.detail ?? '')
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
      setTitle('')
      setDetail('')
    }
  }, [isOpen, editingEvent, selectedDate])

  const handleClose = () => {
    setShowDeleteConfirm(false)
    onClose()
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const detailValue = detail.trim() ? detail : undefined

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
        detail: detailValue,
        type: itemType,
        end,
        completed: localEditing.completed ? localToday() : undefined,
      })
    } else {
      createMutation.mutate({
        begin,
        allDay,
        end,
        title,
        detail: detailValue,
        type: itemType,
      })
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} closeOnOutsideClick>
      <form onSubmit={handleSubmit}>
        <div className="flex items-center justify-between bg-[var(--primary)] px-3 py-2">
          <h3 className="text-lg font-semibold text-[#111]">
            {localEditing
              ? `Edit ${itemType === 'todo' ? 'Todo' : 'Event'}`
              : 'Create Event'}
          </h3>
          <button
            type="button"
            className="text-[#999] text-base leading-none hover:text-[#666]"
            onClick={handleClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-[13px] p-[13px]">
        <div className="flex gap-[3px] h-[38px] rounded-lg bg-[#F2F3F0] p-[3px]">
          <label
            className={`flex-1 rounded-md flex items-center justify-center text-[13px] font-medium cursor-pointer transition-colors ${itemType === 'event' ? 'bg-white text-[#111]' : 'text-[#888]'}`}
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
            className={`flex-1 rounded-md flex items-center justify-center text-[13px] font-medium cursor-pointer transition-colors ${itemType === 'todo' ? 'bg-white text-[#111]' : 'text-[#888]'}`}
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
          <label className="flex items-center gap-1.5 text-[13px] cursor-pointer text-[#666]">
            <input
              type="checkbox"
              checked={!!localEditing.completed}
              onChange={(e) =>
                setLocalEditing({
                  ...localEditing,
                  completed: e.target.checked ? localToday() : null,
                })
              }
            />
            Completed
          </label>
        )}

        <div>
          <label className="block mb-1.5 text-xs font-medium text-[#666]">Title</label>
          <input
            type="text"
            name="title"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full h-9 px-3 rounded-lg border border-[#DDDDD8] bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            placeholder="Title"
          />
        </div>

        <div>
          <label className="block mb-1.5 text-xs font-medium text-[#666]">
            {itemType === 'todo' ? 'Date' : 'Start'}
          </label>
          {itemType === 'todo' && !beginDate ? (
            <button
              type="button"
              className="w-full h-9 rounded-lg border border-[#DDDDD8] text-[13px] text-[#666] hover:bg-[#F2F3F0]"
              onClick={() => {
                const today = fmtDate(new Date())
                setBeginDate(today)
                setEndDate(today)
              }}
            >
              + Add date
            </button>
          ) : (
            <div className="flex gap-2 items-center">
              <div className="flex flex-1 gap-2">
                <input
                  type="date"
                  value={beginDate}
                  required={itemType === 'event'}
                  className="w-full h-9 px-3 rounded-lg border border-[#DDDDD8] text-[13px] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
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
                  className="w-full h-9 px-3 rounded-lg border border-[#DDDDD8] text-[13px] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
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
              </div>
              {itemType === 'todo' && (
                <button
                  type="button"
                  className="flex-1 h-9 px-3 rounded-lg border border-[#DDDDD8] hover:bg-[#F2F3F0] text-[13px] font-medium text-[#666]"
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
                <label className="ml-3 flex-1 flex items-center gap-1.5 text-[13px] cursor-pointer text-[#666]">
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
            <div className="flex">
              <div className="flex flex-1 gap-2">
                <label className="block text-xs font-medium text-[#666] mb-1.5">End</label>
              </div>
              <label className="ml-3 flex-1 block text-xs font-medium text-[#666] mb-1.5">Duration</label>
            </div>
            <div className="flex gap-2 items-end flex-nowrap">
              <div className="flex flex-1 gap-2">
                <input
                  type="date"
                  value={endDate}
                  required={itemType === 'event'}
                  className="w-full h-9 px-3 rounded-lg border border-[#DDDDD8] text-[13px] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  onChange={(e) => {
                    setEndDate(e.target.value)
                    setDuration('')
                  }}
                />
                <input
                  type="time"
                  value={endTime}
                  required={itemType === 'event' && !allDay}
                  className="w-full h-9 px-3 rounded-lg border border-[#DDDDD8] text-[13px] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  onChange={(e) => {
                    setEndTime(e.target.value)
                    setDuration('')
                  }}
                />
              </div>
              <div className="ml-3 flex-1">
                <select
                  value={duration}
                  className="w-full h-9 px-3 rounded-lg border border-[#DDDDD8] text-[13px] text-[#888] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
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
          </div>
        )}

        <textarea
          name="detail"
          rows={3}
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          className="w-full px-3 py-2.5 rounded-lg border border-[#DDDDD8] text-[13px] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] resize-none placeholder:text-[#AAA]"
          placeholder="Description"
        />

        {localEditing && !showDeleteConfirm && (
          <button
            type="button"
            className="self-start h-7 px-3 rounded-md border border-[#DDDDD8] text-xs text-[#888] hover:bg-[#F2F3F0] hover:text-red-600"
            onClick={() => setShowDeleteConfirm(true)}
          >
            Delete
          </button>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            className="flex-1 h-[38px] rounded-lg border border-[#DDDDD8] text-sm font-semibold text-[#666] hover:bg-[#F2F3F0]"
            onClick={handleClose}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="flex-1 h-[38px] rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] font-semibold text-sm hover:opacity-90 disabled:opacity-50"
          >
            {isPending
              ? localEditing
                ? 'Saving...'
                : 'Creating...'
              : localEditing
                ? 'Save'
                : `Create ${itemType === 'todo' ? 'Todo' : 'Event'}`}
          </button>
        </div>

        {localEditing && showDeleteConfirm && (
          <div className="flex gap-2">
            <button
              type="button"
              className="flex-1 h-[38px] rounded-lg border border-[#DDDDD8] text-[13px] font-semibold text-[#666] hover:bg-[#F2F3F0]"
              onClick={() => setShowDeleteConfirm(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="flex-1 h-[38px] rounded-lg border border-red-500 text-red-500 font-semibold text-sm hover:bg-red-50 disabled:opacity-50"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate(localEditing.id)}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Yes, delete'}
            </button>
          </div>
        )}
        </div>
      </form>
    </Dialog>
  )
}
