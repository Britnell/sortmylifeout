import type { APIContext } from "astro";
import { env } from "cloudflare:workers";
import { hashPassword, randomHex, createSession, sessionCookie } from "../../db/auth";

export async function POST({ request }: APIContext) {
	const db = env.sortinglifedb;

	let body: { username?: string; password?: string };
	try {
		body = await request.json();
	} catch {
		return new Response(JSON.stringify({ error: "Invalid JSON" }), {
			status: 400,
		});
	}

	const { username, password } = body;
	if (!username || !password) {
		return new Response(
			JSON.stringify({ error: "username and password required" }),
			{ status: 400 },
		);
	}

	const user = await db
		.prepare(
			"SELECT id, password_hash, password_salt FROM users WHERE username = ?",
		)
		.bind(username)
		.first<{ id: number; password_hash: string; password_salt: string }>();

	// Always hash even if user not found to prevent timing attacks
	const salt = user?.password_salt ?? randomHex(16);
	const hash = await hashPassword(password, salt);

	if (!user || hash !== user.password_hash) {
		return new Response(JSON.stringify({ error: "Invalid credentials" }), {
			status: 401,
		});
	}

	const sessionId = await createSession(user.id);

	return new Response(null, {
		status: 302,
		headers: {
			"Set-Cookie": sessionCookie(sessionId),
			Location: "/app",
		},
	});
}
