import type { APIContext } from "astro";
import { env } from "cloudflare:workers";
import { getSession } from "../../../db/auth";

export async function POST({ request }: APIContext) {
	const db = env.sortinglifedb;

	// Check if user is logged in
	const session = await getSession(request);
	if (!session) {
		return new Response(JSON.stringify({ error: "Unauthorized" }), {
			status: 401,
		});
	}

	// Parse form data
	const formData = await request.formData();
	const title = formData.get("title") as string;
	const description = formData.get("description") as string;
	const location = formData.get("location") as string;
	const color = formData.get("color") as string;
	const date = formData.get("date") as string;

	// Validate required fields
	if (!title || !date) {
		return new Response(
			JSON.stringify({ error: "Title and date are required" }),
			{ status: 400 },
		);
	}

	// Parse date as YYYY-MM-DD
	const startDateStr = date;
	let endDateStr = date;
	let startTimeStr = formData.get("start_time") as string || "00:00";
	let endTimeStr = formData.get("end_time") as string;

	// Pad time strings to HH:MM format
	const padTime = (time: string) => {
		if (!time) return "00:00";
		const [h, m] = time.split(":").map(Number);
		return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
	};

	startTimeStr = padTime(startTimeStr);

	// Handle end time - if provided, use it; otherwise null for all-day event
	if (endTimeStr) {
		endTimeStr = padTime(endTimeStr);
	} else {
		endTimeStr = null;
		endDateStr = null;
	}

	// Insert event into database
	try {
		const result = await db
			.prepare(
				`INSERT INTO events
				 (user_id, name, details, start_date, start_time, end_date, end_time, repeating)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
			)
			.bind(
				session.userId,
				title,
				description || "",
				startDateStr,
				startTimeStr,
				endDateStr,
				endTimeStr,
				""
			)
			.run();

		return new Response(
			JSON.stringify({
				success: true,
				event: {
					id: result.lastID,
					name: title,
					details: description,
					start_date: startDateStr,
					start_time: startTimeStr,
					end_date: endDateStr,
					end_time: endTimeStr,
				},
			}),
			{ status: 201 },
		);
	} catch (error) {
		console.error("Error creating event:", error);
		return new Response(
			JSON.stringify({ error: "Failed to create event" }),
			{ status: 500 },
		);
	}
}