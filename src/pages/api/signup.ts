import type { APIContext } from "astro";
import { env } from "cloudflare:workers";
import { hashPassword, randomHex, createSession, sessionCookie } from "../../db/auth";

export async function POST({ request }: APIContext) {
	const db = env.sortinglifedb;

	let body: { username?: string; email?: string; password?: string };
	try {
		body = await request.json();
	} catch {
		return new Response(JSON.stringify({ error: "Invalid JSON" }), {
			status: 400,
		});
	}

	const { username, email, password } = body;
	if (!username || !email || !password) {
		return new Response(
			JSON.stringify({ error: "username, email and password required" }),
			{ status: 400 },
		);
	}

	const existing = await db
		.prepare("SELECT id FROM users WHERE username = ? OR email = ?")
		.bind(username, email)
		.first<{ id: number }>();

	if (existing) {
		return new Response(
			JSON.stringify({ error: "Username or email already taken" }),
			{ status: 409 },
		);
	}

	const salt = randomHex(16);
	const hash = await hashPassword(password, salt);

	const result = await db
		.prepare(
			"INSERT INTO users (username, email, password_hash, password_salt) VALUES (?, ?, ?, ?) RETURNING id",
		)
		.bind(username, email, hash, salt)
		.first<{ id: number }>();

	if (!result) {
		return new Response(JSON.stringify({ error: "Failed to create user" }), {
			status: 500,
		});
	}

	const sessionId = await createSession(db, result.id);

	return new Response(null, {
		status: 302,
		headers: {
			"Set-Cookie": sessionCookie(sessionId),
			Location: "/app",
		},
	});
}
