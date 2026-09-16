import { useState, useRef, useEffect } from 'react'
import { useChat, fetchServerSentEvents } from '@tanstack/ai-react'
import type { UIMessage } from '@tanstack/ai-react'
import { useQueryClient } from '@tanstack/react-query'
import { useSpeechRecognition } from '../lib/useSpeechRecognition'
import {
  updateQueryCachesWithEvents,
  EVENT_MUTATING_TOOLS,
} from '../lib/queryCache'
import { EventCard, type EventRow } from './EventCard'
import { Mic, X } from 'lucide-react'

export function ChatPanel() {
  const [input, setInput] = useState('')
  const [expanded, setExpanded] = useState(false)
  const [isInputFocused, setIsInputFocused] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleFocus = () => {
    if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current)
    setIsInputFocused(true)
  }

  const handleBlur = () => {
    blurTimeoutRef.current = setTimeout(() => setIsInputFocused(false), 600)
  }

  useEffect(
    () => () => {
      if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current)
    },
    [],
  )

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
    <div className="fixed bottom-3 right-3 z-50 pr-2 sm:bottom-4 sm:right-4">
      <div
        className={`rounded-xl overflow-hidden border border-[#CBCCC9] bg-[var(--primary)] shadow-2xl transition-[width] duration-200 max-w-[calc(100vw-1.5rem)] ${isActive ? 'w-[546px]' : 'w-[320px]'}`}
      >
        {expanded && hasMessages && (
          <MessageList
            messages={messages}
            onNewChat={handleNewChat}
            onClose={() => setExpanded(false)}
            messagesEndRef={messagesEndRef}
          />
        )}

        <form onSubmit={handleSubmit} className="flex flex-col bg-[var(--primary)]">
          {/* Mobile only: input gets its own top row */}
          <div className="flex min-[500px]:hidden items-center px-2 pt-2 pb-0">
            <input
              type="search"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onFocus={handleFocus}
              onBlur={handleBlur}
              placeholder="Ask anything…"
              className="flex-1 min-w-0 py-1.5 px-2.5 text-[13px] bg-white rounded-md focus:outline-none placeholder:text-[#111]/60 text-[#111]"
            />
          </div>

          {/* Bar: mic + (desktop: input) + send */}
          <div className="flex items-center gap-1.5 p-2">
            {/* Mic */}
            <button
              type="button"
              onClick={toggleListening}
              className={`shrink-0 flex items-center justify-center w-9 h-9 rounded-md transition-colors order-2 min-[500px]:order-1 ${isListening ? 'bg-[#111] text-white' : 'text-[#111] hover:bg-white/50'}`}
              aria-label={isListening ? 'Stop listening' : 'Voice input'}
            >
              <Mic size={18} strokeWidth={1.5} />
            </button>

            {/* Desktop only: input fills remaining space */}
            <input
              type="search"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onFocus={handleFocus}
              onBlur={handleBlur}
              placeholder="Ask anything…"
              className={`hidden min-[500px]:block flex-1 min-w-0 h-9 px-2.5 text-[13px] rounded-md focus:outline-none placeholder:text-[#111]/60 text-[#111] min-[500px]:order-2 ${isActive ? 'bg-white' : 'bg-transparent'}`}
            />

            {/* Send/Stop: last in bar */}
            {isActive &&
              (isLoading ? (
                <button
                  type="button"
                  onClick={stop}
                  className="shrink-0 px-3.5 py-1.5 text-xs bg-[#111] text-white rounded-full hover:opacity-80 transition-opacity font-medium order-3"
                >
                  Stop
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="shrink-0 px-3.5 py-1.5 text-xs bg-white text-[#111] rounded-full disabled:opacity-30 hover:opacity-80 transition-opacity font-medium order-3"
                >
                  Send
                </button>
              ))}
          </div>
        </form>
      </div>
    </div>
  )
}

type Part = UIMessage['parts'][number]

function ToolCallTag() {
  return (
    <span className="inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[1px] text-[#111] border border-[#FF8400] rounded px-1.5 py-0.5">
      action
    </span>
  )
}

function MessagePart({ part }: { part: Part }) {
  if (part.type === 'thinking') {
    return (
      <details className="text-[11px] italic text-[#666]">
        <summary className="cursor-pointer select-none italic">
          thinking…
        </summary>
        <div className="mt-1 whitespace-pre-wrap pl-1 border-l-2 border-[#CBCCC9]">
          {part.content}
        </div>
      </details>
    )
  }

  if (part.type === 'text') {
    return <div>{part.content}</div>
  }

  if (part.type === 'tool-call') {
    const tag = <ToolCallTag />

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
          <span className="text-[11px] text-[#666] italic my-1">Loading…</span>
        )
      }
      return (
        <div className="flex flex-col gap-1">
          {tag}
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
          <div className="flex flex-col gap-1">
            {tag}
            {items.map((item, i) => (
              <EventCard key={i} item={item} action={action} />
            ))}
          </div>
        )
      }
      return (
        <span className="text-[11px] text-[#666] italic my-1">
          {tag}
          {part.name === 'create_event' ? 'Creating…' : 'Updating…'}
        </span>
      )
    }

    if (part.output === undefined) {
      return (
        <span className="text-[11px] text-[#666] italic my-1">
          {tag} Working…
        </span>
      )
    }

    return (
      <div className="flex flex-col gap-1">
        {tag}
      </div>
    )
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
    <div className="bg-white">
      <div className="flex justify-between items-center px-3 pt-2 pb-1">
        <button
          onClick={onNewChat}
          className="text-xs text-[#666] hover:text-[#111]"
          aria-label="New chat"
        >
          New chat
        </button>
        <button
          onClick={onClose}
          className="text-[#666] hover:text-[#111]"
          aria-label="Close"
        >
          <X size={14} />
        </button>
      </div>
      <div className="h-px bg-[#CBCCC9]" />
      <div className="overflow-y-auto max-h-72 p-3 flex flex-col gap-3">
        {messages.map((message, idx) => (
          <div key={message.id} className="flex flex-col gap-1">
            {messages[idx - 1]?.role !== message.role && (
              <div className="text-[10px] font-semibold uppercase tracking-[1px] text-[#666]">
                {message.role === 'assistant' ? 'Assistant' : 'You'}
              </div>
            )}
            <div className="text-[13px] text-[#111]">
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
