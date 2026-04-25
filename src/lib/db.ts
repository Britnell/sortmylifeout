import { Kysely } from 'kysely'
import { D1Dialect } from 'kysely-d1'
import { env } from 'cloudflare:workers'

export function getDb() {
	return new Kysely({ dialect: new D1Dialect({ database: env.sortinglifedb }) })
}
