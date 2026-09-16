// Seeds the LOCAL d1 dev db with your real user (copied from remote) + sample events
// usage: bun run scripts/seed-local.ts
import { execSync } from 'node:child_process'
import { webcrypto } from 'node:crypto'

// your real remote user + credential account (password hash copied from remote db)
const UID = 'HE5JjdP6ORZqBFSAnkIC50e83S71Wmfr'
const ACCOUNT = {
	id: 'i2S95TCODO6rV105EnAtRjtH2auZRvBN',
	password:
		'pbkdf2:19324bc4eefeecbeecc1c1c1792e60d9:c507f49bc58741f532aa66f9bea65f7a40c791adeeef560e7f5c0e365a14bedc',
}
const now = Date.now()
const week = 60 * 60 * 24 * 7 * 1000
const day = (offset: number) => new Date(now + offset * 60 * 60 * 24 * 1000).toISOString().slice(0, 10)

const titles = ['Team standup', 'Dentist', 'Weekend trip', 'Fix calendar bug', 'Buy milk', 'Coffee beans', 'Paper towels']
const events = [
	// reruns delete previous seed rows by title first, so no duplicates
	['event', 'Team standup', 'Weekly sync', 0, 0, `${day(0)}T09:00`, `${day(0)}T09:30`],
	['event', 'Dentist', '', 0, 0, `${day(1)}T14:00`, `${day(1)}T15:00`],
	['event', 'Weekend trip', 'Pack bags', 0, 1, day(5), day(6)],
	['todo', 'Fix calendar bug', 'sessions hang', 0, null, null, null],
	['todo', 'Buy milk', '', 1, null, null, null],
	['shopping', 'Coffee beans', '', 0, null, null, null],
	['shopping', 'Paper towels', '', 0, null, null, null],
]

const rows = events
	.map(
		([type, title, detail, completed, allDay, begin, end]) =>
			`('${UID}','${type}','${title.replace(/'/g, "''")}','${detail.replace(/'/g, "''")}',${completed},${allDay ?? 'NULL'},${begin ? `'${begin}'` : 'NULL'},${end ? `'${end}'` : 'NULL'})`,
	)
	.join(',\n')

const sql = `
INSERT OR IGNORE INTO "user" (id, name, email, emailVerified, createdAt, updatedAt)
VALUES ('${UID}', 'Tommy', 'britnell@proton.me', 1, ${now}, ${now});

INSERT OR IGNORE INTO account (id, accountId, providerId, userId, password, createdAt, updatedAt)
VALUES ('${ACCOUNT.id}', '${UID}', 'credential', '${UID}', '${ACCOUNT.password}', ${now}, ${now});

DELETE FROM event WHERE user_id = '${UID}' AND title IN (${titles.map((t) => `'${t}'`).join(', ')});
INSERT INTO event (user_id, type, title, detail, completed, all_day, begin, end)
VALUES
${rows};
`

execSync(`bunx wrangler d1 execute sortinglifedb --local --file /dev/stdin`, {
	input: sql,
	stdio: ['pipe', 'inherit', 'inherit'],
})

console.log(`\nSeeded local db. login: britnell@proton.me (same password as prod) — user id ${UID}`)
