import { useState } from 'react'
import { Plus, GraduationCap } from 'lucide-react'
import { useAuthStore } from '../../stores/useAuthStore'
import { useSchoolStore } from '../../stores/useSchoolStore'
import TaskModal from '../Tasks/TaskModal'
import AssignmentModal from '../School/AssignmentModal'

export default function QuickAdd() {
  const { profile } = useAuthStore()
  const showSchool = profile?.show_school ?? true
  const { classes } = useSchoolStore()
  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false)

  const barClass =
    'flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08] transition-all w-full text-left'

  return (
    <div className="space-y-2">
      {/* Task bar — opens full TaskModal */}
      <button
        type="button"
        onClick={() => setTaskModalOpen(true)}
        className={`${barClass} hover:border-gray-300 dark:hover:border-white/[0.15] group`}
      >
        <Plus size={14} className="text-gray-400 flex-shrink-0" />
        <span className="flex-1 text-sm text-gray-400 dark:text-gray-600 group-hover:text-gray-500 dark:group-hover:text-gray-500 transition-colors">
          Add a task…
        </span>
      </button>

      {/* School bar — opens AssignmentModal */}
      {showSchool && classes.length > 0 && (
        <button
          type="button"
          onClick={() => setAssignmentModalOpen(true)}
          className={`${barClass} hover:border-gray-300 dark:hover:border-white/[0.15] group`}
        >
          <GraduationCap size={14} className="text-gray-400 flex-shrink-0" />
          <span className="flex-1 text-sm text-gray-400 dark:text-gray-600 group-hover:text-gray-500 dark:group-hover:text-gray-500 transition-colors">
            Add an assignment…
          </span>
        </button>
      )}

      <TaskModal
        isOpen={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        editTask={null}
        defaultListId={null}
      />
      <AssignmentModal
        isOpen={assignmentModalOpen}
        onClose={() => setAssignmentModalOpen(false)}
        editAssignment={null}
        defaultClassId={classes[0]?.id || null}
      />
    </div>
  )
}
