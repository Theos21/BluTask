import { useState, useEffect } from 'react'
import Modal from '../../components/ui/Modal'
import ColorPicker from '../../components/ui/ColorPicker'
import { useTaskStore } from '../../stores/useTaskStore'
import { useFolderStore } from '../../stores/useFolderStore'
import { useAuthStore } from '../../stores/useAuthStore'
import { CLASS_COLORS } from '../../lib/constants'

export default function ListModal({ isOpen, onClose, editList = null, defaultFolderId = null }) {
  const { user } = useAuthStore()
  const { lists, addList, updateList } = useTaskStore()
  const { folders } = useFolderStore()
  const [name, setName] = useState('')
  const [color, setColor] = useState(CLASS_COLORS[2].value)
  const [folderId, setFolderId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      setName(editList?.name || '')
      setColor(editList?.color || CLASS_COLORS[2].value)
      setFolderId(editList?.folder_id ?? defaultFolderId ?? folders[0]?.id ?? null)
      setError('')
    }
  }, [isOpen, editList, defaultFolderId])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    setError('')
    const payload = { name: name.trim(), color, folder_id: folderId || null }
    let err
    if (editList) {
      ;({ error: err } = await updateList(editList.id, payload))
    } else {
      const siblingCount = lists.filter((l) => l.folder_id === folderId).length
      ;({ error: err } = await addList({ ...payload, user_id: user.id, position: siblingCount }))
    }
    setSaving(false)
    if (err) setError(err.message)
    else onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editList ? 'Edit list' : 'New list'} size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">List name</label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Errands"
            required
            className="input-base"
          />
        </div>

        {folders.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Folder</label>
            <select value={folderId || ''} onChange={(e) => setFolderId(e.target.value || null)} className="input-base">
              <option value="">No folder</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Color</label>
          <ColorPicker value={color} onChange={setColor} />
        </div>

        {error && <p className="text-xs text-rose-500">{error}</p>}
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
            {saving ? 'Saving…' : editList ? 'Save' : 'Create list'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
