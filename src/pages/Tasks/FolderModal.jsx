import { useState, useEffect } from 'react'
import Modal from '../../components/ui/Modal'
import { useFolderStore } from '../../stores/useFolderStore'
import { useAuthStore } from '../../stores/useAuthStore'
import { useTaskStore } from '../../stores/useTaskStore'

const FOLDER_COLORS = [
  '#6b7280', '#6366f1', '#f43f5e', '#f59e0b',
  '#10b981', '#3b82f6', '#8b5cf6', '#ec4899',
]

export default function FolderModal({ isOpen, onClose, editFolder = null }) {
  const { user } = useAuthStore()
  const { addFolder, updateFolder, folders } = useFolderStore()
  const { lists } = useTaskStore()
  const [name, setName] = useState('')
  const [color, setColor] = useState(FOLDER_COLORS[0])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      setName(editFolder?.name || '')
      setColor(editFolder?.color || FOLDER_COLORS[0])
      setError('')
    }
  }, [isOpen, editFolder])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    setError('')
    let err
    if (editFolder) {
      ;({ error: err } = await updateFolder(editFolder.id, { name: name.trim(), color }))
    } else {
      const position = folders.length
      ;({ error: err } = await addFolder({ user_id: user.id, name: name.trim(), color, position }))
    }
    setSaving(false)
    if (err) setError(err.message)
    else onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editFolder ? 'Edit folder' : 'New folder'} size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Folder name</label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Personal"
            required
            className="input-base"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Color</label>
          <div className="flex gap-2 flex-wrap">
            {FOLDER_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`w-7 h-7 rounded-full transition-all ${
                  color === c
                    ? 'ring-2 ring-offset-2 ring-gray-400 dark:ring-offset-[#131b24] scale-110'
                    : 'hover:scale-105'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
        {error && <p className="text-xs text-rose-500">{error}</p>}
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
            {saving ? 'Saving…' : editFolder ? 'Save' : 'Create folder'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
