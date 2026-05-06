import { useState, useEffect } from 'react'
import { Plus, Trash2, Check } from 'lucide-react'
import DateTimePicker from '../../components/date-time-picker'
import { showToast } from '../../lib/toast'
import Modal from '../../components/ui/Modal'
import { useTaskStore } from '../../stores/useTaskStore'
import { useAuthStore } from '../../stores/useAuthStore'
import { supabase } from '../../lib/supabase'
import { PRIORITIES, REPEAT_RULES } from '../../lib/constants'

export default function TaskModal({ isOpen, onClose, editTask = null, defaultListId = null }) {
  const { user } = useAuthStore()
  const { lists, addTask, updateTask, addChecklistItem, toggleChecklistItem, deleteChecklistItem, checklistItems, fetchChecklistItems } = useTaskStore()

  const INBOX = { id: 'inbox', name: 'Inbox', color: '#6b7280' }
  const allLists = [INBOX, ...lists]

  const init = editTask || {}
  const [title, setTitle] = useState(init.title || '')
  const [listId, setListId] = useState(init.list_id || defaultListId || 'inbox')
  const [dueDate, setDueDate] = useState(init.due_date || null)
  const [priority, setPriority] = useState(init.priority || 'normal')
  const [repeatRule, setRepeatRule] = useState(init.repeat_rule || '')
  const [notes, setNotes] = useState(init.notes || '')
  const [checkItems, setCheckItems] = useState([])
  const [newCheckItem, setNewCheckItem] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Load existing checklist when editing
  useEffect(() => {
    if (!isOpen) return
    if (editTask) {
      setTitle(editTask.title || '')
      setListId(editTask.list_id || 'inbox')
      setDueDate(editTask.due_date || null)
      setPriority(editTask.priority || 'normal')
      setRepeatRule(editTask.repeat_rule || '')
      setNotes(editTask.notes || '')
      fetchChecklistItems(editTask.id).then(() => {
        const items = checklistItems[editTask.id] || []
        setCheckItems(items.map((i) => ({ id: i.id, title: i.title, completed: i.completed, persisted: true })))
      })
    } else {
      setTitle('')
      setListId(defaultListId || 'inbox')
      setDueDate('')
      setPriority('normal')
      setRepeatRule('')
      setNotes('')
      setCheckItems([])
    }
    setNewCheckItem('')
    setError('')
  }, [isOpen, editTask?.id])

  function addLocalItem() {
    if (!newCheckItem.trim()) return
    setCheckItems((prev) => [...prev, { id: null, title: newCheckItem.trim(), completed: false, persisted: false }])
    setNewCheckItem('')
  }

  async function removeItem(index) {
    const item = checkItems[index]
    if (item.persisted && item.id && editTask) {
      await deleteChecklistItem(editTask.id, item.id)
    }
    setCheckItems((prev) => prev.filter((_, i) => i !== index))
  }

  async function toggleItem(index) {
    const item = checkItems[index]
    if (item.persisted && item.id && editTask) {
      await toggleChecklistItem(editTask.id, item.id, !item.completed)
    }
    setCheckItems((prev) =>
      prev.map((it, i) => (i === index ? { ...it, completed: !it.completed } : it))
    )
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    setError('')

    const payload = {
      title: title.trim(),
      list_id: listId === 'inbox' ? null : listId,
      due_date: dueDate || null,
      priority,
      repeat_rule: repeatRule || null,
      notes: notes.trim(),
      completed: editTask?.completed ?? false,
    }

    if (editTask) {
      const { error: err } = await updateTask(editTask.id, payload)
      if (err) { setError(err.message); setSaving(false); return }

      // Save any new (un-persisted) checklist items
      const newItems = checkItems.filter((i) => !i.persisted)
      for (let i = 0; i < newItems.length; i++) {
        await addChecklistItem({
          task_id: editTask.id,
          title: newItems[i].title,
          completed: false,
          position: (checklistItems[editTask.id]?.length || 0) + i,
        })
      }
    } else {
      const { data, error: err } = await addTask({ ...payload, user_id: user.id })
      if (err) { setError(err.message); setSaving(false); return }

      // Save checklist items for new task
      if (data && checkItems.length > 0) {
        for (let i = 0; i < checkItems.length; i++) {
          await addChecklistItem({
            task_id: data.id,
            title: checkItems[i].title,
            completed: false,
            position: i,
          })
        }
      }
    }

    setSaving(false)
    showToast({ message: editTask ? 'Task updated' : 'Task added', variant: 'success' })
    onClose()
  }

  const completedCount = checkItems.filter((i) => i.completed).length

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editTask ? 'Edit task' : 'New task'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Title</label>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Task title"
            required
            className="input-base"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">List</label>
            <select value={listId} onChange={(e) => setListId(e.target.value)} className="input-base">
              {allLists.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Priority</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value)} className="input-base">
              {PRIORITIES.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Due date & time</label>
            <DateTimePicker value={dueDate} onChange={setDueDate} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Repeat</label>
            <select value={repeatRule} onChange={(e) => setRepeatRule(e.target.value)} className="input-base">
              {REPEAT_RULES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
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
              {checkItems.length > 0 && (
                <span className="ml-1.5 text-gray-400 dark:text-gray-500 font-normal">
                  {completedCount}/{checkItems.length}
                </span>
              )}
            </label>
          </div>

          {checkItems.length > 0 && (
            <div className="space-y-1 mb-2">
              {checkItems.map((item, i) => (
                <div key={i} className="group flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleItem(i)}
                    className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                      item.completed
                        ? 'bg-teal-500 border-teal-500'
                        : 'border-gray-300 dark:border-gray-600 hover:border-teal-400'
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
                    onClick={() => removeItem(i)}
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
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addLocalItem() } }}
              placeholder="Add checklist item…"
              className="input-base flex-1"
            />
            <button type="button" onClick={addLocalItem} className="btn-ghost px-2.5">
              <Plus size={14} />
            </button>
          </div>
        </div>

        {error && <p className="text-xs text-rose-500">{error}</p>}
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
            {saving ? 'Saving…' : editTask ? 'Save' : 'Add task'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
