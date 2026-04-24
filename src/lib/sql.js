// SQL queries and types for the application

/**
 * Calendar Event type
 * @typedef {Object} CalendarEvent
 * @property {number} id - Event ID
 * @property {number} user_id - User ID
 * @property {string} name - Event name
 * @property {string} details - Event details
 * @property {string} start_date - Start date as YYYY-MM-DD
 * @property {string} start_time - Start time as HH:MM
 * @property {string} [end_date] - End date as YYYY-MM-DD (null for all-day events)
 * @property {string} [end_time] - End time as HH:MM (null for all-day events)
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
			`SELECT * FROM events
			WHERE user_id = ?
  			AND start_date >= ?
  			AND start_date <= ?
			ORDER BY
			  start_date ASC, start_time ASC`,
		)
		.bind(userId, startDate, endDate)
		.all();

	return result.results || [];
}
