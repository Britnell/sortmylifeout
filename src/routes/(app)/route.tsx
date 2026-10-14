import {
  createFileRoute,
  Link,
  Outlet,
  useNavigate,
  useRouterState,
} from '@tanstack/react-router'
import { useEffect } from 'react'
import { authClient } from '../../lib/auth-client'
import { ChatPanel } from '@/components/ChatPanel'
import Sidebar from '@/components/Sidebar'
import Icon from '@/components/Icon'
import { calViewAtom } from '@/lib/atoms'
import { useAtomValue } from 'jotai'
import { useAtom } from 'jotai'
import { sidebarOpenAtom } from '@/lib/atoms'

export const Route = createFileRoute('/(app)')({
  component: RouteComponent,
})

function RouteComponent() {
  const { data, isPending } = authClient.useSession()
  const navigate = useNavigate()
  const location = useRouterState({ select: (s) => s.location })
  const [sidebarOpen, setSidebarOpen] = useAtom(sidebarOpenAtom)
  const lastCalView = useAtomValue(calViewAtom)

  const hideSidebar =
    location.pathname.startsWith('/todo') ||
    location.pathname.startsWith('/shopping') ||
    location.pathname.startsWith('/profile')

  const isCal = location.pathname.startsWith('/cal')
  const isTodo = location.pathname === '/todo'
  const isShopping = location.pathname === '/shopping'

  useEffect(() => {
    if (!isPending && !data) navigate({ to: '/login' })
  }, [isPending, data])

  // auto-close sidebar below md (768px)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    if (mq.matches) setSidebarOpen(false)
    const onChange = (e: MediaQueryListEvent) => {
      if (e.matches) setSidebarOpen(false)
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [setSidebarOpen])

  if (isPending || !data) return null

  return (
    <>
      <div className="flex min-h-screen flex-col">
        <header className="hidden sm:flex h-11 shrink-0 items-center justify-between bg-[var(--primary)] px-4">
          <span className="text-[15px] font-semibold text-[var(--primary-foreground)]">
            🤜 Crush
          </span>

          <nav className="hidden sm:flex gap-1">
            <Link
              to={lastCalView}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium ${isCal ? 'text-[#111]' : 'text-[#666]'}`}
            >
              <span className="grid place-items-center text-[15px]">
                <Icon name="calendar" />
              </span>
              Events
            </Link>
            <Link
              to="/todo"
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium ${isTodo ? 'text-[#111]' : 'text-[#666]'}`}
            >
              <span className="grid place-items-center text-[15px]">
                <Icon name="todo" />
              </span>
              Todos
            </Link>
            <Link
              to="/shopping"
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium ${isShopping ? 'text-[#111]' : 'text-[#666]'}`}
            >
              <span className="grid place-items-center text-[15px]">
                <Icon name="shopping" />
              </span>
              Shopping
            </Link>
          </nav>

          <Link
            to={location.pathname === '/profile' ? '/todo' : '/profile'}
            aria-label={
              location.pathname === '/profile' ? 'Close profile' : 'Profile'
            }
            className="grid place-items-center px-2 text-[20px] text-[var(--primary-foreground)]"
          >
            <Icon
              name={location.pathname === '/profile' ? 'chevron' : 'hamburger'}
            />
          </Link>
        </header>

        <div className="flex flex-1">
          {/* Main content */}
          <main className="flex-1 min-w-0 mb-20">{data && <Outlet />}</main>

          {/* Right sidebar */}
          <aside
            className={`flex-shrink-0 transition-all duration-200 overflow-y-auto border-l border-gray-200 dark:border-gray-700 bg-white sticky top-11 h-[calc(100dvh-2.75rem)] ${
              hideSidebar ? 'hidden' : sidebarOpen ? 'w-72' : 'w-0'
            }`}
          >
            <Sidebar />
          </aside>
        </div>
      </div>
      <ChatPanel />
    </>
  )
}
