import { createFileRoute } from '@tanstack/react-router'
import TodoList from '@/components/TodoList'

export const Route = createFileRoute('/(app)/todo')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div className="">
      <TodoList />
    </div>
  )
}
