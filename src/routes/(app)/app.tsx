import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import Calendar from '@/components/Calendar'
import { useChat, fetchServerSentEvents } from '@tanstack/ai-react'

export const Route = createFileRoute('/(app)/app')({
  component: RouteComponent,
})

function RouteComponent() {
  const [input, setInput] = useState('')

  const { messages, sendMessage, isLoading } = useChat({
    connection: fetchServerSentEvents('/api/chat'),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim() && !isLoading) {
      sendMessage(input)
      setInput('')
    }
  }

  console.log(messages)
  return (
    <div className="max-w-5xl mx-auto p-4">
      <Calendar />

      <div className="mt-6 flex flex-col gap-4">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 border rounded-lg min-h-[200px] max-h-[400px] bg-gray-50 dark:bg-gray-900">
          {messages.length === 0 && (
            <div className="text-gray-400 text-center">
              Start a conversation with the AI assistant...
            </div>
          )}
          {messages.map((message) => (
            <div
              key={message.id}
              className={`mb-4 ${
                message.role === 'assistant'
                  ? 'text-blue-600'
                  : 'text-gray-800 dark:text-gray-200'
              }`}
            >
              <div className="font-semibold mb-1">
                {message.role === 'assistant' ? 'Assistant' : 'You'}
              </div>
              <div>
                {message.parts.map((part, idx) => {
                  if (part.type === 'thinking') {
                    return (
                      <div
                        key={idx}
                        className="text-sm text-gray-500 italic mb-2"
                      >
                        💭 Thinking: {part.content}
                      </div>
                    )
                  }
                  if (part.type === 'text') {
                    return <div key={idx}>{part.content}</div>
                  }
                  if (part.type === 'tool-call') {
                    return (
                      <details key={idx} className="my-1 text-sm">
                        <summary className="cursor-pointer text-gray-500 dark:text-gray-400">
                          Tool call: <code>{part.name}</code>
                          {part.output !== undefined
                            ? ' (complete)'
                            : ' (pending)'}
                        </summary>
                        <pre className="mt-1 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-auto">
                          <div>
                            <strong>Args:</strong>{' '}
                            {JSON.stringify(
                              JSON.parse(part.arguments),
                              null,
                              2,
                            )}
                          </div>
                          {part.output !== undefined && (
                            <div className="mt-1">
                              <strong>Result:</strong>{' '}
                              {JSON.stringify(part.output, null, 2)}
                            </div>
                          )}
                        </pre>
                      </details>
                    )
                  }
                  if (part.type === 'tool-result') {
                    return null
                  }
                  return null
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="p-4 border-t rounded-lg">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 px-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
