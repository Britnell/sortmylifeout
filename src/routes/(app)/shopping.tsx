import { createFileRoute } from '@tanstack/react-router'
import ShoppingList from '@/components/ShoppingList'

export const Route = createFileRoute('/(app)/shopping')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div className="">
      <ShoppingList />
    </div>
  )
}
