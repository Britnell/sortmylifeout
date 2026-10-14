import { useNavigate } from '@tanstack/react-router'
import Icon from '@/components/Icon'
import { calViewAtom } from '@/lib/atoms'
import { useAtomValue } from 'jotai'

const PAGES = [
  { key: 'events', label: 'Events', icon: 'calendar' },
  { key: 'todo', label: 'Todos', icon: 'todo' },
  { key: 'shopping', label: 'Shopping', icon: 'shopping' },
] as const

type PageKey = (typeof PAGES)[number]['key']

/** Reusable page heading: plain on desktop, select dropdown nav on mobile */
export default function PageNavHeading({ page }: { page: PageKey }) {
  const navigate = useNavigate()
  const lastCalView = useAtomValue(calViewAtom)

  const current = PAGES.find((p) => p.key === page)!

  const onChange = (key: string) => {
    if (key === 'events') navigate({ to: lastCalView })
    else navigate({ to: `/${key}` })
  }

  return (
    <div className="flex gap-1 items-center">
      <Icon name={current.icon} />

      {/* desktop: plain heading */}
      <h1 className="hidden sm:block m-0 text-[16px] font-semibold text-[#111111]">
        {current.label}
      </h1>

      {/* mobile: select dropdown */}
      <select
        className="sm:hidden text-[16px] font-semibold text-[#111111] bg-transparent border-none outline-none"
        value={page}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Navigate to page"
      >
        {PAGES.map((p) => (
          <option key={p.key} value={p.key}>
            {p.label}
          </option>
        ))}
      </select>
    </div>
  )
}
