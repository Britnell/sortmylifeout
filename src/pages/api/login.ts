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

	const sessionId = randomHex(32);
	const now = Math.floor(Date.now() / 1000);
	const expiresAt = now + SESSION_TTL_SECONDS;

	await db
		.prepare(
			"INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
		)
		.bind(sessionId, user.id, now, expiresAt)
		.run();

	return new Response(null, {
		status: 302,
		headers: {
			"Set-Cookie": `session=${sessionId}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_TTL_SECONDS}`,
			Location: "/app",
		},
	});
}
