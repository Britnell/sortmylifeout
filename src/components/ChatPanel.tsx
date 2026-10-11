import { useState, useRef, useEffect } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
// OLD: TanStack AI chat — kept for reference
// import { useChat, fetchServerSentEvents } from '@tanstack/ai-react'
// import type { UIMessage } from '@tanstack/ai-react'
// import { useQueryClient } from '@tanstack/react-query'
import { useSpeechRecognition } from '../lib/useSpeechRecognition'
// import {
//   updateQueryCachesWithEvents,
//   EVENT_MUTATING_TOOLS,
// } from '../lib/queryCache'
// import { EventCard, type EventRow } from './EventCard'
import { EventCard, type EventRow as CardEventRow } from './EventCard'
import { Mic, X } from 'lucide-react'
import type { Message } from '../serverFn/types'
import { sendChatFn } from '../serverFn/queries.functions'
import Icon from './Icon'
import type { CalView } from './CalViewSwitcher'
import { useLocalStorage } from '../lib/useLocalStorage'

let nextId = 0
const makeId = () => `msg-${Date.now()}-${nextId++}`

export function ChatPanel() {
  const [input, setInput] = useState('')
  const [expanded, setExpanded] = useState(false)
  const [isInputFocused, setIsInputFocused] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
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

  // OLD: tool-call cache sync
  // const queryClient = useQueryClient()
  // const lastHandledToolCallId = useRef<string | null>(null)
  //
  // const { messages, sendMessage, setMessages, isLoading, stop } = useChat({
  //   connection: fetchServerSentEvents('/api/chat'),
  // })
  //
  // useEffect(() => {
  //   const lastMessage = messages[messages.length - 1]
  //   if (!lastMessage || lastMessage.role !== 'assistant') return
  //
  //   const lastPart = lastMessage.parts[lastMessage.parts.length - 1]
  //   if (!lastPart || lastPart.type !== 'tool-result') return
  //
  //   const { toolCallId } = lastPart
  //   if (toolCallId === lastHandledToolCallId.current) return
  //
  //   const toolCallPart = lastMessage.parts.find(
  //     (p) => p.type === 'tool-call' && p.id === toolCallId,
  //   )
  //   if (!toolCallPart || toolCallPart.type !== 'tool-call') return
  //   if (toolCallPart.output === undefined) return
  //
  //   lastHandledToolCallId.current = toolCallId
  //   if (EVENT_MUTATING_TOOLS.has(toolCallPart.name)) {
  //     const events = (
  //       Array.isArray(toolCallPart.output)
  //         ? toolCallPart.output
  //         : [toolCallPart.output]
  //     ) as EventRow[]
  //     updateQueryCachesWithEvents(queryClient, events)
  //   }
  // }, [messages, queryClient])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const text = input.trim()
    if (!text || isLoading) return

    const userMsg: Message = { id: makeId(), role: 'user', text }
    const history = [...messages, userMsg]
    setMessages(history)
    setInput('')
    setExpanded(true)
    setIsLoading(true)
    try {
      const { messages: newMessages } = await sendChatFn({
        data: { messages: history },
      })
      setMessages(newMessages)
    } catch (err) {
      setMessages([
        ...history,
        {
          id: makeId(),
          role: 'assistant',
          text: err instanceof Error ? err.message : 'Something went wrong',
        },
      ])
    } finally {
      setIsLoading(false)
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
  }

  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const [lastCalView] = useLocalStorage<CalView>('cal-last-view', '/cal/month')
  const isCal = pathname.startsWith('/cal')
  const isTodo = pathname === '/todo'
  const isShopping = pathname === '/shopping'

  const navLinkClass = (active: boolean) =>
    `grid place-items-center h-9 w-9 rounded-md transition-colors ${active ? 'bg-white text-[#111]' : 'text-[#666] hover:bg-white/50'}`

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 sm:bottom-4 sm:left-auto sm:right-4">
      <div
        className={`rounded-t-xl overflow-hidden border border-[#CBCCC9] bg-[var(--primary)] shadow-2xl transition-[width] duration-200 sm:rounded-xl ${isActive ? 'sm:w-[546px]' : 'sm:w-[320px]'}`}
      >
        {expanded && hasMessages && (
          <MessageList
            messages={messages}
            isLoading={isLoading}
            onNewChat={handleNewChat}
            onClose={() => setExpanded(false)}
            messagesEndRef={messagesEndRef}
          />
        )}

        <form onSubmit={handleSubmit} className="flex items-center gap-1.5 p-2">
          {/* Mobile only: nav links inline in the bar */}
          <div className="flex items-center gap-0.5 sm:hidden">
            <Link to={lastCalView} aria-label="Events" title="Events" className={navLinkClass(isCal)}>
              <Icon name="calendar" className="text-[18px]" />
            </Link>
            <Link to="/todo" aria-label="Todos" title="Todos" className={navLinkClass(isTodo)}>
              <Icon name="todo" className="text-[18px]" />
            </Link>
            <Link to="/shopping" aria-label="Shopping" title="Shopping" className={navLinkClass(isShopping)}>
              <Icon name="shopping" className="text-[18px]" />
            </Link>
          </div>

		    {/* Input fills remaining space */}
            <input
              type="search"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onFocus={handleFocus}
              onBlur={handleBlur}
              placeholder="Ask anything…"
              className={`flex-1 min-w-0 h-9 px-2.5 text-[13px] rounded-md focus:outline-none placeholder:text-[#111]/60 text-[#111] ${isActive ? 'bg-white' : 'bg-transparent'}`}
            />

		    {/* Mic */}
            <button
              type="button"
              onClick={toggleListening}
              className={`shrink-0 flex items-center justify-center w-9 h-9 rounded-md transition-colors ${isListening ? 'bg-[#111] text-white' : 'text-[#111] hover:bg-white/50'}`}
              aria-label={isListening ? 'Stop listening' : 'Voice input'}
            >
              <Mic size={18} strokeWidth={1.5} />
            </button>

            {/* Send/Stop: last in bar */}            {isActive &&
              (isLoading ? (
                <span className="shrink-0 px-3.5 py-1.5 text-xs bg-[#111] text-white rounded-full font-medium order-3 opacity-60">
                  …
                </span>
              ) : (
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="shrink-0 px-3.5 py-1.5 text-xs bg-white text-[#111] rounded-full disabled:opacity-30 hover:opacity-80 transition-opacity font-medium order-3"
                >
                  Send
                </button>
              ))}
		  </form>
      </div>
    </div>
  )
}

// OLD: tool-call part rendering — kept for reference
// type Part = UIMessage['parts'][number]
//
// function ToolCallTag() {
//   return (
//     <span className="inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[1px] text-[#111] border border-[#FF8400] rounded px-1.5 py-0.5">
//       action
//     </span>
//   )
// }
//
// function MessagePart({ part }: { part: Part }) {
//   if (part.type === 'thinking') { ... }
//   if (part.type === 'text') return <div>{part.content}</div>
//   if (part.type === 'tool-call') { ... display_events / create_event / update_event rendering ... }
//   return null
// }

function MessageList({
  messages,
  isLoading,
  onNewChat,
  onClose,
  messagesEndRef,
}: {
  messages: Message[]
  isLoading: boolean
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
                {message.role === 'assistant'
                  ? 'Assistant'
                  : message.role === 'user'
                    ? 'You'
                    : message.role === 'tool_call'
                      ? 'Tool call'
                      : 'Tool result'}
              </div>
            )}
            {message.role === 'tool_call' ? (
              <span className="inline-flex self-start items-center text-[9px] font-semibold uppercase tracking-[1px] text-[#666] border border-[#CBCCC9] rounded px-1.5 py-0.5">
                {message.tool.replaceAll('_', ' ')}
              </span>
            ) : message.role === 'tool_result' ? (
              <div className='flex flex-col gap-1'>
                {(message.result as unknown as CardEventRow[]).map((row, i) => (
                  <EventCard key={i} item={row} action={null} />
                ))}
              </div>
            ) : (
              <div className="text-[13px] text-[#111] whitespace-pre-wrap">
                {message.text}
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <span className="text-[11px] text-[#666] italic">Thinking…</span>
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  )
}
