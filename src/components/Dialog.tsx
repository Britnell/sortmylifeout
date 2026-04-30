import { useRef, useEffect } from 'react'
import type { ReactNode } from 'react'

interface DialogProps {
	children: ReactNode
	isOpen: boolean
	onClose: () => void
	closeOnOutsideClick?: boolean
}

export default function Dialog({ children, isOpen, onClose, closeOnOutsideClick = false }: DialogProps) {
	const dialogRef = useRef<HTMLDialogElement>(null)

	useEffect(() => {
		const dialog = dialogRef.current
		if (!dialog) return
		if (isOpen) {
			dialog.showModal()
		} else {
			dialog.close()
		}
	}, [isOpen])

	return (
		<dialog
			ref={dialogRef}
			className="backdrop:bg-transparent p-0 rounded-lg shadow-xl border border-gray-200 w-[420px]"
			style={{ marginLeft: '1.5rem', marginBottom: '1.5rem', marginTop: 'auto', marginRight: 'auto' }}
			onClick={(e) => {
				if (closeOnOutsideClick && e.target === dialogRef.current) onClose()
			}}
			onCancel={(e) => {
				e.preventDefault()
				onClose()
			}}
		>
			<div className="p-6 relative">
				<button
					className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-lg leading-none"
					onClick={onClose}
					aria-label="Close"
				>
					✕
				</button>
				{children}
			</div>
		</dialog>
	)
}
