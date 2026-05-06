import { useState } from 'react'
import Modal from '../../components/ui/Modal'
import ColorPicker from '../../components/ui/ColorPicker'
import { useTaskStore } from '../../stores/useTaskStore'
import { useAuthStore } from '../../stores/useAuthStore'
import { CLASS_COLORS } from '../../lib/constants'

export default function ListModal({ isOpen, onClose, editList = null }) {
  const { user } = useAuthStore()
  const { addList, updateList } = useTaskStore()
  const [name, setName] = useState(editList?.name || '')
  const [color, setColor] = useState(editList?.color || CLASS_COLORS[2].value)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    setError('')
    const payload = { name: name.trim(), color }
    let err
    if (editList) {
      ;({ error: err } = await updateList(editList.id, payload))
    } else {
      ;({ error: err } = await addList({ ...payload, user_id: user.id }))
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
