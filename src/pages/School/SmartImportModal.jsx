import { useState } from 'react'
import { Sparkles, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'
import Modal from '../../components/ui/Modal'
import { useSchoolStore } from '../../stores/useSchoolStore'
import { useAuthStore } from '../../stores/useAuthStore'
import { supabase } from '../../lib/supabase'
import { showToast } from '../../lib/toast'
import { ASSIGNMENT_TYPES } from '../../lib/constants'

const VALID_TYPES = ASSIGNMENT_TYPES.map((t) => t.value)

export default function SmartImportModal({ isOpen, onClose }) {
  const { user } = useAuthStore()
  const { classes, addAssignment } = useSchoolStore()
  const [text, setText] = useState('')
  const [selectedClassId, setSelectedClassId] = useState('auto')
  const [parsing, setParsing] = useState(false)
  const [parsed, setParsed] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [detectedClassName, setDetectedClassName] = useState(null)

  function reset() {
    setText('')
    setSelectedClassId('auto')
    setParsed(null)
    setError('')
    setDetectedClassName(null)
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
      const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-assignments`
      console.log('[QuickImport] Calling Edge Function:', fnUrl)

      const today = new Date()
      const todayString = today.toISOString().split('T')[0]
      const dayName = today.toLocaleDateString('en-US', { weekday: 'long' })

      const { data, error } = await supabase.functions.invoke('parse-assignments', {
        body: { text, today: todayString, dayName },
      })

      console.log('[QuickImport] invoke result - error:', error, '| data:', data)

      if (error) {
        console.log('[QuickImport] supabase error object:', JSON.stringify(error))
        setError(`Function error: ${error.message || JSON.stringify(error)}`)
        return
      }
      if (data?.error) {
        console.log('[QuickImport] data.error branch:', data)
        setError(data.message || data.detail || 'Unknown error from Edge Function')
        return
      }
      const assignments = data?.assignments
      console.log('[QuickImport] assignments array:', assignments)
      if (!assignments || assignments.length === 0) {
        setError('No assignments detected. Try pasting more detail.')
        return
      }

      // Try to auto-detect the class from the first assignment's detected_class field
      const rawDetected = assignments.find((a) => a.detected_class)?.detected_class || null
      if (rawDetected) {
        const needle = rawDetected.toLowerCase()
        const match = classes.find((c) => c.name.toLowerCase().includes(needle) || needle.includes(c.name.toLowerCase()))
        if (match) {
          setSelectedClassId(match.id)
          setDetectedClassName(rawDetected)
        } else {
          setDetectedClassName(null)
        }
      }

      setParsed(
        assignments.map((a, i) => ({
          ...a,
          type: VALID_TYPES.includes(a.type) ? a.type : 'homework',
          checked: true,
          _key: i,
        }))
      )
    } catch (err) {
      console.log('[QuickImport] caught exception:', err)
      setError(`Unexpected error: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setParsing(false)
    }
  }

  async function handleAddSelected() {
    const toAdd = parsed.filter((a) => a.checked)
    console.log('[QuickImport] Selected assignments to import:', toAdd)

    // Never pass 'auto' to Supabase - resolve to real UUID first
    const classId = selectedClassId === 'auto' ? classes[0]?.id : selectedClassId
    console.log('[QuickImport] Selected class ID:', classId, '| raw selectedClassId:', selectedClassId)

    if (!classId) {
      showToast({ message: 'Please select a class before importing', variant: 'error' })
      return
    }
    if (!toAdd.length) return

    // Map all AI output variants to the exact DB constraint values (underscores)
    const typeMap = {
      homework: 'homework',
      assignment: 'assignment',
      essay: 'essay',
      lab_report: 'lab_report',
      'lab-report': 'lab_report',
      lab: 'lab_report',
      project: 'project',
      reading: 'reading',
      quiz: 'quiz',
      test: 'test',
      presentation: 'presentation',
      worksheet: 'worksheet',
      problem_set: 'problem_set',
      'problem-set': 'problem_set',
      classwork: 'classwork',
      research: 'research',
    }

    setSaving(true)
    let added = 0

    for (const a of toAdd) {
      // Combine due_date (YYYY-MM-DD) + due_time (HH:MM) into a full ISO timestamp
      const dueDate = a.due_date
        ? new Date(a.due_date + 'T' + (a.due_time || '23:59') + ':00').toISOString()
        : null

      const assignmentData = {
        user_id: user.id,
        class_id: classId,
        title: a.title,
        type: typeMap[a.type] || 'homework',
        due_date: dueDate,
        priority: 'normal',
        status: 'todo',
      }

      console.log('[QuickImport] Exact insert object:', JSON.stringify(assignmentData, null, 2))
      const { data, error } = await addAssignment(assignmentData)
      console.log('[QuickImport] Supabase insert result - data:', data, '| error:', error)
      if (error) {
        console.log('[QuickImport] Insert error detail:', JSON.stringify(error))
      }
      if (!error) added++
    }

    setSaving(false)
    showToast({ message: `${added} assignment${added !== 1 ? 's' : ''} imported`, variant: 'success' })
    handleClose()
  }

  function toggle(key) {
    setParsed((prev) => prev.map((a) => a._key === key ? { ...a, checked: !a.checked } : a))
  }

  const checkedCount = parsed?.filter((a) => a.checked).length ?? 0

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Quick import" size="lg">
      {!parsed ? (
        <div className="space-y-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Paste anything: a syllabus, Google Classroom list, email, anything.
          </p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste your text here…"
            rows={10}
            className="w-full rounded-lg border border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-white/[0.03] px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400/30"
          />
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
              Assign to class
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="input-base w-full"
            >
              <option value="auto">Auto-detect / First class</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
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
              Found {parsed.length} assignment{parsed.length !== 1 ? 's' : ''}. Select which to add
            </p>
            <button
              onClick={() => setParsed(null)}
              className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              ← Back
            </button>
          </div>
          <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
            {parsed.map((a) => (
              <label
                key={a._key}
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                  a.checked
                    ? 'border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-900/10'
                    : 'border-gray-100 dark:border-gray-800 opacity-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={a.checked}
                  onChange={() => toggle(a._key)}
                  className="mt-0.5 accent-indigo-500"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{a.title}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 capitalize">
                      {a.type}
                    </span>
                    {a.due_date ? (
                      <span className="text-[10px] text-gray-500 dark:text-gray-400">
                        📅 {format(new Date(a.due_date), 'MMM d, yyyy')}
                      </span>
                    ) : (
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        <AlertCircle size={10} />
                        No date, set manually
                      </span>
                    )}
                    {a.notes && (
                      <span className="text-[10px] text-gray-400 dark:text-gray-500 truncate max-w-[180px]">
                        {a.notes}
                      </span>
                    )}
                  </div>
                </div>
              </label>
            ))}
          </div>
          <div className="pt-1 border-t border-gray-100 dark:border-gray-800 space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                Add to class
              </label>
              <select
                value={selectedClassId}
                onChange={(e) => { setSelectedClassId(e.target.value); setDetectedClassName(null) }}
                className="input-base w-full"
              >
                <option value="auto">Auto-detect / First class</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {detectedClassName && (
                <p className="mt-1.5 text-[11px] text-gray-400 dark:text-gray-500">
                  Auto-detected: {detectedClassName}
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2">
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
        </div>
      )}
    </Modal>
  )
}
