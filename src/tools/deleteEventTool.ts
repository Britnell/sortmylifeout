import { toolDefinition } from '@tanstack/ai'

/**
 * Front-end-only delete tool (like display_events): the server does nothing.
 * The item passed in is rendered in the chat as a confirmation box
 * ("Remove this item?" with Remove/Cancel buttons); only when the user
 * confirms does the client call deleteEventFn. The agent can never delete
 * anything by itself.
 */
export function createDeleteEventTool() {
  return toolDefinition({
    name: 'delete_event',
    description:
      "Ask the user to remove an event, todo or shopping item. Pass the full item (with its id) exactly as returned by search_events. This does NOT delete anything — it shows the item to the user with a Remove/Cancel confirmation in the chat; the item is only removed if the user confirms. Use when the user asks to delete/remove/cancel an item. First call search_events to get the item (and its id), then call this tool with that item.",
    inputSchema: {
      type: 'object' as const,
      properties: {
        item: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            title: { type: 'string' },
            type: { type: 'string' },
            begin: { type: 'string' },
            end: { type: 'string' },
            completed: { type: 'string' },
          },
          required: ['id', 'title'],
        },
      },
      required: ['item'],
    },
    outputSchema: {
      type: 'object' as const,
      properties: { ok: { type: 'boolean' } },
      required: ['ok'],
    },
  }).server(async () => ({ ok: true as const }))
}
