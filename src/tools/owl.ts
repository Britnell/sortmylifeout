import { agentMessage } from '#/tools/ai'
import { db } from '@/lib/db'

export async function receiveEmail(from: string, body: string) {
  const user = await db
    .selectFrom('user')
    .select(['id'])
    .where('email', '=', from)
    .executeTakeFirst()

  if (!user) {
    throw new Error(`Email from unknown address: ${from}`)
  }

  const resp = await agentMessage([body], user.id)
  console.log({ resp })
  return null
}
