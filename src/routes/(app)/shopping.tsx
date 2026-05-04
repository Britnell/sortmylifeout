import { createFileRoute } from '@tanstack/react-router'
import CheckList from '#/components/CheckList'

export const Route = createFileRoute('/(app)/shopping')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div className="">
      <CheckList type="shopping" />
    </div>
  )
}
