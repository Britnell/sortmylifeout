import { useState, useRef, useEffect } from 'react'
import { useChat, fetchServerSentEvents } from '@tanstack/ai-react'
import { useQueryClient } from '@tanstack/react-query'

export function ChatPanel() {
  const [input, setInput] = useState('')
  const [expanded, setExpanded] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)

  const toggleListening = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) return

    if (isListening) {
      recognitionRef.current?.stop()
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'

    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript
      setInput((prev) => (prev ? prev + ' ' + transcript : transcript))
    }
    recognition.onend = () => setIsListening(false)
    recognition.onerror = (e: any) => {
      console.error('SpeechRecognition error:', e.error, e)
      setIsListening(false)
    }

    recognitionRef.current = recognition
    recognition.start()
    setIsListening(true)
  }

  const queryClient = useQueryClient()
  const lastRefetchedToolCallId = useRef<string | null>(null)

  const { messages, sendMessage, setMessages, isLoading } = useChat({
    connection: fetchServerSentEvents('/api/chat'),
  })

  useEffect(() => {
    const lastMessage = messages[messages.length - 1]
    if (!lastMessage || lastMessage.role !== 'assistant') return

    const lastPart = lastMessage.parts[lastMessage.parts.length - 1]
    if (!lastPart || lastPart.type !== 'tool-result') return

    const { toolCallId } = lastPart
    if (toolCallId === lastRefetchedToolCallId.current) return

    const isCreateOrUpdate = lastMessage.parts.some(
      (p) =>
        p.type === 'tool-call' &&
        p.id === toolCallId &&
        (p.name === 'create_event' || p.name === 'update_event'),
    )
    if (!isCreateOrUpdate) return

    lastRefetchedToolCallId.current = toolCallId
    queryClient.invalidateQueries({ queryKey: ['getCalendar'] })
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

  return (
    <div className="fixed bottom-0 right-6 w-96 z-50 flex flex-col shadow-2xl rounded-t-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
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
          <div className="flex justify-between px-2 pt-2 bg-white dark:bg-gray-900">
            <button
              onClick={() => {
                setMessages([])
                setExpanded(false)
                lastRefetchedToolCallId.current = null
              }}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs px-1"
              aria-label="New chat"
            >
              New chat
            </button>
            <button
              onClick={() => setExpanded(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-sm px-1"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
          <div className="overflow-y-auto max-h-80 px-4 pb-4 flex flex-col gap-3 bg-white dark:bg-gray-900">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`text-sm ${
                  message.role === 'assistant'
                    ? 'text-blue-700 dark:text-blue-400'
                    : 'text-gray-800 dark:text-gray-200'
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
                      return (
                        <details key={idx} className="my-1 text-xs">
                          <summary className="cursor-pointer text-gray-400">
                            Tool: <code>{part.name}</code>
                            {part.output !== undefined ? ' ✓' : ' …'}
                          </summary>
                          <pre className="mt-1 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-auto">
                            {(() => {
                              try {
                                return JSON.stringify(
                                  JSON.parse(part.arguments),
                                  null,
                                  2,
                                )
                              } catch {
                                return part.arguments
                              }
                            })()}
                          </pre>
                        </details>
                      )
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
          className="flex gap-2 px-3 py-2 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-3 py-1.5 text-sm border rounded-lg dark:bg-gray-800 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={toggleListening}
            className={`px-2 py-1.5 text-sm rounded-lg transition-colors ${isListening ? 'bg-red-500 text-white hover:bg-red-600' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}
            aria-label={isListening ? 'Stop listening' : 'Start voice input'}
          >
            🎤
          </button>
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg disabled:opacity-50 hover:bg-blue-700 transition-colors"
          >
            Send
          </button>
        </form>
      )}
    </div>
  )
}
