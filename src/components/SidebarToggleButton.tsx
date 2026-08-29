import Icon from '@/components/Icon'
import { useAtom } from 'jotai'
import { sidebarOpenAtom } from '@/lib/atoms'

export default function SidebarToggleButton() {
	const [sidebarOpen, setSidebarOpen] = useAtom(sidebarOpenAtom)

	return (
		<button
			onClick={() => setSidebarOpen((o) => !o)}
			className="hidden md:flex items-center justify-center rounded hover:bg-gray-100 px-2"
			aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
		>
			Todos
			<Icon
				name="chevron"
				className={`text-lg ${sidebarOpen ? 'rotate-180' : ''}`}
			/>
		</button>
	)
}
