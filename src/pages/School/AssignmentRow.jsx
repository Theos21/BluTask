import { MoreHorizontal, Clock } from 'lucide-react'
import { useState } from 'react'
import ColorPill from '../../components/ui/ColorPill'
import PriorityDot from '../../components/ui/PriorityDot'
import { getColorByValue, ASSIGNMENT_STATUSES } from '../../lib/constants'
import { formatDueDate, isDueWithin24Hours, isOverdue } from '../../lib/utils'
import { useSchoolStore } from '../../stores/useSchoolStore'
import { showToast } from '../../lib/toast'

const STATUS_STYLES = {
  todo: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
  inprogress: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  submitted: 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300',
  graded: 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300',
}

export default function AssignmentRow({ assignment, classData, onEdit }) {
  const { updateAssignment, deleteAssignment, addAssignment } = useSchoolStore()
  const [menuOpen, setMenuOpen] = useState(false)

  const colorObj = getColorByValue(classData?.color)
  const due24 = isDueWithin24Hours(assignment.due_date)
  const overdue = isOverdue(assignment.due_date) && assignment.status !== 'submitted' && assignment.status !== 'graded'
  const statusLabel = ASSIGNMENT_STATUSES.find((s) => s.value === assignment.status)?.label

  async function cycleStatus() {
    const order = ['todo', 'inprogress', 'submitted', 'graded']
    const idx = order.indexOf(assignment.status)
    const next = order[(idx + 1) % order.length]
    await updateAssignment(assignment.id, { status: next })
    if (next === 'submitted') {
      showToast({ message: 'Assignment submitted', variant: 'success' })
    }
  }

  return (
    <div
      className={`group flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors border-l-2 ${
        due24 && !overdue ? 'border-amber-400' : overdue ? 'border-rose-400' : 'border-transparent'
      }`}
    >
      {/* Color pill — always visible */}
      {classData && (
        <ColorPill color={classData.color} name={classData.name} size="xs" />
      )}

      {/* Priority */}
      <PriorityDot priority={assignment.priority} />

      {/* Title */}
      <span className={`flex-1 text-sm font-medium truncate ${
        assignment.status === 'graded' ? 'line-through text-gray-400' : 'text-gray-800 dark:text-gray-200'
      }`}>
        {assignment.title}
      </span>

      {/* Type badge */}
      <span className="text-xs text-gray-400 dark:text-gray-500 capitalize hidden sm:block">
        {assignment.type}
      </span>

      {/* Checklist progress */}
      {assignment.checklist && assignment.checklist.length > 0 && (
        <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums hidden sm:block">
          {assignment.checklist.filter((i) => i.completed).length}/{assignment.checklist.length}
        </span>
      )}

      {/* Due date */}
      {assignment.due_date && (
        <span className={`flex items-center gap-1 text-xs ${
          overdue ? 'text-rose-500' : due24 ? 'text-amber-500' : 'text-gray-400 dark:text-gray-500'
        }`}>
          <Clock size={11} />
          {formatDueDate(assignment.due_date)}
        </span>
      )}

      {/* Status */}
      <button
        onClick={cycleStatus}
        className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${STATUS_STYLES[assignment.status]}`}
      >
        {statusLabel}
      </button>

      {/* Menu */}
      <div className="relative">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
        >
          <MoreHorizontal size={15} />
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-7 z-10 w-32 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl shadow-lg py-1 animate-fade-in">
            <button
              onClick={() => { onEdit(assignment); setMenuOpen(false) }}
              className="w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Edit
            </button>
            <button
              onClick={async () => {
                const { id, created_at, updated_at, ...snapshot } = assignment
                await deleteAssignment(assignment.id)
                setMenuOpen(false)
                showToast({
                  message: 'Deleted',
                  actions: { label: 'Undo', onClick: () => addAssignment(snapshot) },
                })
              }}
              className="w-full text-left px-3 py-1.5 text-xs text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20"
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
