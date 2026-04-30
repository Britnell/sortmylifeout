import { useState, useMemo, useRef, useLayoutEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
	searchEventsFn,
	createEventFn,
	updateEventFn,
	deleteEventFn,
} from '@/serverFn/queries.functions'
import CalendarEventDialog from '@/components/CalendarEventDialog'
import type { CalendarEvent } from '@/components/CalendarEventDialog'
import { fmtDate, getWeekDays, isSameDay, weekdays } from '#/lib/date'

type ViewMode = 'week' | 'day'

function getDayDate(dayOffset: number): Date {
	const now = new Date()
	return new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset)
}

function getDayLabel(d: Date, today: Date): string {
	if (isSameDay(d, today)) return 'Today'
	const tomorrow = new Date(today)
	tomorrow.setDate(tomorrow.getDate() + 1)
	if (isSameDay(d, tomorrow)) return 'Tomorrow'
	const yesterday = new Date(today)
	yesterday.setDate(yesterday.getDate() - 1)
	if (isSameDay(d, yesterday)) return 'Yesterday'
	return d.toLocaleDateString('default', {
		weekday: 'short',
		month: 'short',
		day: 'numeric',
	})
}

const DAY_RANGE = 60

export default function Calendar() {
	const [viewMode, setViewMode] = useState<ViewMode>('week')
	const [weekOffset, _setWeekOffset] = useState(0)
	const [selectedDate, setSelectedDate] = useState<string | null>(null)
	const [dialogOpen, setDialogOpen] = useState(false)
	const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)

	const today = new Date()

	const allWeekDays = useMemo(
		() => [
			getWeekDays(weekOffset - 1),
			getWeekDays(weekOffset),
			getWeekDays(weekOffset + 1),
		],
		[weekOffset],
	)

	const weekDate_from = fmtDate(allWeekDays[0][0])
	const weekDate_to = fmtDate(allWeekDays[2][6])

	const dayFrom = getDayDate(-DAY_RANGE)
	const dayTo = getDayDate(DAY_RANGE)
	const dayDate_from = fmtDate(dayFrom)
	const dayDate_to = fmtDate(dayTo)

	const date_from = viewMode === 'week' ? weekDate_from : dayDate_from
	const date_to = viewMode === 'week' ? weekDate_to : dayDate_to

	const { data: events = [], refetch: invalidate } = useQuery({
		queryKey: ['searchEventsFn', date_from, date_to],
		queryFn: () => searchEventsFn({ data: { date_from, date_to } }),
	})

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

	const closeDialog = () => {
		setDialogOpen(false)
		setEditingEvent(null)
	}

	const createMutation = useMutation({
		mutationFn: (data: {
			begin?: string
			allDay: boolean
			end?: string
			title: string
			detail?: string
			type?: string
		}) => createEventFn({ data }),
		onSuccess: () => {
			invalidate()
			closeDialog()
		},
	})

	const updateMutation = useMutation({
		mutationFn: (data: {
			id: number
			begin: string
			allDay: boolean
			end?: string
			title: string
			detail?: string
			type?: string
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

	const openCreate = (dateStr: string) => {
		setSelectedDate(dateStr)
		setEditingEvent(null)
		setDialogOpen(true)
	}

	const openEdit = (ev: CalendarEvent, e: React.MouseEvent) => {
		e.stopPropagation()
		setEditingEvent(ev)
		setDialogOpen(true)
	}

	const firstDay = allWeekDays[0][0]
	const lastDay = allWeekDays[2][6]
	const weekLabel = `${firstDay.toLocaleDateString('default', { month: 'short', day: 'numeric' })} - ${lastDay.toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' })}`

	const dayScrollRef = useRef<HTMLDivElement>(null)

	useLayoutEffect(() => {
		if (viewMode === 'day' && dayScrollRef.current) {
			const todayEl = dayScrollRef.current.querySelector('[data-today="true"]')
			if (todayEl) {
				todayEl.scrollIntoView({ block: 'start', behavior: 'instant' })
			}
		}
	}, [viewMode])

	const dayDates = useMemo(() => {
		return Array.from({ length: DAY_RANGE * 2 + 1 }, (_, i) =>
			getDayDate(i - DAY_RANGE),
		)
	}, [])

	const renderEvent = (ev: CalendarEvent) =>
		ev.type === 'todo' ? (
			<div
				key={ev.id}
				className="text-sm bg-gray-100 text-gray-800 p-2 rounded flex items-center gap-2"
			>
				<input
					type="checkbox"
					checked={!!ev.completed}
					className="shrink-0"
					onChange={(e) => {
						updateMutation.mutate({
							id: ev.id,
							begin: ev.begin ?? '',
							allDay: !ev.begin?.includes('T'),
							title: ev.title,
							detail: ev.detail ?? undefined,
							completed: e.target.checked,
						})
					}}
					onClick={(e) => e.stopPropagation()}
				/>
				<span
					className="cursor-pointer hover:underline"
					onClick={(e) => openEdit(ev, e)}
				>
					{ev.title}
				</span>
			</div>
		) : (
			<div
				key={ev.id}
				className="text-sm bg-blue-100 text-blue-800 p-2 rounded cursor-pointer hover:bg-blue-200"
				onClick={(e) => openEdit(ev, e)}
			>
				<div className="font-medium">{ev.title}</div>
				{ev.begin?.includes('T') && (
					<div className="text-xs text-blue-600">
						{ev.begin.split('T')[1].slice(0, 5)}
						{ev.end?.includes('T') && ` - ${ev.end.split('T')[1].slice(0, 5)}`}
					</div>
				)}
			</div>
		)

	return (
		<>
			<div className="flex items-center gap-4 mb-4">
				<div className="flex border border-gray-300 rounded-md overflow-hidden">
					<button
						className={`px-4 py-2 text-sm font-medium transition-colors ${viewMode === 'week' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
						onClick={() => setViewMode('week')}
					>
						Week
					</button>
					<button
						className={`px-4 py-2 text-sm font-medium transition-colors border-l border-gray-300 ${viewMode === 'day' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
						onClick={() => setViewMode('day')}
					>
						Day
					</button>
				</div>
				{viewMode === 'week' && (
					<h2 className="text-xl font-semibold">{weekLabel}</h2>
				)}
			</div>

			{viewMode === 'week' && (
				<div className="grid grid-cols-7 gap-1">
					{weekdays.map((day) => (
						<div
							key={day}
							className="text-center font-medium p-2 rounded-t text-sm"
						>
							{day}
						</div>
					))}

					{allWeekDays.map((weekDays, wi) =>
						weekDays.map((day, i) => {
							const dateStr = fmtDate(day)
							const dayEvents = eventsByDate.get(dateStr) || []
							const isToday = isSameDay(day, today)

							return (
								<div
									key={`${wi}-${i}`}
									className={`border p-2 min-h-[120px] cursor-pointer rounded ${isToday ? 'border-blue-300' : ''}`}
									onClick={() => openCreate(dateStr)}
								>
									<div
										className={`text-sm font-medium ${isToday ? 'text-blue-600' : ''}`}
									>
										{day.getDate()}
									</div>
									{(() => {
										const allDayEvs = dayEvents.filter(
											(ev) => ev.all_day || !ev.begin?.includes('T'),
										)
										const timedEvs = dayEvents
											.filter(
												(ev) => !ev.all_day && ev.begin?.includes('T'),
											)
											.sort((a, b) =>
												(a.begin ?? '').localeCompare(b.begin ?? ''),
											)

										const renderAllDay = (ev: CalendarEvent) =>
											ev.type === 'todo' ? (
												<div
													key={ev.id}
													className="text-xs bg-gray-100 text-gray-800 p-1 rounded flex items-center gap-1"
													onClick={(e) => {
														e.stopPropagation()
														openEdit(ev, e)
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
																begin: ev.begin ?? '',
																allDay: !ev.begin?.includes('T'),
																title: ev.title,
																detail: ev.detail ?? undefined,
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
														openEdit(ev, e)
													}}
												>
													{ev.title}
												</div>
											)

										return (
											<div className="mt-1 space-y-1">
												{allDayEvs.map(renderAllDay)}
												{timedEvs.map((ev) => (
													<div key={ev.id}>
														<div className="text-[10px] text-gray-500 leading-tight pb-1">
															{ev.begin!.split('T')[1].slice(0, 5)}
														</div>
														<div
															className={`text-xs p-1 rounded cursor-pointer overflow-hidden ${ev.type === 'todo' ? 'bg-gray-100 text-gray-800 hover:bg-gray-200' : 'bg-blue-100 text-blue-800 hover:bg-blue-200'}`}
															onClick={(e) => {
																e.stopPropagation()
																openEdit(ev, e)
															}}
														>
															<div className="truncate">{ev.title}</div>
														</div>
													</div>
												))}
											</div>
										)
									})()}
								</div>
							)
						}),
					)}
				</div>
			)}

			{viewMode === 'day' && (
				<div
					ref={dayScrollRef}
					className="h-[calc(100vh-180px)] overflow-y-auto scroll-smooth"
					style={{ scrollSnapType: 'y proximity' }}
				>
					{dayDates.map((d) => {
						const dateStr = fmtDate(d)
						const isToday = isSameDay(d, today)
						const dayEvents = eventsByDate.get(dateStr) || []
						const allDayEvs = dayEvents.filter(
							(ev) => ev.all_day || !ev.begin?.includes('T'),
						)
						const timedEvs = dayEvents
							.filter((ev) => !ev.all_day && ev.begin?.includes('T'))
							.sort((a, b) =>
								(a.begin ?? '').localeCompare(b.begin ?? ''),
							)

						return (
							<div
								key={dateStr}
								data-today={isToday || undefined}
								style={{ scrollSnapAlign: 'start' }}
								className={`border-b py-3 px-2 ${isToday ? 'bg-blue-50/50' : ''}`}
							>
								<div className="flex items-center justify-between mb-2">
									<div>
										<span
											className={`text-sm font-semibold ${isToday ? 'text-blue-600' : 'text-gray-900'}`}
										>
											{getDayLabel(d, today)}
										</span>
										<span className="text-xs text-gray-400 ml-2">
											{d.toLocaleDateString('default', {
												weekday: 'short',
												month: 'short',
												day: 'numeric',
											})}
										</span>
									</div>
									<button
										className="text-xs text-gray-400 hover:text-blue-600"
										onClick={() => openCreate(dateStr)}
									>
										+ Add
									</button>
								</div>
								{allDayEvs.length === 0 && timedEvs.length === 0 ? (
									<div className="text-xs text-gray-300 py-2">
										No events
									</div>
								) : (
									<div className="space-y-1">
										{allDayEvs.map(renderEvent)}
										{timedEvs.map((ev) => (
											<div key={ev.id} className="flex gap-2">
												<div className="text-xs text-gray-400 w-12 shrink-0 pt-2">
													{ev.begin!.split('T')[1].slice(0, 5)}
												</div>
												<div className="flex-1">
													{ev.type === 'todo' ? (
														<div className="text-sm bg-gray-100 text-gray-800 p-2 rounded flex items-center gap-2">
															<input
																type="checkbox"
																checked={!!ev.completed}
																className="shrink-0"
																onChange={(e) => {
																	updateMutation.mutate({
																		id: ev.id,
																		begin: ev.begin ?? '',
																		allDay: false,
																		title: ev.title,
																		detail: ev.detail ?? undefined,
																		completed: e.target.checked,
																	})
																}}
																onClick={(e) => e.stopPropagation()}
															/>
															<span
																className="cursor-pointer hover:underline"
																onClick={(e) => openEdit(ev, e)}
															>
																{ev.title}
															</span>
														</div>
													) : (
														<div
															className="text-sm bg-blue-100 text-blue-800 p-2 rounded cursor-pointer hover:bg-blue-200"
															onClick={(e) => openEdit(ev, e)}
														>
															<div className="font-medium">{ev.title}</div>
															{ev.end?.includes('T') && (
																<div className="text-xs text-blue-600">
																	to {ev.end.split('T')[1].slice(0, 5)}
																</div>
															)}
														</div>
													)}
												</div>
											</div>
										))}
									</div>
								)}
							</div>
						)
					})}
				</div>
			)}

			<CalendarEventDialog
				isOpen={dialogOpen}
				onClose={closeDialog}
				editingEvent={editingEvent}
				selectedDate={selectedDate}
				createMutation={createMutation}
				updateMutation={updateMutation}
				deleteMutation={deleteMutation}
			/>
		</>
	)
}
