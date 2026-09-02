import { useSyncExternalStore } from 'react'
import { CheckCircle2, Info, XCircle, X } from 'lucide-react'

type ToastVariant = 'default' | 'success' | 'error' | 'info'

interface ToastOptions {
	variant?: ToastVariant
	/** ms before auto-dismiss, 0 = sticky. default 3500 */
	duration?: number
}

interface ToastItem {
	id: number
	message: string
	variant: ToastVariant
}

let nextId = 1
let toasts: ToastItem[] = []
const EMPTY: ToastItem[] = []
const listeners = new Set<() => void>()

function emit() {
	for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
	listeners.add(listener)
	return () => {
		listeners.delete(listener)
	}
}

export function dismissToast(id: number) {
	if (!toasts.some((t) => t.id === id)) return
	toasts = toasts.filter((t) => t.id !== id)
	emit()
}

function show(message: string, { variant = 'default', duration = 3500 }: ToastOptions = {}) {
	const id = nextId++
	toasts = [...toasts, { id, message, variant }].slice(-5) // cap at 5, drop oldest
	emit()
	if (duration > 0) setTimeout(() => dismissToast(id), duration)
	return id
}

export const toast = Object.assign(show, {
	success: (message: string, options?: ToastOptions) => show(message, { ...options, variant: 'success' }),
	error: (message: string, options?: ToastOptions) => show(message, { ...options, variant: 'error' }),
	info: (message: string, options?: ToastOptions) => show(message, { ...options, variant: 'info' }),
	dismiss: dismissToast,
})

function useToasts() {
	return useSyncExternalStore(
		subscribe,
		() => toasts,
		() => EMPTY,
	)
}

const VARIANT_ICON: Record<ToastVariant, typeof Info | null> = {
	default: null,
	success: CheckCircle2,
	error: XCircle,
	info: Info,
}

const VARIANT_ICON_CLASS: Record<ToastVariant, string> = {
	default: '',
	success: 'text-emerald-500',
	error: 'text-red-500',
	info: 'text-sky-500',
}

/** Mount once in the root layout, then call toast() / toast.success() from anywhere */
export function Toaster() {
	const toasts = useToasts()

	return (
		<div
			aria-live="polite"
			className="pointer-events-none fixed bottom-4 left-4 right-4 flex flex-col items-center gap-2 sm:left-auto sm:items-end"
		>
			{toasts.map((t) => {
				const Icon = VARIANT_ICON[t.variant]
				return (
					<div
						key={t.id}
						role="status"
						onClick={() => dismissToast(t.id)}
						className="animate-toast-in pointer-events-auto flex w-fit max-w-full cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 shadow-lg dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
					>
						{Icon && <Icon size={16} className={`shrink-0 ${VARIANT_ICON_CLASS[t.variant]}`} />}
						<span>{t.message}</span>
						<X size={14} className="shrink-0 text-gray-400" />
					</div>
				)
			})}
		</div>
	)
}
