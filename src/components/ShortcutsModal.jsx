import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

const SHORTCUTS = [
  { group: 'Navigation', items: [
    { keys: ['Ctrl/⌘', 'K'], description: 'Open command palette' },
    { keys: ['Esc'], description: 'Close modal or palette' },
  ]},
  { group: 'Tasks', items: [
    { keys: ['N'], description: 'New task (when in Tasks space)' },
    { keys: ['E'], description: 'Edit selected item' },
    { keys: ['Space'], description: 'Complete selected task' },
  ]},
  { group: 'School', items: [
    { keys: ['N'], description: 'New assignment (when in School space)' },
  ]},
  { group: 'Actions', items: [
    { keys: ['Ctrl/⌘', 'Z'], description: 'Undo last action' },
    { keys: ['?'], description: 'Show keyboard shortcuts' },
  ]},
]

export default function ShortcutsModal({ isOpen, onClose }) {
  if (!isOpen) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60" />

      <div className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Keyboard shortcuts</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-5 max-h-[70vh] overflow-y-auto">
          {SHORTCUTS.map(({ group, items }) => (
            <div key={group}>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">
                {group}
              </p>
              <div className="space-y-1">
                {items.map(({ keys, description }) => (
                  <div key={description} className="flex items-center justify-between py-1.5">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{description}</span>
                    <div className="flex items-center gap-1">
                      {keys.map((k, i) => (
                        <span key={i} className="flex items-center gap-1">
                          <kbd className="text-[11px] font-mono px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded">
                            {k}
                          </kbd>
                          {i < keys.length - 1 && <span className="text-gray-300 dark:text-gray-600 text-xs">+</span>}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body
  )
}
