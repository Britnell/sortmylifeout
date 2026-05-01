import TodoList from '@/components/TodoList'
import ShoppingList from '@/components/ShoppingList'
import { useLocalStorage } from '@/lib/useLocalStorage'

export default function Sidebar() {
	const [list, setList] = useLocalStorage<'todos' | 'shopping'>('sidebar-tab', 'todos')

	return (
		<div className="w-72 p-4 relative">
			<div className="flex gap-1 mb-3">
				<button
					onClick={() => setList('todos')}
					className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md ${list === 'todos' ? 'bg-gray-200 text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
				>
					Todos
				</button>
				<button
					onClick={() => setList('shopping')}
					className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md ${list === 'shopping' ? 'bg-gray-200 text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
				>
					Shopping
				</button>
			</div>
			{list === 'todos' ? <TodoList sidebar /> : <ShoppingList sidebar />}
		</div>
	)
}
