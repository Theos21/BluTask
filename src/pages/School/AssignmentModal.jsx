import { useState } from 'react'
import { Plus, Trash2, Check } from 'lucide-react'
import Modal from '../../components/ui/Modal'
import { useSchoolStore } from '../../stores/useSchoolStore'
import { useAuthStore } from '../../stores/useAuthStore'
import { ASSIGNMENT_TYPES, ASSIGNMENT_STATUSES, PRIORITIES } from '../../lib/constants'
import { capitalize } from '../../lib/utils'
import DateTimePicker from '../../components/date-time-picker'
import { showToast } from '../../lib/toast'

function uid() {
  return Math.random().toString(36).slice(2, 10)
}

export default function AssignmentModal({ isOpen, onClose, editAssignment = null, defaultClassId = null }) {
  const { user } = useAuthStore()
  const { classes, addAssignment, updateAssignment } = useSchoolStore()

  const init = editAssignment || {}
  const [title, setTitle] = useState(init.title || '')
  const [classId, setClassId] = useState(init.class_id || defaultClassId || (classes[0]?.id ?? ''))
  const [type, setType] = useState(init.type || 'homework')
  const [dueDate, setDueDate] = useState(init.due_date || null)
  const [priority, setPriority] = useState(init.priority || 'normal')
  const [status, setStatus] = useState(init.status || 'todo')
  const [notes, setNotes] = useState(init.notes || '')
  const [checklist, setChecklist] = useState(init.checklist || [])
  const [newCheckItem, setNewCheckItem] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function addCheckItem() {
    if (!newCheckItem.trim()) return
    setChecklist((prev) => [...prev, { id: uid(), title: newCheckItem.trim(), completed: false }])
    setNewCheckItem('')
  }

  function toggleCheckItem(id) {
    setChecklist((prev) =>
      prev.map((item) => item.id === id ? { ...item, completed: !item.completed } : item)
    )
  }

  function removeCheckItem(id) {
    setChecklist((prev) => prev.filter((item) => item.id !== id))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    setError('')
    const payload = {
      title: title.trim(),
      class_id: classId,
      type,
      due_date: dueDate || null,
      priority,
      status,
      notes: notes.trim(),
      checklist,
    }
    let err
    if (editAssignment) {
      ;({ error: err } = await updateAssignment(editAssignment.id, payload))
    } else {
      ;({ error: err } = await addAssignment({ ...payload, user_id: user.id }))
    }
    setSaving(false)
    if (err) setError(err.message)
    else {
      showToast({ message: editAssignment ? 'Assignment updated' : 'Assignment added', variant: 'success' })
      onClose()
    }
  }

  const completedCount = checklist.filter((i) => i.completed).length

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editAssignment ? 'Edit assignment' : 'New assignment'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Title</label>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Assignment title"
            required
            className="input-base"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Class</label>
            <select value={classId} onChange={(e) => setClassId(e.target.value)} className="input-base">
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Type</label>
            <select value={type} onChange={(e) => setType(e.target.value)} className="input-base">
              {ASSIGNMENT_TYPES.map((t) => (
                <option key={t} value={t}>{capitalize(t)}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Due date & time</label>
          <DateTimePicker value={dueDate} onChange={setDueDate} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Priority</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value)} className="input-base">
              {PRIORITIES.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="input-base">
              {ASSIGNMENT_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes…"
            rows={2}
            className="input-base resize-none"
          />
        </div>

        {/* Checklist */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
              Checklist
              {checklist.length > 0 && (
                <span className="ml-1.5 text-gray-400 dark:text-gray-500 font-normal">
                  {completedCount}/{checklist.length}
                </span>
              )}
            </label>
          </div>

          {checklist.length > 0 && (
            <div className="space-y-1 mb-2">
              {checklist.map((item) => (
                <div key={item.id} className="group flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleCheckItem(item.id)}
                    className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                      item.completed
                        ? 'bg-indigo-500 border-indigo-500'
                        : 'border-gray-300 dark:border-gray-600 hover:border-indigo-400'
                    }`}
                  >
                    {item.completed && <Check size={9} className="text-white" strokeWidth={3} />}
                  </button>
                  <span className={`flex-1 text-xs ${
                    item.completed ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-300'
                  }`}>
                    {item.title}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeCheckItem(item.id)}
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-rose-500 transition-all"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <input
              value={newCheckItem}
              onChange={(e) => setNewCheckItem(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCheckItem() } }}
              placeholder="Add checklist item…"
              className="input-base flex-1"
            />
            <button type="button" onClick={addCheckItem} className="btn-ghost px-2.5">
              <Plus size={14} />
            </button>
          </div>
        </div>

        {error && <p className="text-xs text-rose-500">{error}</p>}
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
            {saving ? 'Saving…' : editAssignment ? 'Save' : 'Add assignment'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
