import { useState } from "react";
import Dialog from "./Dialog";

interface CalendarEvent {
	id: number;
	user_id: number;
	title: string;
	description: string;
	start_at: string;
	end_at: string;
	location?: string;
	color?: string;
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
	events.forEach(event => {
		const eventDate = new Date(event.start_at);
		const day = eventDate.getDate();

		if (eventDate.getMonth() === currentMonth && eventDate.getFullYear() === currentYear) {
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
	const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

	const handleDayClick = (day: number) => {
		setSelectedDay(day);
		setIsDialogOpen(true);
	};

	const handleCloseDialog = () => {
		setIsDialogOpen(false);
	};

	return (
		<div className="calendar">
			<div className="flex justify-between items-center mb-4">
				<h2 className="text-xl font-semibold">
					{currentDate.toLocaleString("default", { month: "long" })} {currentYear}
				</h2>
				<div className="flex gap-2">
					<button
						className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
						onClick={() => setCurrentDate(new Date(currentYear, currentMonth - 1, 1))}
					>
						&lt;
					</button>
					<button
						className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
						onClick={() => setCurrentDate(new Date(currentYear, currentMonth + 1, 1))}
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
													{event.title}
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
					<h3 className="text-lg font-semibold mb-4">Events for {selectedDay}</h3>
					{selectedDay && getEventsForDay(selectedDay).length > 0 ? (
						<div className="space-y-2">
							{getEventsForDay(selectedDay).map((event) => (
								<div key={event.id} className="border p-3 rounded">
									<h4 className="font-medium">{event.title}</h4>
									<p className="text-sm text-gray-600">{event.description}</p>
									{event.location && (
										<p className="text-sm text-gray-500">📍 {event.location}</p>
									)}
								</div>
							))}
						</div>
					) : (
						<p className="text-gray-500">No events for this day</p>
					)}
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