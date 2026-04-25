import { env } from 'cloudflare:workers';

export const ITERATIONS = 100_000;
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export const db = env.sortinglifedb;

export function randomHex(bytes: number): string {
	return Array.from(crypto.getRandomValues(new Uint8Array(bytes)))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

export async function hashPassword(
	password: string,
	salt: string,
): Promise<string> {
	const enc = new TextEncoder();
	const keyMaterial = await crypto.subtle.importKey(
		'raw',
		enc.encode(password),
		'PBKDF2',
		false,
		['deriveBits'],
	);
	const bits = await crypto.subtle.deriveBits(
		{
			name: 'PBKDF2',
			salt: enc.encode(salt),
			iterations: ITERATIONS,
			hash: 'SHA-256',
		},
		keyMaterial,
		256,
	);
	return btoa(String.fromCharCode(...new Uint8Array(bits)));
}

export async function createSession(userId: number): Promise<string> {
	const sessionId = randomHex(32);
	const now = Math.floor(Date.now() / 1000);
	const expiresAt = now + SESSION_TTL_SECONDS;
	await db
		.prepare(
			'INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)',
		)
		.bind(sessionId, userId, now, expiresAt)
		.run();
	return sessionId;
}

export function sessionCookie(sessionId: string): string {
	return `session=${sessionId}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_TTL_SECONDS}`;
}

export async function getSession(
	request: Request,
): Promise<{ userId: number } | null> {
	const cookie = request.headers.get('cookie') ?? '';
	const match = cookie.match(/(?:^|;\s*)session=([^;]+)/);
	if (!match) return null;
	const sessionId = match[1];
	const now = Math.floor(Date.now() / 1000);
	try {
		const row = await db
			.prepare(
				'SELECT user_id FROM sessions WHERE id = ? AND expires_at > ?',
			)
			.bind(sessionId, now)
			.first<{ user_id: number }>();
		if (!row) return null;
		return { userId: row.user_id };
	} catch (e) {
		console.error('Session lookup failed:', e);
		return null;
	}
}
