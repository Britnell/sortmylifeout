import Calendar from "./calendar";

export default function App({
	userId,
	events,
}: {
	userId: number;
	events: any[];
}) {
	return (
		<div className="p-4">
			<h1 className="text-2xl font-bold mb-6">Calendar</h1>
			<Calendar events={events} />
		</div>
	);
}
