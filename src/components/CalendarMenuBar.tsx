import type { ReactNode } from 'react'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import CalViewSwitcher, { type CalView } from '@/components/CalViewSwitcher'
import SidebarToggleButton from '@/components/SidebarToggleButton'

const viewOrder: CalView[] = ['/cal/month', '/cal/week', '/cal/day', '/cal/schedule']

export default function CalendarMenuBar({
	children,
	onAdd,
}: {
	children?: ReactNode
	onAdd: () => void
}) {
	const navigate = useNavigate()
	const pathname = useRouterState({ select: (s) => s.location.pathname })
	const activeIdx = Math.max(
		0,
		viewOrder.findIndex((v) => pathname.startsWith(v)),
	)
	const prevView = viewOrder[(activeIdx - 1 + viewOrder.length) % viewOrder.length]
	const nextView = viewOrder[(activeIdx + 1) % viewOrder.length]

	return (
		<div className="flex flex-row items-center gap-2 md:gap-4 bg-white pl-2 md:pl-4 pr-2 py-2 w-full">
			<span className=" text-[16px] font-semibold text-[#111111]">Events</span>

			<button
				className="ml-auto flex items-center rounded-md p-1 text-[#666666] hover:bg-[#F0F0EE] hover:text-[#111111] md:hidden"
				aria-label="Previous view"
				onClick={() => navigate({ to: prevView })}
			>
				<ChevronLeft size={18} />
			</button>
			<CalViewSwitcher />
			<button
				className="flex items-center rounded-md p-1 text-[#666666] hover:bg-[#F0F0EE] hover:text-[#111111] md:hidden"
				aria-label="Next view"
				onClick={() => navigate({ to: nextView })}
			>
				<ChevronRight size={18} />
      </button>

			<div className="ml-auto flex items-center gap-2 md:gap-3.5">
				<button
					className="px-3 md:px-4 py-2 text-[13px] font-medium bg-[var(--primary)] text-[var(--primary-foreground)] rounded-md shrink-0"
					onClick={onAdd}
				>
					Add
				</button>
				<SidebarToggleButton />
			</div>
		</div>
	)
}
