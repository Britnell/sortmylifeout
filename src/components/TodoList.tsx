import { useState, useRef } from 'react'
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

interface EditState {
  id: number
  title: string
  detail: string
}

export default function TodoList({ sidebar = false }: { sidebar?: boolean }) {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<'unscheduled' | 'upcoming' | 'done'>(
    'unscheduled',
  )
  const [editing, setEditing] = useState<EditState | null>(null)
  const [creatingDraft, setCreatingDraft] = useState<{ title: string; detail: string } | null>(null)
  const titleRef = useRef<HTMLInputElement>(null)
  const newTitleRef = useRef<HTMLInputElement>(null)

  const { data: unscheduled = [] } = useQuery({
    queryKey: ['todos', 'unscheduled'],
    queryFn: () => searchEventsFn({ data: { type: 'todo', completed: false } }),
  })

  const { data: upcoming = [] } = useQuery({
    queryKey: ['todos', 'upcoming', today],
    queryFn: () =>
      searchEventsFn({
        data: { type: 'todo', completed: false, date_from: today },
      }),
  })

  const { data: done = [] } = useQuery({
    queryKey: ['todos', 'done'],
    queryFn: () => searchEventsFn({ data: { type: 'todo', completed: true } }),
  })

  const todos =
    tab === 'unscheduled'
      ? (unscheduled as CalendarEvent[]).filter((ev) => !ev.begin)
      : tab === 'upcoming'
        ? [...(upcoming as CalendarEvent[])].sort((a, b) =>
            (a.begin ?? '').localeCompare(b.begin ?? ''),
          )
        : (done as CalendarEvent[])

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['todos', 'unscheduled'] })
    queryClient.invalidateQueries({ queryKey: ['todos', 'upcoming'] })
    queryClient.invalidateQueries({ queryKey: ['todos', 'done'] })
  }

  const createMutation = useMutation({
    mutationFn: (data: { title: string; detail?: string }) =>
      createEventFn({
        data: { ...data, type: 'todo', allDay: true },
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
    setEditing({ id: ev.id, title: ev.title, detail: ev.detail ?? '' })
    setTimeout(() => titleRef.current?.focus(), 0)
  }

  const saveEditing = (ev: CalendarEvent) => {
    if (!editing) return
    updateMutation.mutate({
      id: ev.id,
      title: editing.title,
      detail: editing.detail || undefined,
    })
  }

  const openNewDraft = () => {
    setEditing(null)
    setCreatingDraft({ title: '', detail: '' })
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
          <option value="unscheduled">Todos</option>
          <option value="upcoming">Planned</option>
          <option value="done">Finished</option>
        </select>
      ) : (
        <div className="flex justify-between items-center mb-4">
          <div className="flex gap-2">
            <button
              onClick={() => setTab('unscheduled')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md ${tab === 'unscheduled' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 '}`}
            >
              Todos
            </button>
            <button
              onClick={() => setTab('upcoming')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md ${tab === 'upcoming' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 '}`}
            >
              Planned
            </button>
            <button
              onClick={() => setTab('done')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md ${tab === 'done' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 '}`}
            >
              Finished
            </button>
          </div>
          <button
            onClick={openNewDraft}
            className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md"
          >
            + New Todo
          </button>
        </div>
      )}

      <div className="space-y-1">
        {(todos as CalendarEvent[]).length === 0 && !creatingDraft && (
          <p className="text-gray-500 text-sm">
            {tab === 'upcoming'
              ? 'No upcoming todos.'
              : tab === 'done'
                ? 'No completed todos.'
                : 'No outstanding todos.'}
          </p>
        )}
        {(todos as CalendarEvent[]).map((ev) => {
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
                  <p className={`flex-1 min-w-0 text-sm font-medium ${ev.completed ? 'line-through text-gray-400' : ''}`}>
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
                  <div className="flex items-center gap-2 pt-1">
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
                        deleteMutation.mutate(ev.id)
                      }}
                      disabled={deleteMutation.isPending}
                      className="ml-auto px-3 py-1 text-xs font-medium text-red-500 hover:text-red-700 disabled:opacity-50"
                    >
                      Delete
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
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => {
                    if (!creatingDraft.title.trim()) return
                    createMutation.mutate({
                      title: creatingDraft.title.trim(),
                      detail: creatingDraft.detail.trim() || undefined,
                    })
                  }}
                  disabled={createMutation.isPending || !creatingDraft.title.trim()}
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
            + New Todo
          </button>
        )}
      </div>
    </>
  )
}
