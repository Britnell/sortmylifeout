import { Link, useRouterState, useNavigate } from '@tanstack/react-router'

const views = [
  { label: 'Week', to: '/cal/week' },
  { label: 'Schedule', to: '/cal/schedule' },
  { label: 'Day', to: '/cal/day' },
] as const

export default function CalViewSwitcher() {
  const pathname = useRouterState({ select: s => s.location.pathname })
  const navigate = useNavigate()
  const active = views.find(v => pathname.startsWith(v.to)) ?? views[0]

  return (
    <>
      {/* Mobile: native select */}
      <select
        className="sm:hidden px-3 py-2 text-sm font-medium border border-gray-300 rounded-md bg-white text-gray-700"
        value={active.to}
        onChange={e => navigate({ to: e.target.value })}
      >
        {views.map(view => (
          <option key={view.to} value={view.to}>{view.label}</option>
        ))}
      </select>

      {/* Desktop: button group */}
      <div className="hidden sm:flex border border-gray-300 rounded-md overflow-hidden">
        {views.map((view, i) => (
          <Link
            key={view.to}
            to={view.to}
            className={`px-4 py-2 text-sm font-medium transition-colors ${i > 0 ? 'border-l border-gray-300' : ''} ${
              view.to === active.to
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            {view.label}
          </Link>
        ))}
      </div>
    </>
  )
}
