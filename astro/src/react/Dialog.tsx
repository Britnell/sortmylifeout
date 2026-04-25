import { useRef, useEffect, ReactNode } from "react";

interface DialogProps {
  children: ReactNode;
  isOpen: boolean;
  onClose: () => void;
}

export default function Dialog({ children, isOpen, onClose }: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [isOpen]);

  return (
    <dialog
      ref={dialogRef}
      className="backdrop:bg-black/50 backdrop:backdrop-blur-sm p-0 rounded-lg"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        const dialogDimensions = dialogRef.current?.getBoundingClientRect();
        if (
          dialogDimensions &&
          (e.clientX < dialogDimensions.left ||
            e.clientX > dialogDimensions.right ||
            e.clientY < dialogDimensions.top ||
            e.clientY > dialogDimensions.bottom)
        ) {
          onClose();
        }
      }}
    >
      <div className="p-6">{children}</div>
    </dialog>
  );
}
