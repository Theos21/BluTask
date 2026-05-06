import { useState, useRef } from 'react'
import { Download, Upload, FileJson, Loader2, Check, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/useAuthStore'
import { useTaskStore } from '../../stores/useTaskStore'

function detectFormat(json) {
  if (json.version && json.classes) return 'blutask'
  if (json.items?.[0]?.content !== undefined) return 'todoist'
  if (json.items?.[0]?.title !== undefined || json.areas || json.projects) return 'things3'
  return 'unknown'
}

function mapTodoistPriority(p) {
  if (p === 4) return 'urgent'
  if (p === 3) return 'important'
  return 'normal'
}

export default function DataSection() {
  const { user } = useAuthStore()
  const { fetchTasks } = useTaskStore()
  const fileRef = useRef(null)

  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importMsg, setImportMsg] = useState(null) // { type: 'success'|'error', text }

  async function exportData() {
    setExporting(true)
    const uid = user.id
    const [cls, asgn, lists, tasks, blocks, items] = await Promise.all([
      supabase.from('classes').select('*').eq('user_id', uid),
      supabase.from('assignments').select('*').eq('user_id', uid),
      supabase.from('lists').select('*').eq('user_id', uid),
      supabase.from('tasks').select('*').eq('user_id', uid),
      supabase.from('routine_blocks').select('*').eq('user_id', uid),
      supabase.from('checklist_items').select('*, tasks!inner(user_id)').eq('tasks.user_id', uid),
    ])

    const payload = {
      version: '1.0',
      exported_at: new Date().toISOString(),
      classes: cls.data || [],
      assignments: asgn.data || [],
      lists: lists.data || [],
      tasks: tasks.data || [],
      checklist_items: items.data || [],
      routine_blocks: blocks.data || [],
    }

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `blutask-${format(new Date(), 'yyyy-MM-dd')}.json`
    a.click()
    URL.revokeObjectURL(url)
    setExporting(false)
  }

  async function handleImport(e) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setImportMsg(null)
    setImporting(true)

    try {
      const text = await file.text()
      const json = JSON.parse(text)
      const fmt = detectFormat(json)

      if (fmt === 'unknown') {
        setImportMsg({ type: 'error', text: 'Unrecognized format. Export from Things3 or Todoist as JSON.' })
        setImporting(false)
        return
      }

      let tasks = []

      if (fmt === 'blutask') {
        // Re-import our own export: just import tasks to Inbox
        tasks = (json.tasks || []).map((t) => ({
          user_id: user.id,
          list_id: null,
          title: t.title,
          notes: t.notes || null,
          due_date: t.due_date || null,
          priority: t.priority || 'normal',
          completed: t.completed || false,
          completed_at: t.completed_at || null,
        }))
      } else if (fmt === 'todoist') {
        tasks = (json.items || []).map((t) => ({
          user_id: user.id,
          list_id: null,
          title: t.content,
          notes: t.description || null,
          due_date: t.due?.datetime || (t.due?.date ? new Date(t.due.date).toISOString() : null),
          priority: mapTodoistPriority(t.priority),
          completed: !!t.checked,
          completed_at: null,
        }))
      } else if (fmt === 'things3') {
        const items = json.items || []
        tasks = items.map((t) => ({
          user_id: user.id,
          list_id: null,
          title: t.title || t.name || 'Untitled',
          notes: t.notes || null,
          due_date: t.dueDate ? new Date(t.dueDate).toISOString() : null,
          priority: 'normal',
          completed: !!t.completed,
          completed_at: null,
        }))
      }

      if (tasks.length === 0) {
        setImportMsg({ type: 'error', text: 'No tasks found in this file.' })
        setImporting(false)
        return
      }

      const { error } = await supabase.from('tasks').insert(tasks)
      if (error) throw error

      await fetchTasks(user.id)
      setImportMsg({ type: 'success', text: `Imported ${tasks.length} task${tasks.length !== 1 ? 's' : ''} to Inbox.` })
    } catch (err) {
      setImportMsg({ type: 'error', text: err.message || 'Import failed.' })
    }

    setImporting(false)
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">Data</h2>
        <p className="text-xs text-gray-400 dark:text-gray-500">Export your data or import from another app.</p>
      </div>

      {/* Export */}
      <div className="card p-5">
        <div className="flex items-start gap-4">
          <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center flex-shrink-0">
            <Download size={16} className="text-teal-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Export all data</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              Download a JSON file with all your classes, assignments, tasks, lists, and routine blocks.
            </p>
            <button
              onClick={exportData}
              disabled={exporting}
              className="btn-primary text-xs mt-3 disabled:opacity-50"
            >
              {exporting ? <Loader2 size={13} className="animate-spin" /> : <FileJson size={13} />}
              {exporting ? 'Exporting…' : 'Download JSON'}
            </button>
          </div>
        </div>
      </div>

      {/* Import */}
      <div className="card p-5">
        <div className="flex items-start gap-4">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center flex-shrink-0">
            <Upload size={16} className="text-indigo-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Import tasks</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              Import from <strong>Things3</strong> or <strong>Todoist</strong> (JSON export), or re-import a BluTask export.
              All tasks land in your Inbox.
            </p>

            {importMsg && (
              <div className={`flex items-start gap-2 mt-3 text-xs px-3 py-2 rounded-lg ${
                importMsg.type === 'success'
                  ? 'bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300'
                  : 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400'
              }`}>
                {importMsg.type === 'success'
                  ? <Check size={13} className="mt-0.5 flex-shrink-0" />
                  : <AlertCircle size={13} className="mt-0.5 flex-shrink-0" />
                }
                {importMsg.text}
              </div>
            )}

            <button
              onClick={() => fileRef.current?.click()}
              disabled={importing}
              className="btn-ghost text-xs mt-3 border border-gray-200 dark:border-gray-700 disabled:opacity-50"
            >
              {importing ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
              {importing ? 'Importing…' : 'Choose JSON file'}
            </button>
            <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50 px-4 py-3">
        <p className="text-xs text-gray-400 dark:text-gray-500">
          <strong className="text-gray-500 dark:text-gray-400">Things3:</strong> File → Export → JSON. &nbsp;
          <strong className="text-gray-500 dark:text-gray-400">Todoist:</strong> Settings → Backups → Download latest.
        </p>
      </div>
    </div>
  )
}
