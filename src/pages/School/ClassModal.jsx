import { useState } from 'react'
import Modal from '../../components/ui/Modal'
import ColorPicker from '../../components/ui/ColorPicker'
import { useSchoolStore } from '../../stores/useSchoolStore'
import { useAuthStore } from '../../stores/useAuthStore'
import { CLASS_COLORS } from '../../lib/constants'

export default function ClassModal({ isOpen, onClose, editClass = null }) {
  const { user } = useAuthStore()
  const { addClass, updateClass } = useSchoolStore()
  const [name, setName] = useState(editClass?.name || '')
  const [color, setColor] = useState(editClass?.color || CLASS_COLORS[0].value)
  const [teacher, setTeacher] = useState(editClass?.teacher || '')
  const [period, setPeriod] = useState(editClass?.period || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    setError('')
    const payload = { name: name.trim(), color, teacher: teacher.trim(), period: period.trim() }
    let err
    if (editClass) {
      ;({ error: err } = await updateClass(editClass.id, payload))
    } else {
      ;({ error: err } = await addClass({ ...payload, user_id: user.id }))
    }
    setSaving(false)
    if (err) setError(err.message)
    else onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editClass ? 'Edit class' : 'New class'} size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Class name</label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. AP Physics"
            required
            className="input-base"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Color</label>
          <ColorPicker value={color} onChange={setColor} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Teacher</label>
            <input
              value={teacher}
              onChange={(e) => setTeacher(e.target.value)}
              placeholder="Optional"
              className="input-base"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Period</label>
            <input
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              placeholder="e.g. 3rd"
              className="input-base"
            />
          </div>
        </div>
        {error && <p className="text-xs text-rose-500">{error}</p>}
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
            {saving ? 'Saving…' : editClass ? 'Save' : 'Create class'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
