import { agentMessage } from '#/tools/ai'
import { db } from '#/lib/db'

export async function receiveEmail(from: string, body: string) {
  const user = await db
    .selectFrom('user')
    .select(['id'])
    .where('email', '=', from)
    .executeTakeFirst()

  if (!user) {
    console.error(`Email from unknown address: ${from}`)
    return
  }

  const resp = await agentMessage([body], user.id)
  console.log({ respd })
  return null
}
