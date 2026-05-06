import { useState } from 'react'
import { Plus, GraduationCap, CheckSquare } from 'lucide-react'
import { useTaskStore } from '../../stores/useTaskStore'
import { useSchoolStore } from '../../stores/useSchoolStore'
import { useAuthStore } from '../../stores/useAuthStore'

export default function QuickAdd() {
  const { user } = useAuthStore()
  const { addTask } = useTaskStore()
  const { classes, addAssignment } = useSchoolStore()
  const [value, setValue] = useState('')
  const [mode, setMode] = useState('task')
  const [classId, setClassId] = useState(classes[0]?.id || '')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!value.trim() || saving) return
    setSaving(true)

    if (mode === 'task') {
      await addTask({
        user_id: user.id,
        title: value.trim(),
        list_id: null,
        priority: 'normal',
        completed: false,
      })
    } else {
      const targetClass = classId || classes[0]?.id
      if (targetClass) {
        await addAssignment({
          user_id: user.id,
          class_id: targetClass,
          title: value.trim(),
          type: 'homework',
          priority: 'normal',
          status: 'todo',
        })
      }
    }

    setValue('')
    setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      {/* Mode toggle — minimal pill */}
      <div className="flex rounded-lg bg-gray-100 dark:bg-white/[0.05] p-0.5 flex-shrink-0">
        <button
          type="button"
          onClick={() => setMode('task')}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
            mode === 'task'
              ? 'bg-white dark:bg-white/10 text-gray-800 dark:text-gray-200 shadow-sm'
              : 'text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400'
          }`}
        >
          <CheckSquare size={11} />
          Task
        </button>
        <button
          type="button"
          onClick={() => setMode('school')}
          disabled={classes.length === 0}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all disabled:opacity-30 ${
            mode === 'school'
              ? 'bg-white dark:bg-white/10 text-gray-800 dark:text-gray-200 shadow-sm'
              : 'text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400'
          }`}
        >
          <GraduationCap size={11} />
          School
        </button>
      </div>

      {/* Class selector */}
      {mode === 'school' && classes.length > 0 && (
        <select
          value={classId}
          onChange={(e) => setClassId(e.target.value)}
          className="input-base w-32 flex-shrink-0"
        >
          {classes.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      )}

      {/* Input */}
      <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08] focus-within:ring-2 focus-within:ring-gray-200 dark:focus-within:ring-white/10 focus-within:border-transparent transition-all">
        <Plus size={14} className="text-gray-400 flex-shrink-0" />
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={mode === 'task' ? 'Add a task…' : 'Add an assignment…'}
          className="flex-1 bg-transparent text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 outline-none"
        />
      </div>

      <button
        type="submit"
        disabled={!value.trim() || saving}
        className="btn-primary text-xs px-3 py-2 disabled:opacity-30"
      >
        {saving ? '…' : 'Add'}
      </button>
    </form>
  )
}
