import type { Selectable } from 'kysely'
import type { EventTable } from '../lib/db'

export type EventRow = Selectable<EventTable>

export type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  text: string
}

export type ToolMessage = {
  id: string
  role: 'tool'
  tool: 'search_events' | 'create_event' | 'update_event'
  result: EventRow[]
}

export type Message = ChatMessage | ToolMessage
export type Messages = Message[]
