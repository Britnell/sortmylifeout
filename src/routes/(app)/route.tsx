import {
  createFileRoute,
  Link,
  Outlet,
  useNavigate,
} from '@tanstack/react-router'
import { useEffect } from 'react'
import { authClient } from '../../lib/auth-client'
import { ChatPanel } from '@/components/ChatPanel'
import Sidebar from '@/components/Sidebar'
import Icon from '@/components/Icon'
import { useAtom } from 'jotai'
import { sidebarOpenAtom } from '@/lib/atoms'

export const Route = createFileRoute('/(app)')({
  component: RouteComponent,
})

function RouteComponent() {
  const { data, isPending } = authClient.useSession()
  const navigate = useNavigate()
  const [sidebarOpen] = useAtom(sidebarOpenAtom)

  useEffect(() => {
    if (!isPending && !data) navigate({ to: '/login' })
  }, [isPending, data])

  if (isPending || !data) return null

  return (
    <>
      <div className="flex min-h-screen">
        {/* Main content */}
        <div className="flex-1 min-w-0 px-2 sm:px-4">
          <header className="py-1 flex justify-between items-center">
            <span className="x">App!</span>
            <Link
              to="/profile"
              aria-label="Profile"
              className="px-2 grid place-items-center"
            >
              <Icon name="hamburger" />
            </Link>
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
      </div>
      <ChatPanel />
    </>
  )
}
