import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { getSessionFn } from '../../serverFn/queries.functions'

export const Route = createFileRoute('/(app)')({
  beforeLoad: async () => {
    const userId = await getSessionFn()
    if (!userId) {
      throw redirect({ to: '/login' })
    }
    console.log({ userId })
    return { userId }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const x = Route.useLoaderData()
  console.log(x)
  return (
    <div>
      <header>App!</header>
      <Outlet />
    </div>
  )
}
