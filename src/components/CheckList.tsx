import { useState, useRef } from 'react'
import { useLocalStorage } from '@/lib/useLocalStorage'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  searchEventsFn,
  createEventFn,
  updateEventFn,
  deleteEventFn,
} from '@/serverFn/queries.functions'

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

const today = new Date().toISOString().split('T')[0]

function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function parseBegin(begin: string | null): { date: string; time: string } {
  if (!begin) return { date: '', time: '' }
  const [datePart, timePart = ''] = begin.split('T')
  return { date: datePart, time: timePart.slice(0, 5) }
}

function buildBegin(date: string, time: string): string | undefined {
  if (!date) return undefined
  return time ? `${date}T${time}` : date
}

interface EditState {
  id: number
  title: string
  detail: string
  date: string
  time: string
}

type EventType = 'todo' | 'shopping'

const LABELS: Record<
  EventType,
  {
    unscheduled: string
    newButton: string
    emptyUnscheduled: string
    emptyUpcoming: string
    emptyDone: string
  }
> = {
  todo: {
    unscheduled: 'Items',
    newButton: '+ New Item',
    emptyUnscheduled: 'No outstanding todos.',
    emptyUpcoming: 'No upcoming todos.',
    emptyDone: 'No completed todos.',
  },
  shopping: {
    unscheduled: 'Items',
    newButton: '+ New Item',
    emptyUnscheduled: 'No outstanding items.',
    emptyUpcoming: 'No upcoming items.',
    emptyDone: 'No completed items.',
  },
}

export default function CheckList({
  type,
  sidebar = false,
}: {
  type: EventType
  sidebar?: boolean
}) {
  const queryClient = useQueryClient()
  const labels = LABELS[type]
  const [tab, setTab] = useLocalStorage<'unscheduled' | 'upcoming' | 'done'>(
    `checklist-tab-${type}`,
    'unscheduled',
  )
  const [editing, setEditing] = useState<EditState | null>(null)
  const [creatingDraft, setCreatingDraft] = useState<{
    title: string
    detail: string
    date: string
    time: string
  } | null>(null)
  const titleRef = useRef<HTMLInputElement>(null)
  const newTitleRef = useRef<HTMLInputElement>(null)

  const { data: unscheduled = [] } = useQuery({
    queryKey: [type, 'unscheduled'],
    queryFn: () => searchEventsFn({ data: { type, completed: false } }),
  })

  const { data: upcoming = [] } = useQuery({
    queryKey: [type, 'upcoming', today],
    queryFn: () =>
      searchEventsFn({
        data: { type, completed: false, date_from: today },
      }),
  })

  const { data: done = [] } = useQuery({
    queryKey: [type, 'done'],
    queryFn: () => searchEventsFn({ data: { type, completed: true } }),
  })

  const items =
    tab === 'unscheduled'
      ? (unscheduled as CalendarEvent[]).filter((ev) => !ev.begin)
      : tab === 'upcoming'
        ? [...(upcoming as CalendarEvent[])].sort((a, b) =>
            (a.begin ?? '').localeCompare(b.begin ?? ''),
          )
        : (done as CalendarEvent[])

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: [type, 'unscheduled'] })
    queryClient.invalidateQueries({ queryKey: [type, 'upcoming'] })
    queryClient.invalidateQueries({ queryKey: [type, 'done'] })
  }

  const createMutation = useMutation({
    mutationFn: (data: { title: string; detail?: string; begin?: string }) =>
      createEventFn({
        data: { ...data, type, allDay: !data.begin },
      }),
    onSuccess: () => {
      invalidate()
      setCreatingDraft(null)
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: {
      id: number
      title?: string
      detail?: string
      completed?: boolean
      begin?: string
    }) => updateEventFn({ data }),
    onSuccess: () => {
      invalidate()
      setEditing(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteEventFn({ data: { id } }),
    onSuccess: () => {
      invalidate()
      setEditing(null)
    },
  })

  const startEditing = (ev: CalendarEvent) => {
    const { date, time } = parseBegin(ev.begin)
    setEditing({
      id: ev.id,
      title: ev.title,
      detail: ev.detail ?? '',
      date,
      time,
    })
    setTimeout(() => titleRef.current?.focus(), 0)
  }

  const saveEditing = (ev: CalendarEvent) => {
    if (!editing) return
    updateMutation.mutate({
      id: ev.id,
      title: editing.title,
      detail: editing.detail || undefined,
      begin: buildBegin(editing.date, editing.time),
    })
  }

  const openNewDraft = () => {
    setEditing(null)
    setCreatingDraft({ title: '', detail: '', date: '', time: '' })
    setTimeout(() => newTitleRef.current?.focus(), 0)
  }

  return (
    <>
      {sidebar ? (
        <select
          value={tab}
          onChange={(e) => setTab(e.target.value as typeof tab)}
          className="w-full mb-4 px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="unscheduled">Items</option>
          <option value="upcoming">Scheduled</option>
          <option value="done">Finished</option>
        </select>
      ) : (
        <div className="flex justify-between items-center mb-4">
          <select
            value={tab}
            onChange={(e) => setTab(e.target.value as typeof tab)}
            className="sm:hidden px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="unscheduled">Items</option>
            <option value="upcoming">Scheduled</option>
            <option value="done">Finished</option>
          </select>
          <div className="hidden sm:flex border border-gray-300 rounded-md overflow-hidden">
            <button
              onClick={() => setTab('unscheduled')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${tab === 'unscheduled' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              Items
            </button>
            <button
              onClick={() => setTab('upcoming')}
              className={`px-4 py-2 text-sm font-medium transition-colors border-l border-gray-300 ${tab === 'upcoming' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              Scheduled
            </button>
            <button
              onClick={() => setTab('done')}
              className={`px-4 py-2 text-sm font-medium transition-colors border-l border-gray-300 ${tab === 'done' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              Finished
            </button>
          </div>
          <button
            onClick={openNewDraft}
            className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md"
          >
            {labels.newButton}
          </button>
        </div>
      )}

      <div className="space-y-1">
        {items.length === 0 && !creatingDraft && (
          <p className="text-gray-500 text-sm">
            {tab === 'upcoming'
              ? labels.emptyUpcoming
              : tab === 'done'
                ? labels.emptyDone
                : labels.emptyUnscheduled}
          </p>
        )}
        {items.map((ev) => {
          const isEditing = editing?.id === ev.id
          return (
            <div
              key={ev.id}
              className={`border rounded-md transition-all ${isEditing ? 'border-blue-300 bg-blue-50/30' : 'border-gray-200 hover:border-gray-300'}`}
            >
              <div
                className="flex items-center gap-3 px-3 py-2.5 cursor-pointer"
                onClick={() => {
                  if (!isEditing) startEditing(ev)
                }}
              >
                <input
                  type="checkbox"
                  checked={!!ev.completed}
                  className="shrink-0"
                  onChange={(e) => {
                    e.stopPropagation()
                    updateMutation.mutate({
                      id: ev.id,
                      completed: e.target.checked,
                    })
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
                {isEditing ? (
                  <input
                    ref={titleRef}
                    type="text"
                    value={editing.title}
                    onChange={(e) =>
                      setEditing({ ...editing, title: e.target.value })
                    }
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 min-w-0 text-sm font-medium bg-transparent border-b border-blue-400 focus:outline-none py-0.5"
                  />
                ) : (
                  <p
                    className={`flex-1 min-w-0 text-sm font-medium ${ev.completed ? 'line-through text-gray-400' : ''}`}
                  >
                    {ev.title}
                  </p>
                )}
              </div>

              {isEditing && (
                <div className="px-3 pb-3 space-y-2">
                  <input
                    type="text"
                    value={editing.detail}
                    onChange={(e) =>
                      setEditing({ ...editing, detail: e.target.value })
                    }
                    placeholder="Description"
                    className="w-full text-sm text-gray-500 bg-transparent border-b border-gray-200 focus:border-blue-400 focus:outline-none py-0.5 placeholder:text-gray-300"
                  />
                  {!editing.date ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditing({ ...editing, date: fmtDate(new Date()) })
                      }}
                      className="text-xs text-gray-400 hover:text-gray-600"
                    >
                      + Add date
                    </button>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="date"
                        value={editing.date}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) =>
                          setEditing({ ...editing, date: e.target.value })
                        }
                        className="px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                      />
                      <input
                        type="time"
                        value={editing.time}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) =>
                          setEditing({ ...editing, time: e.target.value })
                        }
                        className="px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditing({ ...editing, date: '', time: '' })
                        }}
                        className="px-2 py-1 border border-gray-300 rounded-md hover:bg-gray-50 text-xs text-gray-600"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteMutation.mutate(ev.id)
                      }}
                      disabled={deleteMutation.isPending}
                      className="mr-auto px-3 py-1 text-xs font-medium text-red-500 hover:text-red-700 disabled:opacity-50"
                    >
                      Delete
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditing(null)
                      }}
                      className="px-3 py-1 text-xs font-medium border border-gray-300 rounded-md text-gray-600"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        saveEditing(ev)
                      }}
                      disabled={updateMutation.isPending}
                      className="px-3 py-1 text-xs font-medium bg-blue-600 text-white rounded-md disabled:opacity-50"
                    >
                      {updateMutation.isPending ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {creatingDraft ? (
          <div className="border border-blue-300 bg-blue-50/30 rounded-md">
            <div className="flex items-center gap-3 px-3 py-2.5">
              <input type="checkbox" disabled className="shrink-0 opacity-30" />
              <input
                ref={newTitleRef}
                type="text"
                value={creatingDraft.title}
                onChange={(e) =>
                  setCreatingDraft({ ...creatingDraft, title: e.target.value })
                }
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && creatingDraft.title.trim()) {
                    createMutation.mutate({
                      title: creatingDraft.title.trim(),
                      detail: creatingDraft.detail.trim() || undefined,
                      begin: buildBegin(creatingDraft.date, creatingDraft.time),
                    })
                  }
                }}
                placeholder="Title"
                className="flex-1 min-w-0 text-sm font-medium bg-transparent border-b border-blue-400 focus:outline-none py-0.5 placeholder:text-gray-300"
              />
            </div>
            <div className="px-3 pb-3 space-y-2">
              <input
                type="text"
                value={creatingDraft.detail}
                onChange={(e) =>
                  setCreatingDraft({ ...creatingDraft, detail: e.target.value })
                }
                placeholder="Description"
                className="w-full text-sm text-gray-500 bg-transparent border-b border-gray-200 focus:border-blue-400 focus:outline-none py-0.5 placeholder:text-gray-300"
              />
              {!creatingDraft.date ? (
                <button
                  type="button"
                  onClick={() =>
                    setCreatingDraft({
                      ...creatingDraft,
                      date: fmtDate(new Date()),
                    })
                  }
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  + Add date
                </button>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="date"
                    value={creatingDraft.date}
                    onChange={(e) =>
                      setCreatingDraft({
                        ...creatingDraft,
                        date: e.target.value,
                      })
                    }
                    className="px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                  />
                  <input
                    type="time"
                    value={creatingDraft.time}
                    onChange={(e) =>
                      setCreatingDraft({
                        ...creatingDraft,
                        time: e.target.value,
                      })
                    }
                    className="px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setCreatingDraft({ ...creatingDraft, date: '', time: '' })
                    }
                    className="px-2 py-1 border border-gray-300 rounded-md hover:bg-gray-50 text-xs text-gray-600"
                  >
                    ✕
                  </button>
                </div>
              )}
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => {
                    if (!creatingDraft.title.trim()) return
                    createMutation.mutate({
                      title: creatingDraft.title.trim(),
                      detail: creatingDraft.detail.trim() || undefined,
                      begin: buildBegin(creatingDraft.date, creatingDraft.time),
                    })
                  }}
                  disabled={
                    createMutation.isPending || !creatingDraft.title.trim()
                  }
                  className="px-3 py-1 text-xs font-medium bg-blue-600 text-white rounded-md disabled:opacity-50"
                >
                  {createMutation.isPending ? 'Creating…' : 'Create'}
                </button>
                <button
                  onClick={() => setCreatingDraft(null)}
                  className="px-3 py-1 text-xs font-medium border border-gray-300 rounded-md text-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={openNewDraft}
            className="w-full mt-1 py-2 text-sm text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-md border border-dashed border-gray-200 hover:border-gray-300"
          >
            {labels.newButton}
          </button>
        )}
      </div>
    </>
  )
}
