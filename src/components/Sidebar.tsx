import { ChevronLeft, ChevronRight } from 'lucide-react'
import CheckList from '#/components/CheckList'
import { useLocalStorage } from '@/lib/useLocalStorage'

const COLS = [
	{ key: 'todo', title: 'To Do' },
	{ key: 'scheduled', title: 'Scheduled' },
	{ key: 'overdue', title: 'Overdue' },
	{ key: 'shopping', title: 'Shopping' },
	{ key: 'finished', title: 'Finished' },
] as const

type ColKey = (typeof COLS)[number]['key']

export default function Sidebar() {
	const [col, setCol] = useLocalStorage<ColKey>('sidebar-col', 'todo')
	const colIdx = COLS.findIndex((c) => c.key === col)
	const stepCol = (dir: 1 | -1) =>
		setCol(COLS[(colIdx + dir + COLS.length) % COLS.length].key)

	return (
		<div className="w-72 p-4 relative">
			<h2 className="text-base font-semibold text-neutral-900 mb-3">Todos</h2>
			<div className="flex items-center gap-1 mb-4">
				<button
					className="flex items-center rounded-md p-1 text-[#666666] hover:bg-[#F0F0EE] hover:text-black"
					aria-label="Previous column"
					onClick={() => stepCol(-1)}
				>
					<ChevronLeft size={18} />
				</button>
				<select
					className="flex-1 min-w-0 px-3 py-2 text-[13px] font-medium border border-neutral-300 rounded-md bg-white text-neutral-700"
					value={col}
					onChange={(e) => setCol(e.target.value as ColKey)}
				>
					{COLS.map((c) => (
						<option key={c.key} value={c.key}>
							{c.title}
						</option>
					))}
				</select>
				<button
					className="flex items-center rounded-md p-1 text-[#666666] hover:bg-[#F0F0EE] hover:text-black"
					aria-label="Next column"
					onClick={() => stepCol(1)}
				>
					<ChevronRight size={18} />
				</button>
			</div>
			{col === 'shopping' ? (
				<CheckList type="shopping" sidebar />
			) : (
				<CheckList
					type="todo"
					sidebar
					tab={
						col === 'scheduled'
							? 'upcoming'
							: col === 'overdue'
								? 'overdue'
								: col === 'finished'
									? 'done'
									: 'unscheduled'
					}
				/>
			)}
		</div>
	)
}
