import { useState, useEffect } from 'react'
import { Plus, Trash2, Check, Tag, X, Eye, EyeOff, Bell } from 'lucide-react'
import DateTimePicker from '../../components/date-time-picker'
import { showToast } from '../../lib/toast'
import Modal from '../../components/ui/Modal'
import { useTaskStore } from '../../stores/useTaskStore'
import { useTagStore } from '../../stores/useTagStore'
import { useAuthStore } from '../../stores/useAuthStore'
import { PRIORITIES, REPEAT_RULES } from '../../lib/constants'
import { renderMarkdown } from '../../lib/markdown'

const TAG_COLORS = ['#6b7280', '#6366f1', '#f43f5e', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899']

export default function TaskModal({
  isOpen,
  onClose,
  editTask = null,
  defaultListId = null,
  defaultHeaderId = null,
}) {
  const { user } = useAuthStore()
  const { lists, addTask, updateTask, addChecklistItem, toggleChecklistItem, deleteChecklistItem, checklistItems, fetchChecklistItems } = useTaskStore()
  const { tags, taskTags, addTag, addTagToTask, removeTagFromTask, deleteTag } = useTagStore()

  const INBOX = { id: 'inbox', name: 'Inbox', color: '#6b7280' }
  const allLists = [INBOX, ...lists]

  const [title, setTitle] = useState('')
  const [listId, setListId] = useState('inbox')
  const [dueDate, setDueDate] = useState(null)
  const [priority, setPriority] = useState('normal')
  const [repeatRule, setRepeatRule] = useState('')
  const [notes, setNotes] = useState('')
  const [notesPreview, setNotesPreview] = useState(false)
  const [reminderAt, setReminderAt] = useState(null)
  const [checkItems, setCheckItems] = useState([])
  const [newCheckItem, setNewCheckItem] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Tags
  const [selectedTagIds, setSelectedTagIds] = useState([])
  const [showNewTag, setShowNewTag] = useState(false)
  const [managingTags, setManagingTags] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[1])

  useEffect(() => {
    if (!isOpen) return
    if (editTask) {
      setTitle(editTask.title || '')
      setListId(editTask.list_id || 'inbox')
      setDueDate(editTask.due_date || null)
      setPriority(editTask.priority || 'normal')
      setRepeatRule(editTask.repeat_rule || '')
      setNotes(editTask.notes || '')
      setReminderAt(null)
      setSelectedTagIds(taskTags[editTask.id] ? [...taskTags[editTask.id]] : [])
      fetchChecklistItems(editTask.id).then(() => {
        const items = checklistItems[editTask.id] || []
        setCheckItems(items.map((i) => ({ id: i.id, title: i.title, completed: i.completed, persisted: true })))
      })
    } else {
      setTitle('')
      setListId(defaultListId || 'inbox')
      setDueDate(null)
      setPriority('normal')
      setRepeatRule('')
      setNotes('')
      setReminderAt(null)
      setCheckItems([])
      setSelectedTagIds([])
    }
    setNewCheckItem('')
    setShowNewTag(false)
    setManagingTags(false)
    setNewTagName('')
    setNotesPreview(false)
    setError('')
  }, [isOpen, editTask?.id])

  function toggleTag(tagId) {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    )
  }

  async function handleCreateTag() {
    if (!newTagName.trim()) return
    const { data, error: err } = await addTag({ user_id: user.id, name: newTagName.trim(), color: newTagColor })
    if (!err && data) {
      setSelectedTagIds((prev) => [...prev, data.id])
      setNewTagName('')
      setShowNewTag(false)
    }
  }

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

  async function syncTags(taskId) {
    const existing = taskTags[taskId] || []
    const toAdd = selectedTagIds.filter((id) => !existing.includes(id))
    const toRemove = existing.filter((id) => !selectedTagIds.includes(id))
    await Promise.all([
      ...toAdd.map((tagId) => addTagToTask(taskId, tagId, user.id)),
      ...toRemove.map((tagId) => removeTagFromTask(taskId, tagId)),
    ])
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    setError('')

    const payload = {
      title: title.trim(),
      list_id: listId === 'inbox' ? null : listId,
      header_id: editTask?.header_id ?? defaultHeaderId ?? null,
      due_date: dueDate || null,
      priority,
      repeat_rule: repeatRule || null,
      notes: notes.trim(),
      completed: editTask?.completed ?? false,
    }

    if (editTask) {
      const { error: err } = await updateTask(editTask.id, payload)
      if (err) { setError(err.message); setSaving(false); return }
      await syncTags(editTask.id)
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
      if (data) {
        await syncTags(data.id)
        for (let i = 0; i < checkItems.length; i++) {
          await addChecklistItem({ task_id: data.id, title: checkItems[i].title, completed: false, position: i })
        }
      }
    }

    setSaving(false)
    showToast({ message: editTask ? 'Task updated' : 'Task added', variant: 'success' })
    onClose()
  }

  const completedCount = checkItems.filter((i) => i.completed).length
  const allChecksDone = checkItems.length > 0 && completedCount === checkItems.length && !(editTask?.completed)

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
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Notes</label>
            {notes && (
              <button
                type="button"
                onClick={() => setNotesPreview(v => !v)}
                className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                {notesPreview ? <EyeOff size={11} /> : <Eye size={11} />}
                {notesPreview ? 'Edit' : 'Preview'}
              </button>
            )}
          </div>
          {notesPreview ? (
            <div
              className="min-h-[56px] text-xs text-gray-700 dark:text-gray-300 px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(notes) }}
            />
          ) : (
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes… (*italic*, **bold**, `code`, - list)"
              rows={2}
              className="input-base resize-none"
            />
          )}
        </div>

        {/* Reminder */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
            <Bell size={11} />
            Reminder
          </label>
          <DateTimePicker value={reminderAt} onChange={setReminderAt} />
          {reminderAt && (
            <button
              type="button"
              onClick={() => setReminderAt(null)}
              className="mt-1 text-[11px] text-gray-400 hover:text-rose-500 transition-colors"
            >
              Clear reminder
            </button>
          )}
        </div>

        {/* Tags */}
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 flex items-center gap-1.5">
            <Tag size={11} />
            Tags
          </label>

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {tags.map((tag) => {
                const selected = selectedTagIds.includes(tag.id)
                return (
                  <div
                    key={tag.id}
                    className={`inline-flex items-center rounded-full border text-[11px] font-medium transition-all ${
                      selected
                        ? 'border-transparent'
                        : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400'
                    }`}
                    style={selected ? { backgroundColor: tag.color + '25', color: tag.color, borderColor: tag.color + '60' } : {}}
                  >
                    <button
                      type="button"
                      onClick={() => toggleTag(tag.id)}
                      className="pl-2.5 pr-2 py-1 flex items-center gap-1"
                    >
                      {selected && <span>✓</span>}
                      {tag.name}
                    </button>
                    <button
                      type="button"
                      title="Delete tag"
                      onClick={() => {
                        deleteTag(tag.id)
                        setSelectedTagIds((prev) => prev.filter((id) => id !== tag.id))
                      }}
                      className="pr-2 py-1 text-gray-400 dark:text-gray-500 hover:text-rose-500 dark:hover:text-rose-400 transition-colors flex items-center"
                    >
                      <X size={11} />
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          {showNewTag ? (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
              <input
                autoFocus
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreateTag() } if (e.key === 'Escape') setShowNewTag(false) }}
                placeholder="Tag name…"
                className="flex-1 text-xs bg-transparent outline-none text-gray-800 dark:text-gray-200 placeholder:text-gray-400"
              />
              <div className="flex gap-1">
                {TAG_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewTagColor(c)}
                    className={`w-4 h-4 rounded-full transition-all ${newTagColor === c ? 'ring-2 ring-offset-1 ring-gray-400 dark:ring-offset-gray-800 scale-110' : 'hover:scale-105'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <button type="button" onClick={handleCreateTag} className="text-xs font-medium text-teal-600 dark:text-teal-400 hover:text-teal-700">Add</button>
              <button type="button" onClick={() => setShowNewTag(false)} className="text-gray-400 hover:text-gray-600">
                <X size={12} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowNewTag(true)}
              className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <Plus size={12} />
              New tag
            </button>
          )}
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
                      item.completed ? 'bg-teal-500 border-teal-500' : 'border-gray-300 dark:border-gray-600 hover:border-teal-400'
                    }`}
                  >
                    {item.completed && <Check size={9} className="text-white" strokeWidth={3} />}
                  </button>
                  <span className={`flex-1 text-xs ${item.completed ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>
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

        {/* All-done prompt */}
        {allChecksDone && (
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-teal-50 dark:bg-teal-900/20 border border-teal-100 dark:border-teal-800">
            <Check size={14} className="text-teal-500 flex-shrink-0" />
            <p className="flex-1 text-xs text-teal-700 dark:text-teal-300">All checklist items done! Mark task complete?</p>
            <button
              type="button"
              onClick={async () => {
                if (editTask) {
                  const { updateTask } = useTaskStore.getState()
                  await updateTask(editTask.id, { completed: true })
                  showToast({ message: 'Task completed', variant: 'success' })
                  onClose()
                }
              }}
              className="text-xs font-medium text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 transition-colors flex-shrink-0"
            >
              Complete
            </button>
          </div>
        )}

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
