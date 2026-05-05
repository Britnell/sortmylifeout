import { toolDefinition } from '@tanstack/ai'

export function createDisplayEventsTool() {
	return toolDefinition({
		name: 'display_events',
		description:
			'Display a list of calendar events, todos, or shopping items to the user as rich visual cards. Use this whenever you want to show items from a search instead of listing them as plain text. Pass only the fields you have — id, type, title, and optionally begin/end/completed.',
		inputSchema: {
			type: 'object' as const,
			properties: {
				items: {
					type: 'array',
					description: 'Items to display',
					items: {
						type: 'object',
						properties: {
							id: { type: 'number', description: 'Item id' },
							type: {
								type: 'string',
								enum: ['event', 'todo', 'shopping'],
								description: 'Item type',
							},
							title: { type: 'string', description: 'Item title' },
							begin: {
								type: 'string',
								description: 'Start date or datetime (YYYY-MM-DD or ISO)',
							},
							end: {
								type: 'string',
								description: 'End date or datetime (YYYY-MM-DD or ISO)',
							},
							completed: {
								type: 'number',
								description: '1 if completed, 0 if not (todos/shopping only)',
							},
						},
						required: ['id', 'type', 'title'],
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
