// Date utility functions

/**
 * Get the current month as a string in YYYY-MM format
 * @returns {string} Current month in YYYY-MM format
 */
export function getCurrentMonth(): string {
	const now = new Date();
	const year = now.getFullYear();
	const month = String(now.getMonth() + 1).padStart(2, "0"); // Months are 0-indexed
	return `${year}-${month}`;
}

/**
 * Get the first day of the current month
 * @returns {Date} First day of current month
 */
export function getFirstDayOfCurrentMonth(): Date {
	const now = new Date();
	return new Date(now.getFullYear(), now.getMonth(), 1);
}

/**
 * Get the last day of the current month
 * @returns {Date} Last day of current month
 */
export function getLastDayOfCurrentMonth(): Date {
	const now = new Date();
	return new Date(now.getFullYear(), now.getMonth() + 1, 0);
}

/**
 * Format date as YYYY-MM-DD
 * @param {Date} date - The date to format
 * @returns {string} Formatted date string
 */
export function dateString(date: Date): string {
	return date.toISOString().split("T")[0];
}

/**
 * Check if a date string is within the current month
 * @param {string} dateString - Date string in YYYY-MM-DD format
 * @returns {boolean} True if date is in current month
 */
export function isDateInCurrentMonth(dateString: string): boolean {
	const date = new Date(dateString);
	const now = new Date();
	return (
		date.getFullYear() === now.getFullYear() &&
		date.getMonth() === now.getMonth()
	);
}
