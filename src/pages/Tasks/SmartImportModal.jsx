import { useState } from 'react'
import { Sparkles, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'
import Modal from '../../components/ui/Modal'
import { useTaskStore } from '../../stores/useTaskStore'
import { useAuthStore } from '../../stores/useAuthStore'
import { callAI } from '../../lib/ai'
import { showToast } from '../../lib/toast'

export default function TasksSmartImportModal({ isOpen, onClose }) {
  const { user } = useAuthStore()
  const { lists, addTask } = useTaskStore()
  const [text, setText] = useState('')
  const [selectedListId, setSelectedListId] = useState('inbox')
  const [parsing, setParsing] = useState(false)
  const [parsed, setParsed] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function reset() {
    setText('')
    setSelectedListId('inbox')
    setParsed(null)
    setError('')
  }

  function handleClose() {
    reset()
    onClose()
  }

  async function handleParse() {
    if (!text.trim()) return
    setError('')
    setParsing(true)
    try {
      const { tasks } = await callAI('parse_tasks', {
        text,
        today: new Date().toISOString(),
      })
      if (!tasks || tasks.length === 0) {
        setError('No tasks detected. Try pasting more detail.')
        return
      }
      setParsed(tasks.map((t, i) => ({ ...t, checked: true, _key: i })))
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setParsing(false)
    }
  }

  async function handleAddSelected() {
    const toAdd = parsed.filter((t) => t.checked)
    if (!toAdd.length) return
    setSaving(true)
    let added = 0
    for (const t of toAdd) {
      const listId = selectedListId === 'inbox' ? null : selectedListId
      const { error } = await addTask({
        user_id: user.id,
        title: t.title,
        list_id: listId,
        due_date: t.due_date || null,
        priority: t.priority || 'normal',
        completed: false,
      })
      if (!error) added++
    }
    setSaving(false)
    showToast({ message: `${added} task${added !== 1 ? 's' : ''} imported`, variant: 'success' })
    handleClose()
  }

  function toggle(key) {
    setParsed((prev) => prev.map((t) => t._key === key ? { ...t, checked: !t.checked } : t))
  }

  const checkedCount = parsed?.filter((t) => t.checked).length ?? 0

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Quick import" size="lg">
      {!parsed ? (
        <div className="space-y-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Paste a to-do list from anywhere: notes app, email, message, anything.
          </p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste your tasks here…"
            rows={10}
            className="w-full rounded-lg border border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-white/[0.03] px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 resize-none focus:outline-none focus:ring-2 focus:ring-teal-400/30"
          />
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
              Add to list
            </label>
            <select
              value={selectedListId}
              onChange={(e) => setSelectedListId(e.target.value)}
              className="input-base w-full"
            >
              <option value="inbox">Inbox</option>
              {lists.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>
          {error && (
            <p className="text-xs text-rose-500 flex items-center gap-1.5">
              <AlertCircle size={13} />
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={handleClose} className="btn-ghost text-sm">Cancel</button>
            <button
              onClick={handleParse}
              disabled={!text.trim() || parsing}
              className="btn-primary text-sm flex items-center gap-2 disabled:opacity-40"
            >
              <Sparkles size={14} />
              {parsing ? 'Analysing…' : 'Import'}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Found {parsed.length} task{parsed.length !== 1 ? 's' : ''}. Select which to add
            </p>
            <button
              onClick={() => setParsed(null)}
              className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              ← Back
            </button>
          </div>
          <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
            {parsed.map((t) => (
              <label
                key={t._key}
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                  t.checked
                    ? 'border-teal-200 dark:border-teal-800 bg-teal-50/50 dark:bg-teal-900/10'
                    : 'border-gray-100 dark:border-gray-800 opacity-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={t.checked}
                  onChange={() => toggle(t._key)}
                  className="mt-0.5 accent-teal-500"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{t.title}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {t.priority && t.priority !== 'normal' && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded capitalize font-medium ${
                        t.priority === 'urgent'
                          ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'
                          : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                      }`}>
                        {t.priority}
                      </span>
                    )}
                    {t.due_date ? (
                      <span className="text-[10px] text-gray-500 dark:text-gray-400">
                        📅 {format(new Date(t.due_date), 'MMM d, yyyy')}
                      </span>
                    ) : (
                      <span className="text-[10px] text-gray-400 dark:text-gray-500">No date</span>
                    )}
                  </div>
                </div>
              </label>
            ))}
          </div>
          <div className="flex justify-end gap-2 pt-1 border-t border-gray-100 dark:border-gray-800">
            <button onClick={handleClose} className="btn-ghost text-sm">Cancel</button>
            <button
              onClick={handleAddSelected}
              disabled={checkedCount === 0 || saving}
              className="btn-primary text-sm disabled:opacity-40"
            >
              {saving ? 'Adding…' : `Add ${checkedCount} selected`}
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}
