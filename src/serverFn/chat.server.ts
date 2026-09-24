import { decisionModel } from './jev.server'
import type { Messages } from './types'

export async function sendChat(userId: string, messages: Messages) {
  const q = await decisionModel(messages, userId)

  return { messages: [] }
}
