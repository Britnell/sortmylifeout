import { useState, useRef, useEffect } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
// TanStack AI chat (old agent — re-enabled, JEV agent below commented out)
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
// JEV agent (inactive):
// import { EventCard, type EventRow as CardEventRow } from './EventCard'
// import type { Message } from '../serverFn/types'
// import { sendChatFn } from '../serverFn/queries.functions'
import Icon from './Icon'
import { calViewAtom } from '@/lib/atoms'
import { useAtomValue } from 'jotai'

// JEV agent (inactive):
// let nextId = 0
// const makeId = () => `msg-${Date.now()}-${nextId++}`

export function ChatPanel() {
  const [input, setInput] = useState('')
  const [expanded, setExpanded] = useState(false)
  const [isInputFocused, setIsInputFocused] = useState(false)
  const [mobileChatOpen, setMobileChatOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  // JEV agent (inactive):
  // const [messages, setMessages] = useState<Message[]>([])
  // const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleFocus = () => {
    if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current)
    setIsInputFocused(true)
  }

  const handleBlur = () => {
    blurTimeoutRef.current = setTimeout(() => {
      setIsInputFocused(false)
      // Auto-close the mobile chat row if the user clicked in but did nothing
      const { mobileChatOpen, isListening, input, messages } = stateRef.current
      const focusInside =
        formRef.current?.contains(document.activeElement) ?? false
      if (
        mobileChatOpen &&
        !isListening &&
        !input.trim() &&
        messages.length === 0 &&
        !focusInside
      ) {
        setMobileChatOpen(false)
      }
    }, 600)
  }

  useEffect(
    () => () => {
      if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current)
    },
    [],
  )

  useEffect(() => {
    if (mobileChatOpen)
      setTimeout(() => inputRef.current?.focus(), 320)
  }, [mobileChatOpen])

  const { isListening, toggleListening, stopListening } = useSpeechRecognition(
    () => input,
    setInput,
  )

  // TanStack AI chat (re-enabled)
  const queryClient = useQueryClient()
  const lastHandledToolCallId = useRef<string | null>(null)

  const { messages, sendMessage, setMessages, isLoading /* , stop */ } =
    useChat({
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

  // TanStack AI chat (re-enabled):
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim() && !isLoading) {
      sendMessage(input)
      setInput('')
      setExpanded(true)
    }
  }

  // JEV agent (inactive):
  // const handleSubmit = async (e: React.FormEvent) => {
  //   e.preventDefault()
  //   const text = input.trim()
  //   if (!text || isLoading) return

  //   const userMsg: Message = { id: makeId(), role: 'user', text }
  //   const history = [...messages, userMsg]
  //   setMessages(history)
  //   setInput('')
  //   setExpanded(true)
  //   setIsLoading(true)
  //   try {
  //     const { messages: newMessages } = await sendChatFn({
  //       data: { messages: history },
  //     })
  //     setMessages(newMessages)
  //   } catch (err) {
  //     setMessages([
  //       ...history,
  //       {
  //         id: makeId(),
  //         role: 'assistant',
  //         text: err instanceof Error ? err.message : 'Something went wrong',
  //       },
  //     ])
  //   } finally {
  //     setIsLoading(false)
  //   }
  // }

  useEffect(() => {
    if (expanded && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, expanded])

  const hasMessages = messages.length > 0
  // Latest values for the blur timeout (avoids stale closure)
  const stateRef = useRef({ mobileChatOpen, isListening, input, messages })
  stateRef.current = { mobileChatOpen, isListening, input, messages }
  const isActive = isInputFocused || input.trim().length > 0 || hasMessages
  // Mobile: chat row stays hidden until opened by the user, or when a chat is live
  const showChatRow = mobileChatOpen || isListening || (expanded && hasMessages)

  const handleNewChat = () => {
    setMessages([])
    setExpanded(false)
    lastHandledToolCallId.current = null
  }

  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const lastCalView = useAtomValue(calViewAtom)
  const isCal = pathname.startsWith('/cal')
  const isTodo = pathname === '/todo'
  const isShopping = pathname === '/shopping'

  const navLinkClass = (active: boolean) =>
    `grid place-items-center h-9 w-9 rounded-md transition-colors ${active ? 'bg-white/60 text-[#111] hover:bg-white' : 'text-[#666] hover:bg-white/50'}`

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 sm:bottom-4 sm:left-auto sm:right-4">
      <div
        className={`rounded-t-xl overflow-hidden border border-[#CBCCC9] bg-[var(--primary)] shadow-2xl transition-[width] duration-200 sm:rounded-xl ${isActive ? 'sm:w-[546px]' : 'sm:w-[320px]'}`}
      >
        {expanded && hasMessages && (
          <MessageList
            messages={messages}
            onNewChat={handleNewChat}
            onClose={() => handleNewChat()}
            messagesEndRef={messagesEndRef}
          />
        )}

        {/* Chat input row: above the nav bar on mobile, only row on desktop.
            Slides in on mobile via a max-height transition. */}
        <div
          className={`overflow-hidden transition-[max-height] duration-300 ease-out ${showChatRow ? 'max-h-24 animate-[chat-row-in_300ms_ease-out]' : 'max-h-0'} sm:max-h-24 sm:animate-none`}
        >
        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="flex items-center gap-1.5 p-2"
        >
          {/* Close: mobile only */}
          <button
            type="button"
            onClick={() => {
              stopListening()
              setMobileChatOpen(false)
              setExpanded(false)
            }}
            className="sm:hidden shrink-0 flex items-center justify-center w-9 h-9 rounded-md text-[#666] hover:bg-white/50 hover:text-[#111]"
            aria-label="Close chat"
          >
            <X size={16} />
          </button>
          {/* Input fills remaining space */}
          <input
            ref={inputRef}
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
          {/* Send/Stop: last in bar */}{' '}
          {isActive &&
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

        {/* Mobile bottom bar: nav links always; "Ask anything" fake input + mic
            hidden once the chat row is open */}
        <div className="flex items-center gap-0.5 p-2 sm:hidden">
          <Link
            to={lastCalView}
            aria-label="Events"
            title="Events"
            className={navLinkClass(isCal)}
          >
            <Icon name="calendar" className="text-[18px]" />
          </Link>
          <Link
            to="/todo"
            aria-label="Todos"
            title="Todos"
            className={navLinkClass(isTodo)}
          >
            <Icon name="todo" className="text-[18px]" />
          </Link>
          <Link
            to="/shopping"
            aria-label="Shopping"
            title="Shopping"
            className={navLinkClass(isShopping)}
          >
            <Icon name="shopping" className="text-[18px]" />
          </Link>
          {!showChatRow && (
            <>
              <button
                type="button"
                onClick={() => setMobileChatOpen(true)}
                className="flex-1 ml-6 min-w-0 h-9 px-2.5 text-left text-[13px] rounded-md placeholder:text-[#111]/60 text-[#111]/60"
              >
                Ask anything…
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileChatOpen(true)
                  toggleListening()
                }}
                className={`shrink-0 flex items-center justify-center w-9 h-9 rounded-md transition-colors ${isListening ? 'bg-[#111] text-white' : 'text-[#111] hover:bg-white/50'}`}
                aria-label={isListening ? 'Stop listening' : 'Voice input'}
              >
                <Mic size={18} strokeWidth={1.5} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// TanStack AI chat rendering (re-enabled) — old MessagePart was abbreviated in the
// JEV version's comment; full body restored from commit 444a422
type Part = UIMessage['parts'][number]

function ToolCallTag({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[1px] text-[#666] border border-[#CBCCC9] bg-[#EDEEEC] rounded px-1.5 py-0.5">
      {label}
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
          {items.map((item, i) => (
            <EventCard key={i} item={item} action={null} />
          ))}
        </div>
      )
    }

    if (part.name === 'create_event' || part.name === 'update_event') {
      const label = part.name === 'create_event' ? 'create' : 'update'
      const tag = <ToolCallTag label={label} />
      if (part.output !== undefined) {
        const items = (
          Array.isArray(part.output) ? part.output : [part.output]
        ) as EventRow[]
        return (
          <div className="flex flex-col gap-1">
            {tag}
            {items.map((item, i) => (
              <EventCard
                key={i}
                item={item}
                action={
                  part.name === 'create_event' ? 'created' : 'updated'
                }
              />
            ))}
          </div>
        )
      }
      return (
        <span className="text-[11px] text-[#666] italic my-1">
          {tag}{' '}
          {part.name === 'create_event' ? 'Creating…' : 'Updating…'}
        </span>
      )
    }

    if (part.name === 'search_events') {
      return <ToolCallTag label="searching" />
    }

    if (part.output === undefined) {
      return (
        <span className="text-[11px] text-[#666] italic my-1">
          <ToolCallTag label="action" /> Working…
        </span>
      )
    }

    return <ToolCallTag label="action" />
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
              {/* Only show thinking while nothing substantive has arrived yet */}
              {message.parts
                .filter(
                  (part: Part) =>
                    part.type !== 'thinking' ||
                    !message.parts.some(
                      (p) => p.type === 'text' || p.type === 'tool-call',
                    ),
                )
                .map((part: Part, i: number) => (
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

/* JEV agent rendering (inactive) — to switch back, comment out the TanStack
   MessagePart/MessageList above and uncomment this:

function JevMessageList({
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
                {(message.result as unknown as EventRow[]).map((row, i) => (
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

*/
