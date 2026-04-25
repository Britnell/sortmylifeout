import {
	db,
	hashPassword,
	randomHex,
	createSession,
	sessionCookie,
} from './auth'

export async function loginUser(username: string, password: string) {
	const user = await db
		.prepare(
			'SELECT id, password_hash, password_salt FROM users WHERE username = ?',
		)
		.bind(username)
		.first<{
			id: number
			password_hash: string
			password_salt: string
		}>()

	const salt = user?.password_salt ?? randomHex(16)
	const hash = await hashPassword(password, salt)

	if (!user || hash !== user.password_hash) {
		return { error: 'Invalid credentials' }
	}

	const sessionId = await createSession(user.id)

	return { success: true, cookie: sessionCookie(sessionId) }
}

export async function signupUser(username: string, email: string, password: string) {
	const existing = await db
		.prepare('SELECT id FROM users WHERE username = ? OR email = ?')
		.bind(username, email)
		.first<{ id: number }>()

	if (existing) {
		return { error: 'Username or email already taken' }
	}

	const salt = randomHex(16)
	const hash = await hashPassword(password, salt)

	const result = await db
		.prepare(
			'INSERT INTO users (username, email, password_hash, password_salt) VALUES (?, ?, ?, ?) RETURNING id',
		)
		.bind(username, email, hash, salt)
		.first<{ id: number }>()

	if (!result) {
		return { error: 'Failed to create user' }
	}

	const sessionId = await createSession(result.id)

	return { success: true, cookie: sessionCookie(sessionId) }
}

export async function logoutUser(request: Request) {
	const cookie = request.headers.get('cookie') ?? ''
	const match = cookie.match(/(?:^|;\s*)session=([^;]+)/)

	if (match) {
		await db.prepare('DELETE FROM sessions WHERE id = ?').bind(match[1]).run()
	}

	return {
		success: true,
		clearCookie: 'session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0',
	}
}
