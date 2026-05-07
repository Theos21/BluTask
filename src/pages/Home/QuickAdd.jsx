import { useState } from 'react'
import { Plus, GraduationCap } from 'lucide-react'
import { useTaskStore } from '../../stores/useTaskStore'
import { useSchoolStore } from '../../stores/useSchoolStore'
import { useAuthStore } from '../../stores/useAuthStore'
import { showToast } from '../../lib/toast'
import AssignmentModal from '../School/AssignmentModal'

export default function QuickAdd() {
  const { user, profile } = useAuthStore()
  const showSchool = profile?.show_school ?? true
  const { addTask } = useTaskStore()
  const { classes } = useSchoolStore()
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false)

  async function handleTaskSubmit(e) {
    e.preventDefault()
    if (!value.trim() || saving) return
    setSaving(true)
    await addTask({
      user_id: user.id,
      title: value.trim(),
      list_id: null,
      priority: 'normal',
      completed: false,
    })
    showToast({ message: 'Task added to Inbox', variant: 'success' })
    setValue('')
    setSaving(false)
  }

  const barClass =
    'flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08] transition-all'

  return (
    <div className="space-y-2">
      {/* Task bar */}
      <form onSubmit={handleTaskSubmit} className="flex items-center gap-2">
        <div className={`flex-1 ${barClass} focus-within:ring-2 focus-within:ring-gray-200 dark:focus-within:ring-white/10 focus-within:border-transparent`}>
          <Plus size={14} className="text-gray-400 flex-shrink-0" />
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Add a task to Inbox..."
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

      {/* School bar - opens AssignmentModal */}
      {showSchool && classes.length > 0 && (
        <button
          type="button"
          onClick={() => setAssignmentModalOpen(true)}
          className={`w-full ${barClass} hover:border-gray-300 dark:hover:border-white/[0.15] group`}
        >
          <GraduationCap size={14} className="text-gray-400 flex-shrink-0" />
          <span className="flex-1 text-left text-sm text-gray-400 dark:text-gray-600 group-hover:text-gray-500 dark:group-hover:text-gray-500 transition-colors">
            Add an assignment…
          </span>
        </button>
      )}

      <AssignmentModal
        isOpen={assignmentModalOpen}
        onClose={() => setAssignmentModalOpen(false)}
        editAssignment={null}
        defaultClassId={classes[0]?.id || null}
      />
    </div>
  )
}
