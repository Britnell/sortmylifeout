import { agentMessage } from './ai'
import { sendWhatsAppMessage } from '#/lib/whatsapp'

export async function replyToWhatsapp(
  messages: string[],
  userId: string,
  phone: string,
) {
  try {
    const reply = await agentMessage(messages, userId)
    console.log({ reply })
    return sendWhatsAppMessage(phone, reply)
  } catch (err) {
    console.error('[replyToWhatsapp] error:', err)
    throw err
  }
}
