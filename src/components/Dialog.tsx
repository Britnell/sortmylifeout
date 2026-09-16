import { useRef, useEffect, useState } from 'react'
import type { ReactNode } from 'react'

interface DialogProps {
	children: ReactNode
	isOpen: boolean
	onClose: () => void
	closeOnOutsideClick?: boolean
}

export default function Dialog({ children, isOpen, onClose, closeOnOutsideClick = false }: DialogProps) {
	const dialogRef = useRef<HTMLDialogElement>(null)
	const [shown, setShown] = useState(false)

	useEffect(() => {
		const dialog = dialogRef.current
		if (!dialog) return
		if (isOpen) {
			dialog.showModal()
			requestAnimationFrame(() => {
				requestAnimationFrame(() => setShown(true))
			})
		} else {
			dialog.close()
			setShown(false)
		}
	}, [isOpen])

	return (
		<dialog
			ref={dialogRef}
			className={`backdrop:bg-black/15 p-0 rounded-xl shadow-[0_8px_24px_#11111126] border border-black/10 w-[448px] max-w-[calc(100vw-2rem)] text-[13px] duration-200 ease-out transition ${shown ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}
			style={{ marginLeft: '1.5rem', marginBottom: '1.5rem', marginTop: 'auto', marginRight: 'auto' }}
			onClick={(e) => {
				if (closeOnOutsideClick && e.target === dialogRef.current) onClose()
			}}
			onCancel={(e) => {
				e.preventDefault()
				onClose()
			}}
		>
			{children}
		</dialog>
	)
}
