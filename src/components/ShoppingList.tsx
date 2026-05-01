import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  searchEventsFn,
  createEventFn,
  updateEventFn,
  deleteEventFn,
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

const today = new Date().toISOString().split('T')[0]

export default function ShoppingList({ sidebar = false }: { sidebar?: boolean }) {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<'unscheduled' | 'upcoming'>('unscheduled')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const { data: unscheduled = [] } = useQuery({
    queryKey: ['shopping', 'unscheduled'],
    queryFn: () =>
      searchEventsFn({ data: { type: 'shopping', completed: false } }),
  })

  const { data: upcoming = [] } = useQuery({
    queryKey: ['shopping', 'upcoming', today],
    queryFn: () =>
      searchEventsFn({
        data: { type: 'shopping', completed: false, date_from: today },
      }),
  })

  const items =
    tab === 'unscheduled'
      ? (unscheduled as CalendarEvent[]).filter((ev) => !ev.begin)
      : [...(upcoming as CalendarEvent[])].sort((a, b) =>
          (a.begin ?? '').localeCompare(b.begin ?? ''),
        )

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['shopping', 'unscheduled'] })
    queryClient.invalidateQueries({ queryKey: ['shopping', 'upcoming'] })
  }

  const createMutation = useMutation({
    mutationFn: (data: { title: string; detail?: string }) =>
      createEventFn({
        data: { ...data, type: 'shopping', allDay: true },
      }),
    onSuccess: () => {
      invalidate()
      closeDialog()
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

  const closeDialog = () => {
    setDialogOpen(false)
    setEditingEvent(null)
    setConfirmDelete(false)
  }

  const openCreate = () => {
    setEditingEvent(null)
    setConfirmDelete(false)
    setDialogOpen(true)
  }

  const openEdit = (ev: CalendarEvent) => {
    setEditingEvent(ev)
    setConfirmDelete(false)
    setDialogOpen(true)
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const title = formData.get('title') as string
    const detail = (formData.get('detail') as string) || undefined

    if (editingEvent) {
      updateMutation.mutate({
        id: editingEvent.id,
        title,
        detail,
      })
    } else {
      createMutation.mutate({ title, detail })
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <>
      {sidebar ? (
        <select
          value={tab}
          onChange={(e) => setTab(e.target.value as typeof tab)}
          className="w-full mb-4 px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="unscheduled">Items</option>
          <option value="upcoming">Planned</option>
        </select>
      ) : (
        <div className="flex justify-between items-center mb-4">
          <div className="flex gap-2">
            <button
              onClick={() => setTab('unscheduled')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md ${tab === 'unscheduled' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 '}`}
            >
              Items
            </button>
            <button
              onClick={() => setTab('upcoming')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md ${tab === 'upcoming' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 '}`}
            >
              Planned
            </button>
          </div>
          <button
            onClick={openCreate}
            className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md "
          >
            + New Item
          </button>
        </div>
      )}

      <div className="space-y-2">
        {(items as CalendarEvent[]).length === 0 && (
          <p className="text-gray-500 text-sm">
            {tab === 'upcoming'
              ? 'No upcoming items.'
              : 'No outstanding items.'}
          </p>
        )}
        {(items as CalendarEvent[]).map((ev) => (
          <div
            key={ev.id}
            className="flex items-start gap-3 p-3 border rounded-md cursor-pointer "
            onClick={() => openEdit(ev)}
          >
            <input
              type="checkbox"
              checked={!!ev.completed}
              className="mt-0.5 shrink-0"
              onChange={(e) => {
                e.stopPropagation()
                updateMutation.mutate({
                  id: ev.id,
                  completed: e.target.checked,
                })
              }}
              onClick={(e) => e.stopPropagation()}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{ev.title}</p>
              {ev.detail && (
                <p className="text-xs text-gray-500 mt-0.5 truncate">
                  {ev.detail}
                </p>
              )}
            </div>
          </div>
        ))}
        <button
          onClick={openCreate}
          className="w-full mt-2 py-2 text-sm text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-md border border-dashed border-gray-200 hover:border-gray-300"
        >
          + New Item
        </button>
      </div>

      <Dialog isOpen={dialogOpen} onClose={closeDialog}>
        {editingEvent && confirmDelete ? (
          <>
            <h3 className="text-lg font-semibold mb-2">Delete Item?</h3>
            <p className="text-sm text-gray-600 mb-4">
              "{editingEvent.title}" will be permanently deleted.
            </p>
            <div className="flex gap-2">
              <button
                className="flex-1 py-2 px-4 bg-red-600 text-white font-medium rounded-md  disabled:opacity-50"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(editingEvent.id)}
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Yes, delete'}
              </button>
              <button
                className="flex-1 py-2 px-4 border rounded-md "
                onClick={() => setConfirmDelete(false)}
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <h3 className="text-lg font-semibold">
              {editingEvent ? 'Edit Item' : 'New Item'}
            </h3>

            {editingEvent && (
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
              className="w-full py-2 px-4 bg-blue-600 text-white font-medium rounded-md  disabled:opacity-50"
            >
              {isPending
                ? editingEvent
                  ? 'Saving...'
                  : 'Creating...'
                : editingEvent
                  ? 'Save'
                  : 'Add Item'}
            </button>

            {editingEvent && (
              <button
                type="button"
                className="w-full py-2 px-4 bg-red-600 text-white font-medium rounded-md "
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
