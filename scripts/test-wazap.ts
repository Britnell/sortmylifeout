#!/usr/bin/env bun
// Usage: bun scripts/test-wazap.ts [message] [url]
// Sends a fake WhatsApp webhook POST to your local dev server

const APP_SECRET = process.env.FB_APP_SECRET
if (!APP_SECRET) throw new Error('FB_APP_SECRET env var required')
const FROM_NUMBER = '447700900000'
const MESSAGE = process.argv[2] ?? 'Hello, what events do I have today?'
const URL = process.argv[3] ?? 'http://localhost:3000/api/wazap'

const payload = {
	object: 'whatsapp_business_account',
	entry: [
		{
			id: 'test-entry-id',
			changes: [
				{
					field: 'messages',
					value: {
						messaging_product: 'whatsapp',
						metadata: {
							display_phone_number: '15550001234',
							phone_number_id: '1041968662343715',
						},
						contacts: [{ profile: { name: 'Test User' }, wa_id: FROM_NUMBER }],
						messages: [
							{
								id: 'wamid.test123',
								from: FROM_NUMBER,
								timestamp: String(Math.floor(Date.now() / 1000)),
								type: 'text',
								text: { body: MESSAGE },
							},
						],
					},
				},
			],
		},
	],
}

const body = JSON.stringify(payload)

const key = await crypto.subtle.importKey(
	'raw',
	new TextEncoder().encode(APP_SECRET),
	{ name: 'HMAC', hash: 'SHA-256' },
	false,
	['sign'],
)
const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body))
const signature =
	'sha256=' +
	Array.from(new Uint8Array(mac))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('')

console.log(`Sending to: ${URL}`)
console.log(`From: +${FROM_NUMBER}`)
console.log(`Message: "${MESSAGE}"`)

const res = await fetch(URL, {
	method: 'POST',
	headers: {
		'Content-Type': 'application/json',
		'x-hub-signature-256': signature,
	},
	body,
})

console.log(`Response: ${res.status} ${res.statusText}`)
const text = await res.text()
if (text) console.log(text)
