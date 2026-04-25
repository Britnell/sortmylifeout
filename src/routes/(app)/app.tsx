import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { getMonthFn } from '@/serverFn/queries.functions'

export const Route = createFileRoute('/(app)/app')({
  component: RouteComponent,
})

function RouteComponent() {
  const x = useQuery({
    queryKey: ['getMonth'],
    queryFn: () => getMonthFn(),
  })
  return <div>Hello "/app/"!</div>
}
