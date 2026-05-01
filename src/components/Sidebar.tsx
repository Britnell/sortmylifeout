import TodoList from '@/components/TodoList'

export default function Sidebar() {
  return (
    <div className="w-72 p-4 relative">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
        Todos
      </h2>
      <TodoList />
    </div>
  )
}
