import { useState, useRef, useEffect } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import Calendar from '@/components/Calendar'
import { useChat, fetchServerSentEvents } from '@tanstack/ai-react'

export const Route = createFileRoute('/(app)/app')({
  component: RouteComponent,
})

function RouteComponent() {
  const [input, setInput] = useState('')
  const [expanded, setExpanded] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { messages, sendMessage, isLoading } = useChat({
    connection: fetchServerSentEvents('/api/chat'),
  })

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
    <div className="h-screen p-4">
      <Calendar />

      {/* Floating chat panel */}
      <div className="fixed bottom-0 right-6 w-96 z-50 flex flex-col shadow-2xl rounded-t-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        {/* Header bar — always visible */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center justify-between px-4 py-3 bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <span>Assistant</span>
          <span className="text-xs opacity-75">{expanded ? '▾' : '▴'}</span>
        </button>

        {/* Messages — only shown when expanded */}
        {expanded && hasMessages && (
          <div className="overflow-y-auto max-h-80 p-4 flex flex-col gap-3 bg-white dark:bg-gray-900">
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
                        <div key={idx} className="text-xs text-gray-400 italic mb-1">
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
                                return JSON.stringify(JSON.parse(part.arguments), null, 2)
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
        )}

        {/* Input */}
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
            type="submit"
            disabled={!input.trim() || isLoading}
            className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg disabled:opacity-50 hover:bg-blue-700 transition-colors"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  )
}
