import { toolDefinition } from '@tanstack/ai'

export function createDisplayEventsTool() {
	return toolDefinition({
		name: 'display_events',
		description:
			'Display calendar events, todos, or shopping items as visual cards. Use this when the user wants to see or browse their items (e.g. "what\'s on today?", "show me my todos"). Do NOT use for general questions where a short answer suffices, and do NOT use it to dump many items (e.g. "all my todos") — the user has UI pages for browsing large lists; reserve this tool for showing one or a few specific items.\n\nThe items you pass to this tool are rendered as cards in the chat, so the user already sees them. After calling it, reply with a short count summary only (e.g. "You have 3 events and 2 todos") — never repeat the item titles or details in your text.',
		inputSchema: {
			type: 'object' as const,
			properties: {
				items: {
					type: 'array',
					items: {
						type: 'object',
						properties: {
							title: { type: 'string' },
							type: { type: 'string' },
							begin: { type: 'string' },
							end: { type: 'string' },
							completed: { type: 'string' },
						},
						required: ['title'],
					},
				},
			},
			required: ['items'],
		},
		outputSchema: {
			type: 'object' as const,
			properties: { ok: { type: 'boolean' } },
			required: ['ok'],
		},
	}).server(async () => ({ ok: true as const }))
}
