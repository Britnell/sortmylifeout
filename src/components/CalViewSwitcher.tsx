import { Link, useRouterState } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useLocalStorage } from '@/lib/useLocalStorage'
import { CalendarDays, Columns3, AlarmClock, List } from 'lucide-react'

const views = [
  { label: 'Month', to: '/cal/month', Icon: CalendarDays },
  { label: 'Week', to: '/cal/week', Icon: Columns3 },
  { label: 'Day', to: '/cal/day', Icon: AlarmClock },
  { label: 'Schedule', to: '/cal/schedule', Icon: List },
] as const

export type CalView = (typeof views)[number]['to']

export default function CalViewSwitcher() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const active = views.find((v) => pathname.startsWith(v.to)) ?? views[0]
  const [, setLastCalView] = useLocalStorage<CalView>(
    'cal-last-view',
    '/cal/month',
  )

  useEffect(() => {
    setLastCalView(active.to)
  }, [active.to])

  return (
    <div className="ml-auto  sm:ml-0 flex bg-white border border-[#CBCCC9] rounded-lg overflow-hidden">
      {views.map((view) => {
        const isActive = view.to === active.to
        return (
          <Link
            key={view.to}
            to={view.to}
            aria-label={view.label}
            className={`flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium transition-colors ${
              isActive
                ? 'bg-[var(--primary)] text-[#111111]'
                : 'text-[#666666] hover:bg-[#F2F3F0]'
            }`}
          >
            <view.Icon size={14} strokeWidth={2} className="shrink-0" />
            {/* Mobile: only the active tab shows its label */}
            <span className={isActive ? '' : 'hidden md:inline'}>
              {view.label}
            </span>
          </Link>
        )
      })}
    </div>
  )
}
