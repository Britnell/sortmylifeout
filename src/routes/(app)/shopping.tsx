import { localToday } from '@/lib/date'
import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
	searchEventsFn,
	createEventFn,
	updateEventFn,
	deleteEventFn,
} from '@/serverFn/queries.functions'

interface CalendarEvent {
	id: number
	type: string
	begin: string | null
	title: string
	detail: string | null
	completed: string | null
}

interface EditState {
	id: number | null
	title: string
	detail: string
	date: string
	time: string
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

function fmtDayLabel(dateStr: string): string {
	const d = new Date(`${dateStr}T00:00:00`)
	return d.toLocaleDateString('en-US', {
		weekday: 'short',
		month: 'short',
		day: 'numeric',
	})
}

export const Route = createFileRoute('/(app)/shopping')({
	component: ShoppingPage,
})

function ShoppingPage() {
	const queryClient = useQueryClient()
	const [editing, setEditing] = useState<EditState | null>(null)

	const { data: events = [] } = useQuery({
		queryKey: ['shopping', 'events'],
		queryFn: () => searchEventsFn({ data: { type: 'shopping' } }),
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
	const undated = all
		.filter((e) => !e.begin)
		.sort(byDone)
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

	const renderEditor = (e: EditState) => (
		<div className="rounded-md border border-neutral-800 bg-[#E7E8E5] p-3 space-y-2.5">
			<input
				autoFocus
				type="text"
				value={e.title}
				onChange={(ev) => setEditing({ ...e, title: ev.target.value })}
				onKeyDown={(ev) => ev.key === 'Enter' && save(e)}
				placeholder="Item"
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
					onClick={() =>
						e.id === null ? setEditing(null) : deleteMutation.mutate(e.id)
					}
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

	const renderItem = (ev: CalendarEvent) => {
		if (editing?.id === ev.id) return renderEditor(editing)
		const { time } = parseBegin(ev.begin)
		return (
			<div
				key={ev.id}
				onClick={() =>
					setEditing({
						id: ev.id,
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
				{time && (
					<span className="shrink-0 font-mono text-[11px] text-neutral-500">
						{time}
					</span>
				)}
			</div>
		)
	}

	const renderColumn = (
		title: string,
		items: CalendarEvent[],
		children: React.ReactNode,
	) => (
		<div className="flex flex-col gap-2.5 rounded-lg border border-neutral-300 bg-white">
			<div className="flex items-center rounded-t-lg border-b border-b-[var(--primary)] bg-[var(--primary)] px-3 py-3">
				<span className="text-sm font-semibold text-neutral-900">{title}</span>
				<span className="ml-auto text-sm opacity-60">{items.length} items</span>
			</div>
			<div className="flex flex-col gap-2 px-3 pb-3">
				{children}
				{editing?.id === null && (
					<div onClick={(e) => e.stopPropagation()}>{renderEditor(editing)}</div>
				)}
				{items.length === 0 && editing?.id !== null && (
					<button
						onClick={openNew}
						className="rounded-md border border-dashed border-neutral-300 py-2.5 text-xs text-neutral-400 hover:border-neutral-400 hover:text-neutral-600"
					>
						+ Add item
					</button>
				)}
			</div>
		</div>
	)

	return (
		<div className="mx-auto max-w-3xl px-4 pt-6 space-y-4">
			<div className="flex items-center justify-between">
				<h1 className="text-base font-semibold text-neutral-900">Shopping</h1>
				<button
					onClick={openNew}
					className="rounded-md bg-[var(--primary)] px-4 py-2 text-[13px] font-medium text-neutral-900"
				>
					+ New
				</button>
			</div>

			{renderColumn('Items', undated, undated.map(renderItem))}

			{datedGroups.length > 0 &&
				renderColumn(
					'Scheduled',
					dated,
					datedGroups.flatMap((g) => [
						<span
							key={g.date}
							className="text-[13px] font-semibold leading-tight text-neutral-900"
						>
							{fmtDayLabel(g.date)}
						</span>,
						...g.items.map(renderItem),
					]),
				)}
		</div>
	)
}
