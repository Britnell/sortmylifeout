import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useLocalStorage } from '#/lib/useLocalStorage'
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

interface EditState {
	id: number | null // null = creating
	type: string
	column: ColumnKey
	title: string
	detail: string
	date: string
	time: string
}

type ColumnKey = 'todo' | 'scheduled' | 'shopping' | 'finished'

function parseBegin(begin: string | null): { date: string; time: string } {
	if (!begin) return { date: '', time: '' }
	const [datePart, timePart = ''] = begin.split('T')
	return { date: datePart, time: timePart.slice(0, 5) }
}

function buildBegin(date: string, time: string): string | undefined {
	if (!date) return undefined
	return time ? `${date}T${time}` : date
}

function fmtDayLabel(dateStr: string): string {
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
}[] = [
	{ key: 'todo', title: 'To Do' },
	{ key: 'scheduled', title: 'Scheduled' },
	{ key: 'shopping', title: 'Shopping' },
	{ key: 'finished', title: 'Finished' },
]

export default function TodoBoard() {
	const queryClient = useQueryClient()
	const [editing, setEditing] = useState<EditState | null>(null)
	const [colIdx, setColIdx] = useLocalStorage<number>('todoActiveCol', 0)
	const activeCol = COLS[colIdx]?.key ?? 'todo'

	const { data: events = [] } = useQuery({
		queryKey: ['board', 'events'],
		queryFn: () => searchEventsFn({ data: {} }),
	})

	const invalidate = () =>
		queryClient.invalidateQueries({ queryKey: ['board'] })

	const createMutation = useMutation({
		mutationFn: (e: EditState) =>
			createEventFn({
				data: {
					title: e.title.trim(),
					detail: e.detail.trim() || undefined,
					type: e.column === 'shopping' ? 'shopping' : 'todo',
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
				data: { id: ev.id, completed: !ev.completed },
			}),
		onSuccess: invalidate,
	})

	const all = events as CalendarEvent[]
	const cols: Record<ColumnKey, CalendarEvent[]> = {
		todo: all.filter((e) => e.type === 'todo' && !e.completed && !e.begin),
		scheduled: all
			.filter((e) => e.type === 'todo' && !e.completed && e.begin)
			.sort((a, b) => (a.begin ?? '').localeCompare(b.begin ?? '')),
		shopping: all.filter((e) => e.type === 'shopping' && !e.completed),
		finished: all.filter((e) => e.completed),
	}

	const stepCol = (dir: 1 | -1) =>
		setColIdx((i) => (i + dir + COLS.length) % COLS.length)

	const openNew = (column: ColumnKey) => {
		setEditing({
			id: null,
			type: column === 'shopping' ? 'shopping' : 'todo',
			column,
			title: '',
			detail: '',
			date: column === 'scheduled' ? new Date().toISOString().split('T')[0] : '',
			time: '',
		})
	}

	const save = (e: EditState) => {
		if (!e.title.trim()) return
		if (e.id === null) createMutation.mutate(e)
		else updateMutation.mutate(e)
	}

	const renderEditor = (e: EditState) => (
		<div className="rounded-md border border-neutral-800 bg-[#E7E8E5] p-3 space-y-2.5">
			<input
				autoFocus
				type="text"
				value={e.title}
				onChange={(ev) => setEditing({ ...e, title: ev.target.value })}
				onKeyDown={(ev) => ev.key === 'Enter' && save(e)}
				placeholder="Title"
				className="w-full bg-transparent border-b border-neutral-400 focus:border-neutral-800 outline-none py-0.5 text-sm font-medium"
			/>
			<input
				type="text"
				value={e.detail}
				onChange={(ev) => setEditing({ ...e, detail: ev.target.value })}
				placeholder="Description"
				className="w-full bg-transparent border-b border-neutral-300 focus:border-neutral-800 outline-none py-0.5 text-sm text-neutral-600"
			/>
			<div className="flex gap-2">
				<input
					type="date"
					value={e.date}
					onChange={(ev) => setEditing({ ...e, date: ev.target.value })}
					className="flex-1 min-w-0 rounded-md border border-neutral-300 px-2.5 py-1.5 font-mono text-xs"
				/>
				<input
					type="time"
					value={e.time}
					onChange={(ev) => setEditing({ ...e, time: ev.target.value })}
					className="w-18 rounded-md border border-neutral-300 px-2.5 py-1.5 font-mono text-xs"
				/>
				<button
					onClick={() => setEditing({ ...e, date: '', time: '' })}
					className="w-9 rounded-md border border-neutral-300 font-mono text-xs hover:bg-neutral-100"
				>
					✕
				</button>
			</div>
			<div className="flex items-center justify-between">
				<button
					onClick={() => (e.id === null ? setEditing(null) : deleteMutation.mutate(e.id))}
					className="text-xs font-medium text-[#D93C15]"
				>
					{e.id === null ? 'Cancel' : 'Delete'}
				</button>
				<div className="flex gap-2">
					<button
						onClick={() => setEditing(null)}
						className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium hover:bg-neutral-100"
					>
						Cancel
					</button>
					<button
						onClick={() => save(e)}
						disabled={!e.title.trim()}
						className="rounded-md bg-[var(--primary)] px-3 py-1.5 text-xs font-medium disabled:opacity-40"
					>
						Save
					</button>
				</div>
			</div>
		</div>
	)

	const renderItem = (ev: CalendarEvent, column: ColumnKey) => {
		if (editing?.id === ev.id) return renderEditor(editing)
		const { time } = parseBegin(ev.begin)
		return (
			<div
				key={ev.id}
				onClick={() =>
					setEditing({
						id: ev.id,
						type: ev.type,
						column,
						title: ev.title,
						detail: ev.detail ?? '',
						...parseBegin(ev.begin),
					})
				}
				className="flex cursor-pointer items-center gap-3 rounded-md border border-neutral-300 px-3 py-2.5 hover:border-neutral-400"
			>
			<input
				type="checkbox"
				checked={!!ev.completed}
				onClick={(e) => e.stopPropagation()}
				onChange={() => toggleMutation.mutate(ev)}
				className="h-3.5 w-3.5 shrink-0 accent-neutral-900"
			/>
				<span
					className={`flex-1 min-w-0 truncate text-sm font-medium ${
						ev.completed ? 'text-neutral-400 line-through' : 'text-neutral-900'
					}`}
				>
					{ev.title}
				</span>
				{column === 'scheduled' && time && (
					<span className="shrink-0 font-mono text-[11px] text-neutral-500">
						{time}
					</span>
				)}
			</div>
		)
	}

	// group scheduled by date
	const scheduledGroups: { date: string; items: CalendarEvent[] }[] = []
	for (const ev of cols.scheduled) {
		const { date } = parseBegin(ev.begin)
		const g = scheduledGroups.find((x) => x.date === date)
		if (g) g.items.push(ev)
		else scheduledGroups.push({ date, items: [ev] })
	}

	return (
		<div className="flex h-[calc(100vh-2.75rem)] flex-col gap-3 px-4 pt-4 pb-0">
			{/* Toolbar */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-4">
					<h1 className="text-base font-semibold text-neutral-900">Todos</h1>
					{/* Mobile: arrows + dropdown */}
					<div className="flex items-center gap-1 md:hidden">
						<button
							className="flex items-center rounded-md p-1 text-[#666666] hover:bg-[#F0F0EE] hover:text-black"
							aria-label="Previous column"
							onClick={() => stepCol(-1)}
						>
							<ChevronLeft size={18} />
						</button>
						<select
							className="px-3 py-2 text-[13px] font-medium border border-neutral-300 rounded-md bg-white text-neutral-700"
							value={COLS[colIdx]?.key ?? 'todo'}
							onChange={(e) => setColIdx(COLS.findIndex((c) => c.key === e.target.value))}
						>
							{COLS.map((col, i) => (
								<option key={col.key} value={col.key}>
									{col.title}
								</option>
							))}
						</select>
						<button
							className="flex items-center rounded-md p-1 text-[#666666] hover:bg-[#F0F0EE] hover:text-black"
							aria-label="Next column"
							onClick={() => stepCol(1)}
						>
							<ChevronRight size={18} />
						</button>
					</div>
					{/* Desktop: tabs */}
					<div className="hidden md:flex items-center overflow-hidden rounded-lg border border-neutral-300 bg-white">
						{COLS.map((col, i) => (
							<button
								key={col.key}
								onClick={() => setColIdx(i)}
								className={`flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium hover:text-neutral-900 ${
									activeCol === col.key
										? 'bg-[var(--primary)] text-neutral-900'
										: 'text-neutral-500'
								}`}
							>
								{col.title}
							</button>
						))}
					</div>
				</div>
				<button
					onClick={() => openNew('todo')}
					className="rounded-md bg-[var(--primary)] px-4 py-2 text-[13px] font-medium text-neutral-900"
				>
					+ New
				</button>
			</div>

			{/* Board */}
			<div className="flex min-h-0 flex-1 gap-3 overflow-auto">
				{COLS.map((col) => {
					const isEditingNew = editing?.id === null && editing?.column === col.key
					const items = cols[col.key]
					return (
					<div
						key={col.key}
						className={`flex h-fit w-full shrink-0 flex-col gap-2.5 rounded-lg border border-neutral-300 bg-white md:w-95 ${
							activeCol === col.key ? 'flex' : 'hidden md:flex'
						} ${items.length ? 'min-h-64' : ''}`}
					>
							{/* Column header */}
							<div className="m-0 flex items-center justify-between rounded-sm bg-[var(--primary)] px-3 pt-2.5 pb-4">
								<span className="flex items-center gap-1.5 text-sm font-semibold text-neutral-900">
										{col.title}
								</span>
								<div className="flex items-center gap-2">
									<span className="flex items-baseline gap-1.25">
										<span className="text-base font-bold text-neutral-900">
											{items.length}
										</span>
										<span className="text-[11px] font-medium text-[#7A6A00]">
											items
										</span>
									</span>
									<button
										onClick={() => openNew(col.key)}
										className="flex h-5 w-5 items-center justify-center rounded bg-transparent text-sm font-bold leading-none text-neutral-900 hover:text-neutral-600"
										aria-label={`Add to ${col.title}`}
									>
										+
									</button>
								</div>
							</div>
							{/* Items */}
							<div
								className="flex flex-col gap-2 px-3 pb-3"
								onClick={(e) => {
									if (e.target === e.currentTarget && isEditingNew) setEditing(null)
								}}
							>
								{col.key === 'scheduled'
									? scheduledGroups.flatMap((g) => [
											<span
												key={g.date}
												className="text-[13px] font-semibold leading-tight text-neutral-900"
											>
												{fmtDayLabel(g.date)}
											</span>,
											...g.items.map((ev) => renderItem(ev, col.key)),
										])
									: items.map((ev) => renderItem(ev, col.key))}
								{isEditingNew && renderEditor(editing!)}
							{items.length === 0 && !isEditingNew && (
								<button
									onClick={() => openNew(col.key)}
									className="rounded-md border border-dashed border-neutral-300 py-2.5 text-xs text-neutral-400 hover:border-neutral-400 hover:text-neutral-600"
								>
									+ Add item
								</button>
							)}
															</div>
						</div>
					)
				})}
			</div>
		</div>
	)
}
