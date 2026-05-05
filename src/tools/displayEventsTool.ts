import { toolDefinition } from '@tanstack/ai'

export function createDisplayEventsTool() {
	return toolDefinition({
		name: 'display_events',
		description:
			'Display a list of calendar events, todos, or shopping items as visual cards instead of plain text. Use this whenever showing results to the user.',
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
