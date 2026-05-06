import { useState } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
import Modal from '../../components/ui/Modal'
import { useAuthStore } from '../../stores/useAuthStore'

export default function DeleteAccountModal({ isOpen, onClose }) {
  const { deleteAccount } = useAuthStore()
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  async function handleDelete() {
    if (confirmText !== 'DELETE') return
    setDeleting(true)
    setError('')
    const { error } = await deleteAccount()
    if (error) {
      setError(error.message)
      setDeleting(false)
    }
    // On success, signOut inside deleteAccount redirects to /auth via auth state change
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Delete account" size="sm">
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-900/20">
          <AlertTriangle size={16} className="text-rose-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-rose-700 dark:text-rose-300 leading-relaxed">
            This will permanently delete your account and all data — classes, assignments, tasks, lists, and routine blocks. <strong>This cannot be undone.</strong>
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
            Type <span className="font-mono font-bold text-rose-500">DELETE</span> to confirm
          </label>
          <input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="DELETE"
            autoFocus
            className="input-base font-mono"
          />
        </div>

        {error && (
          <p className="text-xs text-rose-500 bg-rose-50 dark:bg-rose-900/20 px-3 py-2 rounded-lg">{error}</p>
        )}

        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="btn-ghost flex-1 justify-center">Cancel</button>
          <button
            onClick={handleDelete}
            disabled={confirmText !== 'DELETE' || deleting}
            className="flex-1 justify-center inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-rose-500 hover:bg-rose-600 text-white transition-colors disabled:opacity-40"
          >
            {deleting && <Loader2 size={13} className="animate-spin" />}
            {deleting ? 'Deleting…' : 'Delete my account'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
