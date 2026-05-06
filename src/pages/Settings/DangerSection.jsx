import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import DeleteAccountModal from './DeleteAccountModal'

export default function DangerSection() {
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-base font-semibold text-rose-600 dark:text-rose-400 mb-1">Danger Zone</h2>
        <p className="text-xs text-gray-400 dark:text-gray-500">Irreversible actions. Proceed with care.</p>
      </div>

      <div className="border-2 border-rose-200 dark:border-rose-900/50 rounded-2xl p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Delete account</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 max-w-sm">
              Permanently delete your account and all associated data. Classes, assignments, tasks, lists, and routine blocks will be gone forever.
            </p>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="flex-shrink-0 inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40 border border-rose-200 dark:border-rose-800 transition-colors"
          >
            <Trash2 size={14} />
            Delete account
          </button>
        </div>
      </div>

      <DeleteAccountModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  )
}
