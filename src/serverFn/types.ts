import type { Selectable } from 'kysely'
import type { EventTable } from '../lib/db'

export type EventRow = Selectable<EventTable>

export type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  text: string
}

export type Args = Record<string, string | number | boolean | undefined>

export type ToolCallMessage = {
  id: string
  role: 'tool_call'
  tool: 'search_events' | 'create_event' | 'update_event'
  args: Args
}

export type ToolResultMessage = {
  id: string
  role: 'tool_result'
  toolCallId: string
  result: EventRow[]
}

export type Message = ChatMessage | ToolCallMessage | ToolResultMessage

export type Messages = Message[]
