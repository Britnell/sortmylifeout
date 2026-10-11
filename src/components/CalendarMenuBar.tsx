import { Plus } from 'lucide-react'
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
    <div className="flex flex-row items-center gap-2 md:gap-4 bg-white pl-2 md:pl-4 pr-2 py-2 w-full">
      <span className=" text-[16px] font-semibold text-[#111111]">Events</span>
      <CalViewSwitcher />
      <div className="ml-auto hidden sm:flex items-center gap-2 md:gap-3.5">
        <button
          className="hidden sm:inline-flex px-3 md:px-4 py-2 text-[13px] font-medium bg-[var(--primary)] text-[var(--primary-foreground)] rounded-md shrink-0"
          onClick={onAdd}
        >
          Add
        </button>
        <SidebarToggleButton />
      </div>
      {/* mobile-only floating add button */}
      <button
        aria-label="Add event"
        className="fixed bottom-15 right-2 z-40 h-9 w-9 sm:hidden flex items-center justify-center rounded bg-[var(--primary)] text-[var(--primary-foreground)] shadow-lg"
        onClick={onAdd}
      >
        <Plus size={12} strokeWidth={2} />
      </button>{' '}
    </div>
  )
}
