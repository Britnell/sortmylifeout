import { createFileRoute } from '@tanstack/react-router'
import TodoBoard from '#/components/TodoBoard'

export const Route = createFileRoute('/(app)/todo')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div className="">
      <TodoBoard />
    </div>
  )
}
