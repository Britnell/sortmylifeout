import { createFileRoute } from '@tanstack/react-router'
import Calendar from '@/components/Calendar'

export const Route = createFileRoute('/(app)/app/week')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div className="h-screen p-4">
      <Calendar />
    </div>
  )
}
