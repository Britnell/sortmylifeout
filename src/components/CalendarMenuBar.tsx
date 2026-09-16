import type { ReactNode } from 'react'
import CalViewSwitcher from '@/components/CalViewSwitcher'
import SidebarToggleButton from '@/components/SidebarToggleButton'

export default function CalendarMenuBar({
	children,
	onAdd,
}: {
	children?: ReactNode
	onAdd: () => void
}) {
	return (
		<div className="flex flex-row items-center gap-4 bg-white px-4 py-2 w-full">
			<span className="text-[16px] font-semibold text-[#111111]">Events</span>

			<CalViewSwitcher />
			<div className="flex flex-row items-center gap-4 ml-auto">{children}</div>
			<div className="flex items-center gap-3.5">
				<button
					className="px-4 py-2 text-[13px] font-medium bg-[var(--primary)] text-[var(--primary-foreground)] rounded-md"
					onClick={onAdd}
				>
					Add
				</button>
				<SidebarToggleButton />
			</div>
		</div>
	)
}
