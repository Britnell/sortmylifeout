import { toolDefinition } from '@tanstack/ai'

export function createDisplayEventsTool() {
	return toolDefinition({
		name: 'display_events',
		description:
			'Display calendar events, todos, or shopping items as visual cards. Use this when the user wants to see or browse their items (e.g. "what\'s on today?", "show me my todos"). Do NOT use for general questions where a short answer suffices. After calling this tool, respond with a brief summary only (e.g. "You have 3 events today") — do not repeat the individual item details in your text response.',
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
