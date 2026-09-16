import Icon from '@/components/Icon'
import { useAtom } from 'jotai'
import { sidebarOpenAtom } from '@/lib/atoms'

export default function SidebarToggleButton() {
	const [sidebarOpen, setSidebarOpen] = useAtom(sidebarOpenAtom)

	return (
		<button
			onClick={() => setSidebarOpen((o) => !o)}
			className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-[#DEDEDE] rounded-l-md text-[13px] text-[#666666] hover:text-[#111111]"			aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
		>
			Todos
			<Icon
				name="chevron"
				className={`text-sm text-[#666666] ${sidebarOpen ? 'rotate-180' : ''}`}			/>
		</button>
	)
}
