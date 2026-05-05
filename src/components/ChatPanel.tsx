import { useState, useRef, useEffect } from 'react'
import { useChat, fetchServerSentEvents } from '@tanstack/ai-react'
import { useQueryClient } from '@tanstack/react-query'
import { useSpeechRecognition } from '../lib/useSpeechRecognition'
import { Link, useMatchRoute } from '@tanstack/react-router'
import { useLocalStorage } from '../lib/useLocalStorage'
import Icon from './Icon'
import type { CalView } from './CalViewSwitcher'

export function ChatPanel() {
  const [input, setInput] = useState('')
  const [expanded, setExpanded] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const matchRoute = useMatchRoute()
  const isCal = matchRoute({ to: '/cal/$all' })
  const isTodo = matchRoute({ to: '/todo' })
  const isShopping = matchRoute({ to: '/shopping' })
  const [lastCalView] = useLocalStorage<CalView>('cal-last-view', '/cal/week')

  const { isListening, toggleListening } = useSpeechRecognition(
    () => input,
    setInput,
  )

  const queryClient = useQueryClient()
  const lastHandledToolCallId = useRef<string | null>(null)

  const { messages, sendMessage, setMessages, isLoading, stop } = useChat({
    connection: fetchServerSentEvents('/api/chat'),
  })

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
    if (EVENT_MUTATING_TOOLS.has(toolCallPart.name)) {
      const events = (
        Array.isArray(toolCallPart.output)
          ? toolCallPart.output
          : [toolCallPart.output]
      ) as EventRow[]

      updateQueryCachesWithEvents(queryClient, events)
    }
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
    <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center px-2 py-2">
      <div className="flex flex-wrap gap-2 shadow-2xl rounded-xl overflow-hidden border border-gray-200 bg-white max-w-full">
        {/* Collapsed tab — only when there are messages and panel is collapsed */}
        {hasMessages && !expanded && (
          <button
            onClick={() => setExpanded(true)}
            className="w-full flex items-center justify-between px-4 py-2.5 bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <span>Assistant</span>
            <span className="text-xs opacity-75">▴</span>
          </button>
        )}

        {/* Messages — only shown when expanded */}
        {expanded && hasMessages && (
          <div className="w-full border-b border-gray-200">
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
              {messages.map((message, idx) => (
                <div
                  key={message.id}
                  className={`text-sm ${
                    message.role === 'assistant'
                      ? 'text-blue-700'
                      : 'text-gray-800'
                  }`}
                >
                  {messages[idx - 1]?.role !== message.role && (
                    <div className="font-semibold mb-0.5 text-xs uppercase tracking-wide opacity-60">
                      {message.role === 'assistant' ? 'Assistant' : 'You'}
                    </div>
                  )}
                  <div>
                    {message.parts.map((part, idx) => {
                      if (part.type === 'thinking') {
                        return (
                          <span
                            key={idx}
                            className="text-xs text-gray-400 italic mb-1"
                          >
                            ...
                          </span>
                        )
                      }
                      if (part.type === 'text') {
                        return <div key={idx}>{part.content}</div>
                      }
                      if (part.type === 'tool-call') {
                        if (part.name === 'display_events') {
                          let items: EventRow[] | undefined
                          try {
                            const args =
                              typeof part.arguments === 'string'
                                ? JSON.parse(part.arguments)
                                : part.arguments
                            items = (args as { items?: EventRow[] })?.items
                          } catch {
                            /* ignore */
                          }
                          if (!items?.length) {
                            return (
                              <span
                                key={idx}
                                className="text-xs text-gray-400 italic my-1"
                              >
                                Loading…
                              </span>
                            )
                          }
                          return (
                            <div key={idx}>
                              {items.map((item, i) => (
                                <EventCard key={i} item={item} action={null} />
                              ))}
                            </div>
                          )
                        }

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
                                  <EventCard
                                    key={i}
                                    item={item}
                                    action={action}
                                  />
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
                          <span
                            key={idx}
                            className="text-xs text-gray-400 italic my-1"
                          >
                            Working…
                          </span>
                        ) : null
                      }
                      return null
                    })}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>
        )}

        {/* Input and navigation — flex wrap for responsive layout */}
        <div className="flex flex-wrap gap-4 py-2 w-full border-t border-gray-200">
          {/* Navigation buttons */}
          <nav className="flex-[0_0_auto] flex gap-1 px-2 items-center">
            <ul className="flex gap-1">
              <li>
                <Link
                  to={lastCalView}
                  className={`flex items-center gap-1 rounded px-2 py-1 transition-colors ${isCal ? 'bg-blue-400 text-white' : 'hover:bg-gray-100'}`}
                >
                  <Icon name="calendar" />
                  <span className="text-sm">Calendar</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/todo"
                  className={`flex items-center gap-1 rounded px-2 py-1 transition-colors ${isTodo ? 'bg-blue-400 text-white' : 'hover:bg-gray-100'}`}
                >
                  <Icon name="todo" />
                  <span className="text-sm">Todo</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/shopping"
                  className={`flex items-center gap-1 rounded px-2 py-1 transition-colors ${isShopping ? 'bg-blue-400 text-white' : 'hover:bg-gray-100'}`}
                >
                  <Icon name="shopping" />
                  <span className="text-sm">Shopping</span>
                </Link>
              </li>
            </ul>
          </nav>

          {/* Input — hidden when collapsed with messages */}
          {(!hasMessages || expanded) && (
            <form
              onSubmit={handleSubmit}
              className="flex-[1_0_auto] flex gap-2 px-3 flex-1 min-w-64"
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
                aria-label={
                  isListening ? 'Stop listening' : 'Start voice input'
                }
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
                  className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg disabled:opacity-50 hover:bg-blue-700 whitespace-nowrap"
                >
                  Send
                </button>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

type EventRow = {
  id: number
  type: 'event' | 'todo' | 'shopping'
  title?: string | null
  begin?: string | null
  end?: string | null
  completed?: number | null
  [key: string]: unknown
}

const TYPE_ICON: Record<string, string> = {
  event: '📅',
  todo: '☑',
  shopping: '🛒',
}

function EventCard({
  item,
  action,
}: {
  item: EventRow
  action: 'created' | 'updated' | null
}) {
  const icon = TYPE_ICON[item.type] ?? '•'
  const dateStr =
    item.end && item.end !== item.begin
      ? `${item.begin} → ${item.end}`
      : (item.begin ?? null)

  return (
    <div className="mt-1.5 px-2.5 py-2 bg-blue-50 border border-blue-100 rounded-lg text-xs flex items-start gap-2">
      <span className="text-sm leading-none mt-0.5">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="font-medium text-gray-800 truncate">
          {item.title ?? '(untitled)'}
        </div>
        {dateStr && <div className="text-gray-500 mt-0.5">{dateStr}</div>}
      </div>
      {action && (
        <span className="text-gray-400 shrink-0 capitalize">{action}</span>
      )}
    </div>
  )
}

const EVENT_MUTATING_TOOLS = new Set(['create_event', 'update_event'])

function updateQueryCachesWithEvents(
  queryClient: ReturnType<typeof useQueryClient>,
  events: EventRow[],
) {
  const eventMap = new Map(events.map((e) => [e.id, e]))

  queryClient
    .getQueriesData({ queryKey: ['searchEventsFn'] })
    .forEach(([queryKey, data]) => {
      if (Array.isArray(data)) {
        const eventIds = new Set((data as EventRow[]).map((e) => e.id))
        let updated = (data as EventRow[]).map((e) => eventMap.get(e.id) || e)

        events.forEach((e) => {
          if (!eventIds.has(e.id)) {
            updated.push(e)
          }
        })

        updated = updated.sort((a, b) =>
          (a.begin ?? '').localeCompare(b.begin ?? ''),
        )
        queryClient.setQueryData(queryKey, updated)
      }
    })

  queryClient
    .getQueriesData({
      predicate: (query) => {
        const key = query.queryKey
        return (
          Array.isArray(key) &&
          (key[1] === 'unscheduled' ||
            key[1] === 'overdue' ||
            key[1] === 'done')
        )
      },
    })
    .forEach(([queryKey, data]) => {
      if (Array.isArray(data)) {
        const eventIds = new Set((data as EventRow[]).map((e) => e.id))
        let updated = (data as EventRow[]).map((e) => eventMap.get(e.id) || e)

        events.forEach((e) => {
          if (!eventIds.has(e.id) && e.type === queryKey[0]) {
            updated.push(e)
          }
        })

        queryClient.setQueryData(queryKey, updated)
      }
    })
}
