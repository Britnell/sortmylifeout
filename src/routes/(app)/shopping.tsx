import { createFileRoute } from '@tanstack/react-router'
import CheckList from '@/components/CheckList'

export const Route = createFileRoute('/(app)/shopping')({
	component: ShoppingPage,
})

function ShoppingPage() {
	return (
		<div className="mx-auto max-w-3xl px-4 pt-6">
			<h1 className="mb-4 text-base font-semibold text-neutral-900">Shopping</h1>
			<CheckList type="shopping" />
		</div>
	)
}
