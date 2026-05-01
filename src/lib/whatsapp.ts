const PHONE_NUMBER_ID = '1041968662343715'

export async function sendWhatsAppMessage(to: string, text: string) {
  to = to.replace(/\D/g, '')
  const token = process.env.WHATSAPP_ACCESS_TOKEN
  if (!token) throw new Error('WHATSAPP_ACCESS_TOKEN env var not set')

  const res = await fetch(
    `https://graph.facebook.com/v25.0/${PHONE_NUMBER_ID}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: text },
      }),
    },
  )

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`WhatsApp API error ${res.status}: ${err}`)
  }

  return res.json()
}
