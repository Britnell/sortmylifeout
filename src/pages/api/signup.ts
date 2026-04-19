import type { APIContext } from "astro";
import { env } from "cloudflare:workers";

const ITERATIONS = 100_000;
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

async function hashPassword(password: string, salt: string): Promise<string> {
	const enc = new TextEncoder();
	const keyMaterial = await crypto.subtle.importKey(
		"raw",
		enc.encode(password),
		"PBKDF2",
		false,
		["deriveBits"],
	);
	const bits = await crypto.subtle.deriveBits(
		{
			name: "PBKDF2",
			salt: enc.encode(salt),
			iterations: ITERATIONS,
			hash: "SHA-256",
		},
		keyMaterial,
		256,
	);
	return btoa(String.fromCharCode(...new Uint8Array(bits)));
}

function randomHex(bytes: number): string {
	return Array.from(crypto.getRandomValues(new Uint8Array(bytes)))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

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

	const sessionId = randomHex(32);
	const now = Math.floor(Date.now() / 1000);
	const expiresAt = now + SESSION_TTL_SECONDS;

	await db
		.prepare(
			"INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
		)
		.bind(sessionId, result.id, now, expiresAt)
		.run();

	return new Response(null, {
		status: 302,
		headers: {
			"Set-Cookie": `session=${sessionId}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_TTL_SECONDS}`,
			Location: "/app",
		},
	});
}
