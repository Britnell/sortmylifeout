import { useState } from "react";
import Dialog from "./Dialog";

interface EventFormData {
	title: string;
	description: string;
}

interface CalendarEvent {
	id: number;
	user_id: number;
	name: string;
	details: string;
	start_date: string;
	start_time: string;
	end_date: string;
	end_time: string;
	repeating: string;
}

interface CalendarProps {
	events: CalendarEvent[];
}

export default function Calendar({ events }: CalendarProps) {
	const [currentDate, setCurrentDate] = useState(new Date());
	const [selectedDay, setSelectedDay] = useState<number | null>(null);
	const [isDialogOpen, setIsDialogOpen] = useState(false);

	// Get current month and year
	const currentMonth = currentDate.getMonth();
	const currentYear = currentDate.getFullYear();

	// Get first day of month and total days
	const firstDay = new Date(currentYear, currentMonth, 1).getDay();
	const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

	console.log(events);

	// Generate days array
	const days = [];
	for (let i = 0; i < firstDay; i++) {
		days.push(null); // Empty cells for days before month starts
	}

	for (let i = 1; i <= daysInMonth; i++) {
		days.push(i);
	}

	// Group events by day
	const eventsByDay = new Map<number, CalendarEvent[]>();
	events.forEach((event) => {
		// Combine start_date and start_time to create a full datetime string
		const dateTimeString = `${event.start_date}T${event.start_time}`;
		const eventDate = new Date(dateTimeString);
		const day = eventDate.getDate();

		if (
			eventDate.getMonth() === currentMonth &&
			eventDate.getFullYear() === currentYear
		) {
			if (!eventsByDay.has(day)) {
				eventsByDay.set(day, []);
			}
			eventsByDay.get(day)?.push(event);
		}
	});

	// Get events for a specific day
	const getEventsForDay = (day: number | null) => {
		if (day === null) return [];
		return eventsByDay.get(day) || [];
	};

	// Weekday names
	const weekdays = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

	const handleDayClick = (day: number) => {
		setSelectedDay(day);
		setIsDialogOpen(true);
	};

	const handleCloseDialog = () => {
		setIsDialogOpen(false);
	};

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const form = e.currentTarget;
		const formData = new FormData(form);

		try {
			const response = await fetch("/api/event/create", {
				method: "POST",
				body: formData,
			});

			if (response.ok) {
				const result = await response.json();
				alert("Event created successfully!");
				form.reset();
				// TODO: Refresh events or add the new event to state
			} else {
				const error = await response.json();
				alert(`Error: ${error.error || "Failed to create event"}`);
			}
		} catch (error) {
			alert("Network error. Please try again.");
		}
	};

	return (
		<div className="calendar">
			<div className="flex justify-between items-center mb-4">
				<h2 className="text-xl font-semibold">
					{currentDate.toLocaleString("default", { month: "long" })}{" "}
					{currentYear}
				</h2>
				<div className="flex gap-2">
					<button
						className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
						onClick={() =>
							setCurrentDate(new Date(currentYear, currentMonth - 1, 1))
						}
					>
						&lt;
					</button>
					<button
						className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
						onClick={() =>
							setCurrentDate(new Date(currentYear, currentMonth + 1, 1))
						}
					>
						&gt;
					</button>
				</div>
			</div>

			<div className="grid grid-cols-7 gap-1">
				{/* Weekday headers */}
				{weekdays.map((day) => (
					<div key={day} className="text-center font-medium p-2 bg-gray-100">
						{day}
					</div>
				))}

				{/* Calendar days */}
				{days.map((day, index) => {
					const dayEvents = getEventsForDay(day);
					const isToday =
						day !== null &&
						new Date().getDate() === day &&
						new Date().getMonth() === currentMonth &&
						new Date().getFullYear() === currentYear;

					return (
						<div
							key={index}
							className={`border p-2 min-h-[100px] cursor-pointer hover:bg-gray-50 ${
								day === null ? "bg-gray-50" : "bg-white"
							} ${isToday ? "bg-blue-50" : ""}`}
							onClick={() => day !== null && handleDayClick(day)}
						>
							{day !== null && (
								<>
									<div className="font-medium">{day}</div>
									{dayEvents.length > 0 && (
										<div className="mt-1 space-y-1">
											{dayEvents.map((event) => (
												<div
													key={event.id}
													className={`text-xs p-1 rounded ${
														event.color || "bg-blue-100"
													}`}
													style={{ backgroundColor: event.color || "#e0f2fe" }}
												>
													{event.name}
												</div>
											))}
										</div>
									)}
								</>
							)}
						</div>
					);
				})}
			</div>

			<Dialog isOpen={isDialogOpen} onClose={handleCloseDialog}>
				<div>
					<h3 className="text-lg font-semibold mb-4">
						Events for {selectedDay}
					</h3>
					{selectedDay && getEventsForDay(selectedDay).length > 0 ? (
						<div className="space-y-2">
							{getEventsForDay(selectedDay).map((event) => (
								<div key={event.id} className="border p-3 rounded">
									<h4 className="font-medium">{event.name}</h4>
									<p className="text-sm text-gray-600">{event.details}</p>{" "}
								</div>
							))}
						</div>
					) : (
						<p className="text-gray-500">No events for this day</p>
					)}

					{/* Event Creation Form */}
					<div className="mt-6">
						<h4 className="font-medium mb-2">Create New Event</h4>
						<form
							action="/api/event/create"
							method="POST"
							className="space-y-3"
							onSubmit={handleSubmit}
						>
							<input
								type="hidden"
								name="date"
								value={
									selectedDay
										? new Date(
												currentYear,
												currentMonth,
												selectedDay,
											).toISOString()
										: ""
								}
							/>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Title
								</label>
								<input
									type="text"
									name="title"
									required
									className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
									placeholder="Event title"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Description
								</label>
								<textarea
									name="description"
									rows={3}
									className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
									placeholder="Event description"
								></textarea>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Color
								</label>
								<input
									type="color"
									name="color"
									className="w-full h-10"
									defaultValue="#3b82f6"
								/>
							</div>

							<button
								type="submit"
								className="w-full py-2 px-4 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
							>
								Create Event
							</button>
						</form>
					</div>

					<button
						className="mt-4 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
						onClick={handleCloseDialog}
					>
						Close
					</button>
				</div>
			</Dialog>
		</div>
	);
}
