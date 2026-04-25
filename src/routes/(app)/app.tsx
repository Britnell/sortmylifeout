import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import Calendar from '@/components/Calendar'

export const Route = createFileRoute('/(app)/app')({
	component: RouteComponent,
})

function RouteComponent() {
	const [chatInput, setChatInput] = useState('')

	return (
		<div className="max-w-5xl mx-auto p-4">
			<Calendar />

			<div className="mt-6">
				<textarea
					value={chatInput}
					onChange={(e) => setChatInput(e.target.value)}
					rows={3}
					className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
					placeholder="Chat with AI about your calendar..."
				/>
			</div>
		</div>
	)
}
