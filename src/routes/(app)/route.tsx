import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { authClient } from '../../lib/auth-client'

export const Route = createFileRoute('/(app)')({
  component: RouteComponent,
})

function RouteComponent() {
  const { data, isPending } = authClient.useSession()

  if (!data && !isPending) throw redirect({ to: '/login' })

  return (
    <div className=" px-4">
      <header className="py-1 flex justify-between">
        App!
        <button onClick={() => authClient.signOut()}>Logout</button>
      </header>
      {data && <Outlet />}
    </div>
  )
}
