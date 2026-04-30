import { type Generated, Kysely } from 'kysely'
import { D1Dialect } from 'kysely-d1'
import { env } from 'cloudflare:workers'

export interface EventTable {
  id: Generated<number>
  user_id: string
  type: 'event' | 'todo' | 'shopping' | 'reminder'
  all_day: 0 | 1
  begin: string | null
  end: string | null
  title: string
  detail: string | null
  completed: 0 | 1
}

export interface Database {
  event: EventTable
}

export function getDb() {
	return new Kysely<Database>({ dialect: new D1Dialect({ database: env.sortinglifedb }) })
}
