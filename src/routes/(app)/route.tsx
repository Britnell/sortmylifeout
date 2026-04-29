import {
  createFileRoute,
  Link,
  Outlet,
  useNavigate,
} from '@tanstack/react-router'
import { useEffect } from 'react'
import { authClient } from '../../lib/auth-client'
import { ChatPanel } from '@/components/ChatPanel'

export const Route = createFileRoute('/(app)')({
  component: RouteComponent,
})

function RouteComponent() {
  const { data, isPending } = authClient.useSession()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isPending && !data) navigate({ to: '/login' })
  }, [isPending, data])

  if (isPending || !data) return null

  return (
    <>
      <div className=" px-4">
        <header className="py-1 flex justify-between">
          <span className="x">App!</span>
          <nav>
            <ul className="flex gap-4">
              <li>
                <Link to="/app">App</Link>
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
      <ChatPanel />
    </>
  )
}
