import { useState, useRef, useEffect } from 'react'
import { useChat, fetchServerSentEvents } from '@tanstack/ai-react'
import { useQueryClient } from '@tanstack/react-query'
import { useSpeechRecognition } from '../lib/useSpeechRecognition'

type EventRow = {
  id: number
  type: 'event' | 'todo' | 'shopping'
  title?: string | null
  begin?: string | null
  end?: string | null
  completed?: number | null
  [key: string]: unknown
}

const TYPE_ICON: Record<string, string> = { event: '📅', todo: '☑', shopping: '🛒' }

function EventCard({
  item,
  action,
}: {
  item: EventRow
  action: 'created' | 'updated'
}) {
  const icon = TYPE_ICON[item.type] ?? '•'
  const dateStr = item.end && item.end !== item.begin
    ? `${item.begin} → ${item.end}`
    : item.begin ?? null

  return (
    <div className="mt-1.5 px-2.5 py-2 bg-blue-50 border border-blue-100 rounded-lg text-xs flex items-start gap-2">
      <span className="text-sm leading-none mt-0.5">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="font-medium text-gray-800 truncate">{item.title ?? '(untitled)'}</div>
        {dateStr && <div className="text-gray-500 mt-0.5">{dateStr}</div>}
      </div>
      <span className="text-gray-400 shrink-0 capitalize">{action}</span>
    </div>
  )
}

// Maps event row type → query key prefixes that hold those rows
const TYPE_TO_QUERY_PREFIXES: Record<string, string[]> = {
  event: ['searchEventsFn'],
  todo: ['todos'],
  shopping: ['shopping'],
}

function applyToolResultToCache(
  queryClient: ReturnType<typeof useQueryClient>,
  toolName: string,
  output: unknown,
) {
  if (toolName === 'create_event' || toolName === 'update_event') {
    const row = output as EventRow
    const prefixes = TYPE_TO_QUERY_PREFIXES[row.type]
    if (!prefixes) return

    for (const prefix of prefixes) {
      queryClient.setQueriesData<EventRow[]>({ queryKey: [prefix] }, (old) => {
        if (!old) return old
        if (toolName === 'create_event') {
          return [...old, row]
        }
        // update_event: replace by id
        return old.map((item) => (item.id === row.id ? row : item))
      })
    }
    return
  }

  // Fallback for unknown tool names
  queryClient.invalidateQueries()
}

export function ChatPanel() {
  const [input, setInput] = useState('')
  const [expanded, setExpanded] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { isListening, toggleListening } = useSpeechRecognition(
    () => input,
    setInput,
  )

  const queryClient = useQueryClient()
  const lastHandledToolCallId = useRef<string | null>(null)

  const { messages, sendMessage, setMessages, isLoading, stop } = useChat({
    connection: fetchServerSentEvents('/api/chat'),
  })

  if (!isLoading && messages?.length > 0) console.log(messages)

  useEffect(() => {
    const lastMessage = messages[messages.length - 1]
    if (!lastMessage || lastMessage.role !== 'assistant') return

    const lastPart = lastMessage.parts[lastMessage.parts.length - 1]
    if (!lastPart || lastPart.type !== 'tool-result') return

    const { toolCallId } = lastPart
    if (toolCallId === lastHandledToolCallId.current) return

    const toolCallPart = lastMessage.parts.find(
      (p) => p.type === 'tool-call' && p.id === toolCallId,
    )
    if (!toolCallPart || toolCallPart.type !== 'tool-call') return
    if (toolCallPart.output === undefined) return

    lastHandledToolCallId.current = toolCallId
    applyToolResultToCache(queryClient, toolCallPart.name, toolCallPart.output)
  }, [messages, queryClient])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim() && !isLoading) {
      sendMessage(input)
      setInput('')
      setExpanded(true)
    }
  }

  useEffect(() => {
    if (expanded && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, expanded])

  const hasMessages = messages.length > 0

  console.log(messages)

  return (
    <div className="fixed bottom-0 right-0 left-0 sm:left-auto sm:right-6 sm:w-96 z-50 flex flex-col shadow-2xl rounded-t-xl overflow-hidden border border-gray-200 bg-white">
      {/* Collapsed tab — only when there are messages and panel is collapsed */}
      {hasMessages && !expanded && (
        <button
          onClick={() => setExpanded(true)}
          className="flex items-center justify-between px-4 py-2.5 bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <span>Assistant</span>
          <span className="text-xs opacity-75">▴</span>
        </button>
      )}

      {/* Messages — only shown when expanded */}
      {expanded && hasMessages && (
        <>
          <div className="flex justify-between px-2 pt-2 bg-white">
            <button
              onClick={() => {
                setMessages([])
                setExpanded(false)
                lastHandledToolCallId.current = null
              }}
              className="text-gray-400 hover:text-gray-600 text-xs px-1"
              aria-label="New chat"
            >
              New chat
            </button>
            <button
              onClick={() => setExpanded(false)}
              className="text-gray-400 hover:text-gray-600 text-sm px-1"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
          <div className="overflow-y-auto max-h-80 px-4 pb-4 flex flex-col gap-3 bg-white">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`text-sm ${
                  message.role === 'assistant'
                    ? 'text-blue-700'
                    : 'text-gray-800'
                }`}
              >
                <div className="font-semibold mb-0.5 text-xs uppercase tracking-wide opacity-60">
                  {message.role === 'assistant' ? 'Assistant' : 'You'}
                </div>
                <div>
                  {message.parts.map((part, idx) => {
                    if (part.type === 'thinking') {
                      return (
                        <div
                          key={idx}
                          className="text-xs text-gray-400 italic mb-1"
                        >
                          Thinking...
                        </div>
                      )
                    }
                    if (part.type === 'text') {
                      return <div key={idx}>{part.content}</div>
                    }
                    if (part.type === 'tool-call') {
                      const isEventTool =
                        part.name === 'create_event' ||
                        part.name === 'update_event'
                      const action =
                        part.name === 'create_event' ? 'created' : 'updated'

                      if (isEventTool) {
                        if (part.output !== undefined) {
                          const items = (
                            Array.isArray(part.output)
                              ? part.output
                              : [part.output]
                          ) as EventRow[]
                          return (
                            <div key={idx}>
                              {items.map((item, i) => (
                                <EventCard key={i} item={item} action={action} />
                              ))}
                            </div>
                          )
                        }
                        return (
                          <div
                            key={idx}
                            className="text-xs text-gray-400 italic my-1"
                          >
                            {part.name === 'create_event'
                              ? 'Creating…'
                              : 'Updating…'}
                          </div>
                        )
                      }

                      return part.output === undefined ? (
                        <div
                          key={idx}
                          className="text-xs text-gray-400 italic my-1"
                        >
                          Working…
                        </div>
                      ) : null
                    }
                    return null
                  })}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </>
      )}

      {/* Input — hidden when collapsed with messages */}
      {(!hasMessages || expanded) && (
        <form
          onSubmit={handleSubmit}
          className="flex gap-2 px-3 py-2 border-t border-gray-200 bg-white"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={toggleListening}
            className={`px-2 py-1.5 text-sm rounded-lg transition-colors ${isListening ? 'bg-red-500 text-white hover:bg-red-600' : 'text-gray-400 hover:text-gray-600'}`}
            aria-label={isListening ? 'Stop listening' : 'Start voice input'}
          >
            🎤
          </button>
          {isLoading ? (
            <button
              type="button"
              onClick={stop}
              className="px-4 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Stop
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg disabled:opacity-50 hover:bg-blue-700 transition-colors"
            >
              Send
            </button>
          )}
        </form>
      )}
    </div>
  )
}
