import { agentMessage } from './ai'
import { sendWhatsAppMessage } from '#/lib/whatsapp'

export async function replyToWhatsapp(
  messages: string[],
  userId: string,
  phone: string,
) {
  const reply = await agentMessage(messages, userId)
  return sendWhatsAppMessage(phone, reply)
}
