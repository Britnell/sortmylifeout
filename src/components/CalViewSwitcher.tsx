import { Link, useRouterState, useNavigate } from '@tanstack/react-router'
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
  const navigate = useNavigate()
  const active = views.find((v) => pathname.startsWith(v.to)) ?? views[0]
  const [, setLastCalView] = useLocalStorage<CalView>(
    'cal-last-view',
    '/cal/month',
  )

  useEffect(() => {
    setLastCalView(active.to)
  }, [active.to])

  return (
    <>
      {/* Mobile: native select */}
      <select
        className="md:hidden px-3 py-2 text-sm font-medium border border-gray-300 rounded-md bg-white text-gray-700"
        value={active.to}
        onChange={(e) => navigate({ to: e.target.value })}
      >
        {views.map((view) => (
          <option key={view.to} value={view.to}>
            {view.label}
          </option>
        ))}
      </select>

      {/* Desktop: segmented control */}
      <div className="hidden md:flex bg-white border border-[#CBCCC9] rounded-lg overflow-hidden">
        {views.map((view) => (
          <Link
            key={view.to}
            to={view.to}
            className={`flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium transition-colors ${
              view.to === active.to
                ? 'bg-[var(--primary)] text-[#111111]'
                : 'text-[#666666] hover:bg-[#F2F3F0]'
            }`}
          >
            <view.Icon size={14} strokeWidth={2} className="shrink-0" />
            {view.label}
          </Link>
        ))}
      </div>
    </>
  )
}
