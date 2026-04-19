// SQL queries and types for the application

/**
 * Calendar Event type
 * @typedef {Object} CalendarEvent
 * @property {number} id - Event ID
 * @property {number} user_id - User ID
 * @property {string} title - Event title
 * @property {string} description - Event description
 * @property {string} start_at - Start datetime as ISO string
 * @property {string} end_at - End datetime as ISO string
 * @property {string} [location] - Optional location
 * @property {string} [color] - Optional color code
 */

/**
 * Get calendar events for a specific date range
 * @param {D1Database} db - Cloudflare D1 database instance
 * @param {number} userId - User ID
 * @param {string} startDate - Start date as YYYY-MM-DD
 * @param {string} endDate - End date as YYYY-MM-DD
 * @returns {Promise<Array<CalendarEvent>>} Array of calendar events
 */
export async function getCalendarEvents(db, userId, startDate, endDate) {
	const result = await db
		.prepare(
			"SELECT * FROM calendar WHERE user_id = ? AND start_at >= ? AND start_at <= ? ORDER BY start_at ASC",
		)
		.bind(userId, startDate, endDate)
		.all();
	
	return result.results || [];
}
