import { localToday } from '@/lib/date'
import Icon from '@/components/Icon'
import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  searchEventsFn,
  createEventFn,
  updateEventFn,
  deleteEventFn,
} from '@/serverFn/queries.functions'
import {
  Editor,
  Item,
  DateGroup,
  parseBegin,
  buildBegin,
  type CalendarEvent,
  type EditState,
} from '#/components/TodoBoard'

interface ColumnProps {
  title: string
  count: number
  showAddButton: boolean
  onAdd: () => void
  children: React.ReactNode
}

function Column({ title, count, showAddButton, onAdd, children }: ColumnProps) {
  return (
    <div className="flex flex-col gap-2.5 rounded-lg border border-neutral-300 bg-white">
      <div className="flex items-center rounded-t-lg border-b border-b-[var(--primary)] bg-[var(--primary)] px-3 py-3">
        <span className="text-sm font-semibold text-neutral-900">{title}</span>
        <span className="ml-auto text-sm opacity-60">{count} items</span>
      </div>
      <div className="flex flex-col gap-2 px-3 pb-3">
        {children}
        {showAddButton && (
          <button
            onClick={onAdd}
            className="rounded-md border border-dashed border-neutral-300 py-2.5 text-xs text-neutral-400 hover:border-neutral-400 hover:text-neutral-600"
          >
            + Add item
          </button>
        )}
      </div>
    </div>
  )
}

interface ItemListProps {
  items: CalendarEvent[]
  editing: EditState | null
  onEdit: (ev: CalendarEvent) => void
  onToggle: (ev: CalendarEvent) => void
  onChange: (next: EditState) => void
  onCancel: () => void
  onSave: (e: EditState) => void
  onDelete: (id: number) => void
}

function ItemList({
  items,
  editing,
  onEdit,
  onToggle,
  onChange,
  onCancel,
  onSave,
  onDelete,
}: ItemListProps) {
  return items.map((ev) =>
    editing?.id === ev.id && editing ? (
      <Editor
        key={ev.id}
        value={editing}
        onChange={onChange}
        onCancel={onCancel}
        onSave={onSave}
        onDelete={onDelete}
        placeholder="Item"
      />
    ) : (
      <Item
        key={ev.id}
        event={ev}
        onEdit={() => onEdit(ev)}
        onToggle={() => onToggle(ev)}
      />
    ),
  )
}

export const Route = createFileRoute('/(app)/shopping')({
  component: ShoppingPage,
})

function ShoppingPage() {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<EditState | null>(null)

  const { data: events = [] } = useQuery({
    queryKey: ['shopping', 'events'],
    queryFn: () =>
      searchEventsFn({
        data: { type: 'shopping', completed_date: localToday() },
      }),
  })

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['shopping'] })

  const createMutation = useMutation({
    mutationFn: (e: EditState) =>
      createEventFn({
        data: {
          title: e.title.trim(),
          detail: e.detail.trim() || undefined,
          type: 'shopping',
          begin: buildBegin(e.date, e.time),
          allDay: !e.time,
        },
      }),
    onSuccess: () => {
      invalidate()
      setEditing(null)
    },
  })

  const updateMutation = useMutation({
    mutationFn: (e: EditState) =>
      updateEventFn({
        data: {
          id: e.id!,
          title: e.title.trim(),
          detail: e.detail.trim() || undefined,
          begin: buildBegin(e.date, e.time),
        },
      }),
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

  const toggleMutation = useMutation({
    mutationFn: (ev: CalendarEvent) =>
      updateEventFn({
        data: { id: ev.id, completed: ev.completed ? false : localToday() },
      }),
    onSuccess: invalidate,
  })

  const all = events as CalendarEvent[]
  const byDone = (a: CalendarEvent, b: CalendarEvent) =>
    Number(!!a.completed) - Number(!!b.completed)
  const undated = all.filter((e) => !e.begin).sort(byDone)
  const dated = all
    .filter((e) => e.begin && /^\d{4}-\d{2}-\d{2}/.test(e.begin))
    .sort(
      (a, b) => byDone(a, b) || (a.begin ?? '').localeCompare(b.begin ?? ''),
    )

  const datedGroups: { date: string; items: CalendarEvent[] }[] = []
  for (const ev of dated) {
    const { date } = parseBegin(ev.begin)
    const g = datedGroups.find((x) => x.date === date)
    if (g) g.items.push(ev)
    else datedGroups.push({ date, items: [ev] })
  }

  const openNew = () =>
    setEditing({ id: null, title: '', detail: '', date: '', time: '' })

  const save = (e: EditState) => {
    if (!e.title.trim()) return
    if (e.id === null) createMutation.mutate(e)
    else updateMutation.mutate(e)
  }

  const onEditItem = (ev: CalendarEvent) => {
    setEditing({
      id: ev.id,
      title: ev.title,
      detail: ev.detail ?? '',
      ...parseBegin(ev.begin),
    })
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between bg-white px-4 py-2">
        <h1 className="text-base font-semibold text-neutral-900 flex gap-1 items-center">
          <Icon name="shopping" />
          Shopping
        </h1>
        <button
          onClick={openNew}
          className="rounded-md bg-[var(--primary)] px-4 py-2 text-[13px] font-medium text-neutral-900"
        >
          + New
        </button>
      </div>

      <Column
        title="Items"
        count={undated.length}
        showAddButton={undated.length === 0 && editing?.id !== null}
        onAdd={openNew}
      >
        {editing?.id === null && (
          <div onClick={(e) => e.stopPropagation()}>
            <Editor
              value={editing}
              onChange={setEditing}
              onCancel={() => setEditing(null)}
              onSave={save}
              placeholder="Item"
            />
          </div>
        )}
        <ItemList
          items={undated}
          editing={editing}
          onEdit={onEditItem}
          onToggle={toggleMutation.mutate}
          onChange={setEditing}
          onCancel={() => setEditing(null)}
          onSave={save}
          onDelete={deleteMutation.mutate}
        />
      </Column>

      {datedGroups.length > 0 && (
        <Column
          title="Scheduled"
          count={dated.length}
          showAddButton={false}
          onAdd={openNew}
        >
          {datedGroups.flatMap((g) => [
            <DateGroup key={g.date} date={g.date} />,
            <ItemList
              key={g.date + '-items'}
              items={g.items}
              editing={editing}
              onEdit={onEditItem}
              onToggle={toggleMutation.mutate}
              onChange={setEditing}
              onCancel={() => setEditing(null)}
              onSave={save}
              onDelete={deleteMutation.mutate}
            />,
          ])}
        </Column>
      )}
    </div>
  )
}
