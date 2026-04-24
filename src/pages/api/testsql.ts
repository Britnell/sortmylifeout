import type { APIContext } from "astro";
import { env } from "cloudflare:workers";

export async function GET({ locals }: APIContext) {
	const { sortinglifedb } = env;

	// Create a table if it doesn't exist
	await sortinglifedb
		.prepare(
			`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL
    );`,
		)
		.run();

	// Insert a test record
	await sortinglifedb
		.prepare("INSERT INTO users (name) VALUES (?)")
		.bind("Test User")
		.run();

	// Query the data
	const { results } = await sortinglifedb.prepare("SELECT * FROM users").all();

	return new Response(JSON.stringify(results));
}
