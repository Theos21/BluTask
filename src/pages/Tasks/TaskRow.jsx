import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Clock, MoreHorizontal, RefreshCw, FileText } from 'lucide-react'
import PriorityDot from '../../components/ui/PriorityDot'
import { formatDueDate, isDueWithin24Hours, isOverdue } from '../../lib/utils'
import { useTaskStore } from '../../stores/useTaskStore'
import { useTagStore } from '../../stores/useTagStore'
import { showToast } from '../../lib/toast'

const PRIORITY_BORDER = {
  urgent:    'border-rose-500',
  important: 'border-amber-400',
  normal:    'border-transparent',
}

export default function TaskRow({ task, listData, onEdit, onTagClick, showListName = false }) {
  const { toggleTask, deleteTask, addTask, checklistItems } = useTaskStore()
  const { tags, taskTags } = useTagStore()
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuPos, setMenuPos] = useState(null)
  const menuBtnRef = useRef(null)
  const menuContentRef = useRef(null)

  const due24 = isDueWithin24Hours(task.due_date)
  const overdue = isOverdue(task.due_date) && !task.completed
  const items = checklistItems[task.id] || []
  const completedItems = items.filter((i) => i.completed).length

  const taskTagIds = taskTags[task.id] || []
  const taskTagObjects = tags.filter((t) => taskTagIds.includes(t.id))

  useEffect(() => {
    if (!menuOpen) return
    function handle(e) {
      const inBtn = menuBtnRef.current?.contains(e.target)
      const inMenu = menuContentRef.current?.contains(e.target)
      if (!inBtn && !inMenu) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [menuOpen])

  function toggleMenu(e) {
    e.stopPropagation()
    if (menuOpen) { setMenuOpen(false); return }
    const rect = menuBtnRef.current?.getBoundingClientRect()
    if (!rect) return
    const menuH = 72
    const top = rect.bottom + 4 + menuH > window.innerHeight ? rect.top - menuH - 4 : rect.bottom + 4
    setMenuPos({ top, right: window.innerWidth - rect.right })
    setMenuOpen(true)
  }

  function handleEdit(e) {
    e.stopPropagation()
    setMenuOpen(false)
    onEdit(task)
  }

  async function handleDelete(e) {
    e.stopPropagation()
    const { id, created_at, updated_at, completed_at, ...snapshot } = task
    setMenuOpen(false)
    await deleteTask(task.id)
    showToast({
      message: 'Task deleted',
      actions: { label: 'Undo', onClick: () => addTask(snapshot) },
    })
  }

  const borderClass = task.completed
    ? 'border-transparent opacity-60'
    : PRIORITY_BORDER[task.priority] || 'border-transparent'

  return (
    <div className={`group flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors border-l-2 ${borderClass}`}>
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
        className={`flex-shrink-0 flex items-center justify-center rounded-full border-2 transition-all ${
          task.completed
            ? 'bg-teal-500 border-teal-500'
            : 'border-gray-300 dark:border-gray-600 hover:border-teal-400'
        }`}
        style={{ width: 16, height: 16 }}
      >
        {task.completed && (
          <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
            <path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      {/* Title + metadata */}
      <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
        <span className={`text-sm font-medium truncate ${
          task.completed
            ? 'line-through text-gray-400 dark:text-gray-500'
            : 'text-gray-800 dark:text-gray-200'
        }`}>
          {task.title}
        </span>

        {/* List name badge (shown in Inbox/tag views) */}
        {showListName && listData && listData.id !== 'inbox' && (
          <span
            className="text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0"
            style={{ backgroundColor: listData.color + '20', color: listData.color }}
          >
            {listData.name}
          </span>
        )}

        {/* Tag pills — max 3 visible */}
        {taskTagObjects.slice(0, 3).map((tag) => (
          <button
            key={tag.id}
            type="button"
            onClick={onTagClick ? (e) => { e.stopPropagation(); onTagClick(tag.id) } : undefined}
            className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${onTagClick ? 'hover:opacity-80 transition-opacity' : ''}`}
            style={{ backgroundColor: tag.color + '25', color: tag.color }}
          >
            {tag.name}
          </button>
        ))}
        {taskTagObjects.length > 3 && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
            +{taskTagObjects.length - 3}
          </span>
        )}
      </div>

      {/* Right side metadata */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Notes indicator */}
        {task.notes && (
          <FileText size={11} className="text-gray-300 dark:text-gray-600 flex-shrink-0" />
        )}

        {/* Checklist progress */}
        {items.length > 0 && (
          <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">
            {completedItems}/{items.length}
          </span>
        )}

        {/* Repeat */}
        {task.repeat_rule && (
          <RefreshCw size={11} className="text-gray-400 dark:text-gray-500" />
        )}

        {/* Due date */}
        {task.due_date && (
          <span className={`flex items-center gap-1 text-xs ${
            task.completed ? 'text-gray-400' :
            overdue ? 'text-rose-500' : due24 ? 'text-amber-500' : 'text-gray-400 dark:text-gray-500'
          }`}>
            <Clock size={10} />
            {formatDueDate(task.due_date)}
          </span>
        )}

        {/* Three-dot menu - portaled to body */}
        <div>
          <button
            ref={menuBtnRef}
            onClick={toggleMenu}
            className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
          >
            <MoreHorizontal size={14} />
          </button>

          {menuOpen && menuPos && createPortal(
            <div
              ref={menuContentRef}
              style={{ position: 'fixed', top: menuPos.top, right: menuPos.right, zIndex: 9999 }}
              className="w-32 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl shadow-xl py-1"
            >
              <button
                onClick={handleEdit}
                className="w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Edit
              </button>
              <button
                onClick={handleDelete}
                className="w-full text-left px-3 py-1.5 text-xs text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20"
              >
                Delete
              </button>
            </div>,
            document.body
          )}
        </div>
      </div>
    </div>
  )
}
