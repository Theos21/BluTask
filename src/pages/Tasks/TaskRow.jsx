import { useState } from 'react'
import { Clock, MoreHorizontal, RefreshCw } from 'lucide-react'
import ColorPill from '../../components/ui/ColorPill'
import PriorityDot from '../../components/ui/PriorityDot'
import { formatDueDate, isDueWithin24Hours, isOverdue } from '../../lib/utils'
import { useTaskStore } from '../../stores/useTaskStore'
import { showToast } from '../../lib/toast'

export default function TaskRow({ task, listData, onEdit }) {
  const { toggleTask, deleteTask, addTask, checklistItems } = useTaskStore()
  const [menuOpen, setMenuOpen] = useState(false)

  const due24 = isDueWithin24Hours(task.due_date)
  const overdue = isOverdue(task.due_date) && !task.completed
  const items = checklistItems[task.id] || []
  const completedItems = items.filter((i) => i.completed).length

  return (
    <div className={`group flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors border-l-2 ${
      task.completed ? 'border-transparent opacity-60' :
      due24 && !overdue ? 'border-amber-400' :
      overdue ? 'border-rose-400' : 'border-transparent'
    }`}>
      {/* Checkbox */}
      <button
        onClick={() => {
          const completing = !task.completed
          toggleTask(task.id, completing)
          if (completing) {
            showToast({
              message: 'Task completed',
              variant: 'success',
              actions: { label: 'Undo', onClick: () => toggleTask(task.id, false) },
            })
          }
        }}
        className={`w-4.5 h-4.5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
          task.completed
            ? 'bg-teal-500 border-teal-500'
            : 'border-gray-300 dark:border-gray-600 hover:border-teal-400'
        }`}
        style={{ width: 18, height: 18 }}
      >
        {task.completed && (
          <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
            <path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      {/* List pill — always visible */}
      {listData && (
        <ColorPill color={listData.color} name={listData.name} size="xs" />
      )}

      {/* Priority */}
      <PriorityDot priority={task.priority} />

      {/* Title */}
      <span className={`flex-1 text-sm font-medium truncate ${
        task.completed
          ? 'line-through text-gray-400 dark:text-gray-500'
          : 'text-gray-800 dark:text-gray-200'
      }`}>
        {task.title}
      </span>

      {/* Checklist progress */}
      {items.length > 0 && (
        <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">
          {completedItems}/{items.length}
        </span>
      )}

      {/* Repeat icon */}
      {task.repeat_rule && (
        <RefreshCw size={12} className="text-gray-400 dark:text-gray-500" />
      )}

      {/* Due date */}
      {task.due_date && (
        <span className={`flex items-center gap-1 text-xs ${
          task.completed ? 'text-gray-400' :
          overdue ? 'text-rose-500' : due24 ? 'text-amber-500' : 'text-gray-400 dark:text-gray-500'
        }`}>
          <Clock size={11} />
          {formatDueDate(task.due_date)}
        </span>
      )}

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
              onClick={() => { onEdit(task); setMenuOpen(false) }}
              className="w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Edit
            </button>
            <button
              onClick={async () => {
                const { id, created_at, updated_at, completed_at, ...snapshot } = task
                await deleteTask(task.id)
                setMenuOpen(false)
                showToast({
                  message: 'Deleted',
                  actions: { label: 'Undo', onClick: () => addTask(snapshot) },
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
