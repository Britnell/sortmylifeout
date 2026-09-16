import type { ReactNode } from 'react'
import CalViewSwitcher from '@/components/CalViewSwitcher'
import SidebarToggleButton from '@/components/SidebarToggleButton'

export default function CalendarHeaderBar({
	children,
	onAdd,
}: {
	children?: ReactNode
	onAdd: () => void
}) {
	return (
		<div className="flex items-center gap-4 bg-white px-4 py-2 w-full">
			<span className="text-[16px] font-semibold text-[#111111]">Calendar</span>
			<CalViewSwitcher />
			<div className="flex items-center gap-4 mx-auto">{children}</div>
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
