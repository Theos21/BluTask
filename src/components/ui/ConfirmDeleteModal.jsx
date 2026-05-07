import { useEffect, useRef } from 'react'
import { TriangleAlert } from 'lucide-react'

export default function ConfirmDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Delete',
}) {
  const mouseDownOnOverlay = useRef(false)

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    if (isOpen) document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="modal-overlay"
      onMouseDown={(e) => { mouseDownOnOverlay.current = e.target === e.currentTarget }}
      onClick={(e) => { if (e.target === e.currentTarget && mouseDownOnOverlay.current) onClose() }}
    >
      <div className="modal-content max-w-sm">
        <div className="md:hidden flex justify-center pt-3 -mb-1">
          <div className="w-10 h-1 rounded-full bg-gray-200 dark:bg-gray-700" />
        </div>
        <div className="p-6 flex flex-col items-center text-center gap-4">
          <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-900/30 flex items-center justify-center flex-shrink-0">
            <TriangleAlert size={22} className="text-rose-500" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1.5">{title}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{description}</p>
          </div>
          <div className="flex gap-3 w-full mt-1">
            <button onClick={onClose} className="flex-1 btn-ghost justify-center">
              Cancel
            </button>
            <button
              onClick={() => { onConfirm(); onClose() }}
              className="flex-1 py-2 rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-sm font-medium transition-colors"
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
