import {
  createFileRoute,
  Link,
  Outlet,
  useNavigate,
} from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { authClient } from '../../lib/auth-client'
import { ChatPanel } from '@/components/ChatPanel'
import Sidebar from '@/components/Sidebar'

export const Route = createFileRoute('/(app)')({
  component: RouteComponent,
})

function RouteComponent() {
  const { data, isPending } = authClient.useSession()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    if (!isPending && !data) navigate({ to: '/login' })
  }, [isPending, data])

  if (isPending || !data) return null

  return (
    <>
      <div className="flex min-h-screen">
        {/* Main content */}
        <div className="flex-1 min-w-0 px-4">
          <header className="py-1 flex justify-between">
            <span className="x">App!</span>
            <nav>
              <ul className="flex gap-4">
                <li>
                  <Link to="/app/week">Calendar</Link>
                </li>
                <li>
                  <Link to="/todo">Todo</Link>
                </li>
                <li>
                  <Link to="/shopping">Shopping</Link>
                </li>
              </ul>
            </nav>
            <button onClick={() => authClient.signOut()}>Logout</button>
          </header>
          {data && <Outlet />}
        </div>

        {/* Right sidebar */}
        <aside
          className={`flex-shrink-0 transition-all duration-200 overflow-hidden border-l border-gray-200 dark:border-gray-700 bg-white -900 ${
            sidebarOpen ? 'w-72' : 'w-0'
          }`}
        >
          <Sidebar />
        </aside>

        {/* Toggle button — fixed to right edge of viewport */}
        <button
          onClick={() => setSidebarOpen((o) => !o)}
          className={`flex fixed top-16 items-center justify-center w-6 h-12 rounded-l-md bg-white border border-r-0 border-gray-200 shadow-sm hover:bg-gray-50 -800 dark:border-gray-700 dark:hover:bg-gray-700 transition-all duration-200 z-20 ${
            sidebarOpen ? 'right-72' : 'right-0'
          }`}
          aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
        >
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {sidebarOpen ? '›' : '‹'}
          </span>
        </button>
      </div>
      <ChatPanel />
    </>
  )
}
