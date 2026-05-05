import { useState, useRef, useEffect } from 'react'
import { useChat, fetchServerSentEvents } from '@tanstack/ai-react'
import type { UIMessage } from '@tanstack/ai-react'
import { useQueryClient } from '@tanstack/react-query'
import { useSpeechRecognition } from '../lib/useSpeechRecognition'
import { Link, useMatchRoute, useLocation } from '@tanstack/react-router'
import { useLocalStorage } from '../lib/useLocalStorage'
import {
  updateQueryCachesWithEvents,
  EVENT_MUTATING_TOOLS,
} from '../lib/queryCache'
import { EventCard, type EventRow } from './EventCard'
import Icon from './Icon'
import type { CalView } from './CalViewSwitcher'

export function ChatPanel() {
  const [input, setInput] = useState('')
  const [expanded, setExpanded] = useState(false)
  const [isInputFocused, setIsInputFocused] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const matchRoute = useMatchRoute()
  const location = useLocation()
  const isCal = location.pathname.startsWith('/cal')
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
  const isActive = isInputFocused || input.trim().length > 0 || hasMessages

  const handleNewChat = () => {
    setMessages([])
    setExpanded(false)
    lastHandledToolCallId.current = null
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center px-3 pb-3">
      <div
        className={`flex flex-col shadow-2xl rounded-2xl overflow-hidden border border-gray-200 bg-white transition-[width] duration-200 max-w-full ${isActive ? 'w-[540px]' : 'w-[320px]'}`}
      >
        {hasMessages && !expanded && (
          <button
            onClick={() => setExpanded(true)}
            className="flex items-center justify-between px-4 py-2 bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors"
          >
            <span>Assistant</span>
            <span className="opacity-75">▴</span>
          </button>
        )}

        {expanded && hasMessages && (
          <MessageList
            messages={messages}
            onNewChat={handleNewChat}
            onClose={() => setExpanded(false)}
            messagesEndRef={messagesEndRef}
          />
        )}

        <div className="flex items-center gap-2 px-2 py-1.5">
          <nav className="flex gap-0.5 shrink-0">
            <Link
              to={lastCalView}
              title="Calendar"
              className={`flex items-center justify-center w-9 h-9 rounded-lg transition-colors ${isCal ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}
            >
              <Icon name="calendar" />
            </Link>
            <Link
              to="/todo"
              title="Todo"
              className={`flex items-center justify-center w-9 h-9 rounded-lg transition-colors ${isTodo ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}
            >
              <Icon name="todo" />
            </Link>
            <Link
              to="/shopping"
              title="Shopping"
              className={`flex items-center justify-center w-9 h-9 rounded-lg transition-colors ${isShopping ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}
            >
              <Icon name="shopping" />
            </Link>
          </nav>

          <div className="w-px h-6 bg-gray-200 shrink-0" />

          <form
            onSubmit={handleSubmit}
            className={`flex-1 flex items-center gap-1.5 min-w-0 rounded-xl px-1 ${isActive ? 'bg-gray-50 ring-1 ring-gray-200' : ''}`}
          >
            <button
              type="button"
              onClick={toggleListening}
              className={`shrink-0 flex items-center justify-center w-8 h-8 rounded-full transition-colors ${isListening ? 'bg-red-500 text-white' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
              aria-label={isListening ? 'Stop listening' : 'Voice input'}
            >
              🎤
            </button>

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onFocus={() => setIsInputFocused(true)}
              onBlur={() => setIsInputFocused(false)}
              placeholder="Ask anything…"
              className="flex-1 min-w-0 py-1.5 text-sm bg-transparent focus:outline-none placeholder:text-gray-400 text-gray-800"
            />

            {isActive &&
              (isLoading ? (
                <button
                  type="button"
                  onClick={stop}
                  className="shrink-0 px-3 py-1.5 text-xs bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors font-medium"
                >
                  Stop
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="shrink-0 px-3 py-1.5 text-xs bg-blue-600 text-white rounded-full disabled:opacity-30 hover:bg-blue-700 transition-colors font-medium"
                >
                  Send
                </button>
              ))}
          </form>
        </div>
      </div>
    </div>
  )
}

type Part = UIMessage['parts'][number]

function MessagePart({ part }: { part: Part }) {
  if (part.type === 'thinking') {
    return <span className="text-xs text-gray-400 italic mb-1">...</span>
  }

  if (part.type === 'text') {
    return <div>{part.content}</div>
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
          <span className="text-xs text-gray-400 italic my-1">Loading…</span>
        )
      }
      return (
        <div>
          {items.map((item, i) => (
            <EventCard key={i} item={item} action={null} />
          ))}
        </div>
      )
    }

    if (part.name === 'create_event' || part.name === 'update_event') {
      const action = part.name === 'create_event' ? 'created' : 'updated'
      if (part.output !== undefined) {
        const items = (
          Array.isArray(part.output) ? part.output : [part.output]
        ) as EventRow[]
        return (
          <div>
            {items.map((item, i) => (
              <EventCard key={i} item={item} action={action} />
            ))}
          </div>
        )
      }
      return (
        <div className="text-xs text-gray-400 italic my-1">
          {part.name === 'create_event' ? 'Creating…' : 'Updating…'}
        </div>
      )
    }

    if (part.output === undefined) {
      return <span className="text-xs text-gray-400 italic my-1">Working…</span>
    }
  }

  return null
}

function MessageList({
  messages,
  onNewChat,
  onClose,
  messagesEndRef,
}: {
  messages: UIMessage[]
  onNewChat: () => void
  onClose: () => void
  messagesEndRef: React.RefObject<HTMLDivElement | null>
}) {
  return (
    <div className="border-b border-gray-100">
      <div className="flex justify-between items-center px-3 pt-2 pb-1">
        <button
          onClick={onNewChat}
          className="text-gray-400 hover:text-gray-600 text-xs"
          aria-label="New chat"
        >
          New chat
        </button>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-sm"
          aria-label="Close"
        >
          ✕
        </button>
      </div>
      <div className="overflow-y-auto max-h-72 px-3 pb-3 flex flex-col gap-3">
        {messages.map((message, idx) => (
          <div
            key={message.id}
            className={`text-sm ${message.role === 'assistant' ? 'text-blue-700' : 'text-gray-800'}`}
          >
            {messages[idx - 1]?.role !== message.role && (
              <div className="font-semibold mb-0.5 text-xs uppercase tracking-wide opacity-60">
                {message.role === 'assistant' ? 'Assistant' : 'You'}
              </div>
            )}
            <div>
              {message.parts.map((part: Part, i: number) => (
                <MessagePart key={i} part={part} />
              ))}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
    </div>
  )
}
