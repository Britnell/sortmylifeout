import type { APIContext } from "astro";
import { env } from "cloudflare:workers";

export async function POST({ request }: APIContext) {
	const db = env.sortinglifedb;

	// Get session cookie
	const cookie = request.headers.get("cookie") ?? "";
	const match = cookie.match(/(?:^|;\s*)session=([^;]+)/);
	
	if (match) {
		const sessionId = match[1];
		
		// Delete session from database
		await db
			.prepare("DELETE FROM sessions WHERE id = ?")
			.bind(sessionId)
			.run();
	}

	// Return response with cookie expiration
	return new Response(null, {
		status: 302,
		headers: {
			"Set-Cookie": "session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0",
			Location: "/login",
		},
	});
}