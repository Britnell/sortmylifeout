import { localToday } from '@/lib/date'
import { useRef, useState } from 'react'
import PageNavHeading from '@/components/PageNavHeading'
import { Square, CalendarClock, TriangleAlert, SquareCheck } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useLocalStorage } from '#/lib/useLocalStorage'
import {
  searchEventsFn,
  createEventFn,
  updateEventFn,
  deleteEventFn,
} from '@/serverFn/queries.functions'

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

export interface EditState {
  id: number | null // null = creating
  type?: string
  column?: ColumnKey
  title: string
  detail: string
  date: string
  time: string
  completed?: string | null
}

type ColumnKey = 'todo' | 'scheduled' | 'overdue' | 'finished'

function weekAgo(): string {
  const d = new Date()
  d.setDate(d.getDate() - 6)
  return d.toISOString().slice(0, 10)
}

export function parseBegin(begin: string | null): {
  date: string
  time: string
} {
  if (!begin) return { date: '', time: '' }
  const [datePart, timePart = ''] = begin.split('T')
  return { date: datePart, time: timePart.slice(0, 5) }
}

export function buildBegin(date: string, time: string): string | undefined {
  if (!date) return undefined
  return time ? `${date}T${time}` : date
}

export function fmtDayLabel(dateStr: string): string {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}/.test(dateStr))
    console.warn('[TodoBoard] invalid begin date:', JSON.stringify(dateStr))
  const d = new Date(`${dateStr}T00:00:00`)
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

const COLS: {
  key: ColumnKey
  title: string
  Icon: typeof Square
}[] = [
  { key: 'todo', title: 'To Do', Icon: Square },
  { key: 'scheduled', title: 'Scheduled', Icon: CalendarClock },
  { key: 'overdue', title: 'Overdue', Icon: TriangleAlert },
  { key: 'finished', title: 'Finished', Icon: SquareCheck },
]

interface EditorProps {
  value: EditState
  onChange: (next: EditState) => void
  onCancel: () => void
  onSave: (e: EditState) => void
  onDelete?: (id: number) => void
  onToggle?: () => void
  placeholder?: string
}

export function Editor({
  value: e,
  onChange,
  onCancel,
  onSave,
  onDelete,
  onToggle,
  placeholder = 'Title',
}: EditorProps) {
  return (
    <div className="rounded-md border border-neutral-800 bg-[#E7E8E5] p-3 space-y-2.5">
      <div className="flex items-center gap-2.5">
        {onToggle && (
          <button
            onClick={onToggle}
            aria-label="Toggle completed"
            className="flex size-7 -m-2 shrink-0 items-center justify-center rounded"
          >
            <input
              type="checkbox"
              readOnly
              checked={!!e.completed}
              className="pointer-events-none h-3.5 w-3.5 accent-neutral-900"
            />
          </button>
        )}
        <input
          autoFocus
          type="text"
          value={e.title}
          onChange={(ev) => onChange({ ...e, title: ev.target.value })}
          onKeyDown={(ev) => ev.key === 'Enter' && onSave(e)}
          placeholder={placeholder}
          className="min-w-0 flex-1 bg-transparent border-b border-neutral-400 focus:border-neutral-800 outline-none py-0.5 font-medium"
        />
      </div>
      <input
        type="text"
        value={e.detail}
        onChange={(ev) => onChange({ ...e, detail: ev.target.value })}
        placeholder="Description"
        className="w-full bg-transparent border-b border-neutral-300 focus:border-neutral-800 outline-none py-0.5 text-neutral-600"
      />
      <div className="flex gap-2">
        <input
          type="date"
          value={e.date}
          onChange={(ev) => onChange({ ...e, date: ev.target.value })}
          className="flex-1 min-w-0 rounded-md border border-neutral-300 px-2.5 py-1.5 font-mono"
        />
        <input
          type="time"
          value={e.time}
          onChange={(ev) => onChange({ ...e, time: ev.target.value })}
          className="w-18 rounded-md border border-neutral-300 px-2.5 py-1.5 font-mono"
        />
        <button
          onClick={() => onChange({ ...e, date: '', time: '' })}
          className="w-9 rounded-md border border-neutral-300 font-mono text-xs hover:bg-neutral-100"
        >
          ✕
        </button>
      </div>
      <div className="flex items-center gap-2">
        {e.id !== null && (
          <button
            onClick={() => onDelete?.(e.id!)}
            className="text-xs font-medium text-[#D93C15]"
          >
            Delete
          </button>
        )}
        <button
          onClick={onCancel}
          className="ml-auto rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium hover:bg-neutral-100"
        >
          Cancel
        </button>
        <button
          onClick={() => onSave(e)}
          disabled={!e.title.trim()}
          className="rounded-md bg-[var(--primary)] px-3 py-1.5 text-xs font-medium disabled:opacity-40"
        >
          Save
        </button>
      </div>
    </div>
  )
}

interface ItemProps {
  event: CalendarEvent
  column?: ColumnKey
  onEdit: () => void
  onToggle: () => void
}

export function Item({ event: ev, column, onEdit, onToggle }: ItemProps) {
  const { time } = parseBegin(ev.begin)
  const showTime = time && column !== 'finished'
  return (
    <div
      key={ev.id}
      onClick={onEdit}
      className="flex cursor-pointer items-center gap-3 rounded-md border border-neutral-300 px-3 py-2 hover:border-neutral-400"
    >
      <label
        onClick={(e) => {
          e.stopPropagation()
          onToggle()
        }}
        className="flex size-7 -m-2 shrink-0 cursor-pointer items-center justify-center rounded"
      >
        <input
          type="checkbox"
          readOnly
          checked={!!ev.completed}
          className="pointer-events-none h-3.5 w-3.5 accent-neutral-900"
        />
      </label>
      <span
        className={`flex-1 min-w-0 truncate text-sm font-medium ${
          ev.completed ? 'text-neutral-400 line-through' : 'text-neutral-900'
        }`}
      >
        {ev.title}
      </span>
      {column === 'finished' && (
        <span className="shrink-0 rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-neutral-500">
          {ev.type}
        </span>
      )}
      {showTime && (
        <span className="shrink-0 font-mono text-[11px] text-neutral-500">
          {time}
        </span>
      )}
    </div>
  )
}

interface DateGroupProps {
  date: string
}

export function DateGroup({ date }: DateGroupProps) {
  return (
    <span className="text-[13px] font-semibold leading-tight text-neutral-900">
      {fmtDayLabel(date)}
    </span>
  )
}

interface ColumnProps {
  col: (typeof COLS)[number]
  active: boolean
  items: CalendarEvent[]
  newEditor: EditState | null
  onAdd: () => void
  onCancelNew: () => void
  onChange: (next: EditState) => void
  onSave: (e: EditState) => void
  setRef: (el: HTMLDivElement | null) => void
  children?: React.ReactNode
}

function Column({
  col,
  active,
  items,
  newEditor,
  onAdd,
  onCancelNew,
  onChange,
  onSave,
  setRef,
  children,
}: ColumnProps) {
  const isEditingNew = !!newEditor
  return (
    <div
      ref={setRef}
      className={`flex h-fit w-[calc(100vw-2.5rem)] sm:w-[85vw] shrink-0 snap-start flex-col gap-2.5 rounded-lg border border-neutral-300 bg-white md:w-95 ${
        items.length ? 'min-h-64' : ''
      }`}
    >
      {/* Column header */}
      <div
        className={`m-0 flex items-center rounded-t-lg border-b px-3 py-3 ${
          active
            ? 'bg-[var(--primary)] border-b-[var(--primary)]'
            : 'bg-white border-b-neutral-400'
        }`}
      >
        <span className="flex items-center gap-1.5 text-sm font-semibold text-neutral-900">
          {col.title}
        </span>
        <span className="ml-auto text-sm opacity-60">{items.length} items</span>
        <button
          onClick={onAdd}
          className="ml-auto  hover:bg-amber-300 flex size-8 -my-2 items-center justify-center rounded bg-transparent text-sm font-bold leading-none text-neutral-900 hover:text-neutral-600"
          aria-label={`Add to ${col.title}`}
        >
          +
        </button>
      </div>
      {/* Items */}
      <div
        className="flex flex-col gap-2 px-3 pb-3 overflow-auto max-h-[calc(100vh-14rem)]"
        onClick={(e) => {
          if (e.target === e.currentTarget && isEditingNew) onCancelNew()
        }}
      >
        {children}
        {isEditingNew && newEditor && (
          <Editor
            value={newEditor}
            onChange={onChange}
            onCancel={onCancelNew}
            onSave={onSave}
          />
        )}
        {items.length === 0 && !isEditingNew && (
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

interface ColumnTabsProps {
  activeCol: ColumnKey
  onSelect: (i: number) => void
}

function ColumnTabs({ activeCol, onSelect }: ColumnTabsProps) {
  return (
    <div className="ml-auto sm:mx-auto flex items-center overflow-hidden rounded-lg border border-[#CBCCC9] bg-white">
      {COLS.map((col, i) => {
        const isActive = activeCol === col.key
        return (
          <button
            key={col.key}
            aria-label={col.title}
            onClick={() => onSelect(i)}
            className={`block px-2.5 md:px-4 py-2 text-[11px] md:text-[13px] font-medium transition-colors ${
              isActive
                ? 'bg-[var(--primary)] text-[#111111]'
                : 'text-[#666666] hover:bg-[#F2F3F0]'
            }`}
          >
            <span className="flex items-center gap-1.5 leading-none">
              <col.Icon size={14} strokeWidth={2} className="shrink-0" />
              {/* Mobile: only the active tab shows its label */}
              <span className={isActive ? '' : 'hidden md:inline'}>
                {col.title}
              </span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

interface ItemListProps {
  items: CalendarEvent[]
  column: ColumnKey
  editing: EditState | null
  onEdit: (ev: CalendarEvent, column: ColumnKey) => void
  onToggle: (ev: CalendarEvent) => void
  onChange: (next: EditState) => void
  onCancel: () => void
  onSave: (e: EditState) => void
  onDelete: (id: number) => void
}

function ItemList({
  items,
  column,
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
        value={{ ...editing, completed: ev.completed }}
        onChange={onChange}
        onCancel={onCancel}
        onSave={onSave}
        onDelete={onDelete}
        onToggle={() => onToggle(ev)}
      />
    ) : (
      <Item
        key={ev.id}
        event={ev}
        column={column}
        onEdit={() => onEdit(ev, column)}
        onToggle={() => onToggle(ev)}
      />
    ),
  )
}

export default function TodoBoard() {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<EditState | null>(null)
  const [colIdx, setColIdx] = useLocalStorage<number>('todoActiveCol', 0)
  const colRefs = useRef<(HTMLDivElement | null)[]>([])
  const goToCol = (i: number) => {
    setColIdx(i)
    colRefs.current[i]?.scrollIntoView({
      behavior: window.matchMedia('(min-width: 768px)').matches
        ? 'smooth'
        : 'auto',
      inline: 'start',
      block: 'nearest',
    })
  }
  const activeCol = COLS[colIdx]?.key ?? 'todo'

  const { data: events = [] } = useQuery({
    queryKey: ['board', 'events'],
    queryFn: () =>
      searchEventsFn({
        data: { completed_date: weekAgo() },
      }),
  })

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['board'] })

  const createMutation = useMutation({
    mutationFn: (e: EditState) =>
      createEventFn({
        data: {
          title: e.title.trim(),
          detail: e.detail.trim() || undefined,
          type: 'todo',
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
  const today = localToday()
  // only today's completions appear in non-finished columns
  const visible = all.filter(
    (e) => !e.completed || e.completed.slice(0, 10) === today,
  )
  const scheduled = visible.filter(
    (e) => e.type === 'todo' && e.begin && /^\d{4}-\d{2}-\d{2}/.test(e.begin),
  )
  const byDone = (a: CalendarEvent, b: CalendarEvent) =>
    Number(!!a.completed) - Number(!!b.completed)
  const cols: Record<ColumnKey, CalendarEvent[]> = {
    todo: visible.filter((e) => e.type === 'todo' && !e.begin).sort(byDone),
    scheduled: scheduled
      .filter((e) => (e.begin ?? '').slice(0, 10) >= today)
      .sort(
        (a, b) => byDone(a, b) || (a.begin ?? '').localeCompare(b.begin ?? ''),
      ),
    overdue: scheduled
      .filter((e) => (e.begin ?? '').slice(0, 10) < today)
      .sort(
        (a, b) => byDone(a, b) || (a.begin ?? '').localeCompare(b.begin ?? ''),
      ),
    finished: all.filter((e) => e.completed),
  }

  const openNew = (column: ColumnKey) => {
    setEditing({
      id: null,
      type: 'todo',
      column,
      title: '',
      detail: '',
      date:
        column === 'scheduled' || column === 'overdue'
          ? new Date().toISOString().split('T')[0]
          : '',
      time: '',
    })
  }

  const save = (e: EditState) => {
    if (!e.title.trim()) return
    if (e.id === null) createMutation.mutate(e)
    else updateMutation.mutate(e)
  }

  // group scheduled/overdue by date
  const groupByDate = (items: CalendarEvent[]) => {
    const groups: { date: string; items: CalendarEvent[] }[] = []
    for (const ev of items) {
      const { date } = parseBegin(ev.begin)
      const g = groups.find((x) => x.date === date)
      if (g) g.items.push(ev)
      else groups.push({ date, items: [ev] })
    }
    return groups
  }
  const scheduledGroups = groupByDate(cols.scheduled)
  const overdueGroups = groupByDate(cols.overdue)

  const onEditItem = (ev: CalendarEvent, column: ColumnKey) => {
    setEditing({
      id: ev.id,
      type: ev.type,
      column,
      title: ev.title,
      detail: ev.detail ?? '',
      ...parseBegin(ev.begin),
    })
  }

  return (
    <div className="flex h-[calc(100vh-2.75rem)] flex-col gap-3 ">
      {/* Toolbar */}
      <div className="menu-bar flex items-center gap-4 bg-white px-4 py-2 ">
        <PageNavHeading page="todo" />
        {/* Tabs */}
        <ColumnTabs activeCol={activeCol} onSelect={goToCol} />
        <button
          onClick={() => openNew('todo')}
          className="ml-auto hidden sm:block rounded-md bg-[var(--primary)] px-4 py-2 text-[13px] font-medium text-neutral-900"
        >
          + New
        </button>
      </div>

      {/* Board */}
      <div
        className="flex min-h-0 flex-1 gap-3 px-3 pb-4 overflow-x-auto snap-x snap-mandatory [scroll-padding:0.75rem]"
        onScrollEnd={(e) => {
          const el = e.currentTarget
          const mid = el.scrollLeft + el.clientWidth / 2
          let best = 0
          let bestDist = Infinity
          colRefs.current.forEach((c, i) => {
            if (!c) return
            const d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid)
            if (d < bestDist) {
              bestDist = d
              best = i
            }
          })
          setColIdx(best)
        }}
      >
        {COLS.map((col, i) => {
          const items = cols[col.key]
          const grouped =
            col.key === 'scheduled'
              ? scheduledGroups
              : col.key === 'overdue'
                ? overdueGroups
                : null
          return (
            <Column
              key={col.key}
              col={col}
              active={activeCol === col.key}
              items={items}
              newEditor={
                editing?.id === null && editing?.column === col.key
                  ? editing
                  : null
              }
              onAdd={() => openNew(col.key)}
              onCancelNew={() => setEditing(null)}
              onChange={setEditing}
              onSave={save}
              setRef={(el) => {
                colRefs.current[i] = el
              }}
            >
              {grouped ? (
                grouped.flatMap((g) => [
                  <DateGroup key={g.date} date={g.date} />,
                  <ItemList
                    key={g.date + '-items'}
                    items={g.items}
                    column={col.key}
                    editing={editing}
                    onEdit={onEditItem}
                    onToggle={toggleMutation.mutate}
                    onChange={setEditing}
                    onCancel={() => setEditing(null)}
                    onSave={save}
                    onDelete={deleteMutation.mutate}
                  />,
                ])
              ) : (
                <ItemList
                  items={items}
                  column={col.key}
                  editing={editing}
                  onEdit={onEditItem}
                  onToggle={toggleMutation.mutate}
                  onChange={setEditing}
                  onCancel={() => setEditing(null)}
                  onSave={save}
                  onDelete={deleteMutation.mutate}
                />
              )}
            </Column>
          )
        })}
      </div>
    </div>
  )
}
