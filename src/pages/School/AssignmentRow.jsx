import { MoreHorizontal, Clock, CheckCircle2, Circle } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import ColorPill from '../../components/ui/ColorPill'
import PriorityDot from '../../components/ui/PriorityDot'
import { ASSIGNMENT_STATUSES, TYPE_PILL_STYLES, getTypeByValue } from '../../lib/constants'
import { formatDueDate, isDueWithin24Hours, isOverdue } from '../../lib/utils'
import { useSchoolStore } from '../../stores/useSchoolStore'
import { showToast } from '../../lib/toast'

const STATUS_STYLES = {
  todo: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
  inprogress: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  submitted: 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300',
  graded: 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300',
}

export default function AssignmentRow({ assignment, classData, onEdit, showClassPill = true }) {
  const { updateAssignment, deleteAssignment, addAssignment, completeAssignmentInDB, markAssignmentCompleted, uncompleteAssignment } = useSchoolStore()
  const [menuOpen, setMenuOpen] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [menuPos, setMenuPos] = useState(null)
  const menuBtnRef = useRef(null)
  const menuContentRef = useRef(null)

  const due24 = isDueWithin24Hours(assignment.due_date)
  const overdue = isOverdue(assignment.due_date) && assignment.status !== 'submitted' && assignment.status !== 'graded'
  const statusLabel = ASSIGNMENT_STATUSES.find((s) => s.value === assignment.status)?.label

  // Close on outside click - must exclude the portaled menu content itself,
  // otherwise mousedown fires before click and removes the menu from DOM so click never fires.
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
    const menuHeight = 80
    const top = rect.bottom + 4 + menuHeight > window.innerHeight
      ? rect.top - menuHeight - 4
      : rect.bottom + 4
    setMenuPos({ top, right: window.innerWidth - rect.right })
    setMenuOpen(true)
  }

  async function cycleStatus(e) {
    e.stopPropagation()
    const order = ['todo', 'inprogress', 'submitted', 'graded']
    const idx = order.indexOf(assignment.status)
    const next = order[(idx + 1) % order.length]
    await updateAssignment(assignment.id, { status: next })
    if (next === 'submitted') {
      showToast({ message: 'Assignment submitted', variant: 'success' })
    }
  }

  function handleEdit(e) {
    e.stopPropagation()
    console.log('[AssignmentRow] Edit clicked, assignment:', assignment)
    setMenuOpen(false)
    onEdit(assignment)
  }

  async function handleDelete(e) {
    e.stopPropagation()
    console.log('[AssignmentRow] Delete clicked, id:', assignment.id)
    const { id, created_at, updated_at, ...snapshot } = assignment
    setMenuOpen(false)
    const { error } = await deleteAssignment(assignment.id)
    console.log('[AssignmentRow] Delete result, error:', error)
    if (!error) {
      showToast({
        message: 'Deleted',
        actions: { label: 'Undo', onClick: () => addAssignment(snapshot) },
      })
    }
  }

  async function handleComplete(e) {
    e.stopPropagation()
    setCompleting(true) // start fade animation immediately

    // Fire DB call and wait for animation in parallel - neither blocks the other.
    // Store is only updated after BOTH succeed so the row stays mounted through the full animation.
    const [{ data, error }] = await Promise.all([
      completeAssignmentInDB(assignment.id),
      new Promise((r) => setTimeout(r, 600)),
    ])

    if (error) {
      setCompleting(false)
      showToast({ message: 'Failed to complete assignment', variant: 'error' })
      return
    }

    markAssignmentCompleted(assignment.id, data) // now remove from filtered list
    showToast({
      message: 'Assignment completed',
      actions: { label: 'Undo', onClick: () => uncompleteAssignment(assignment.id) },
    })
  }

  return (
    <div
      className={`group flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-all duration-300 border-l-2 ${
        due24 && !overdue ? 'border-amber-400' : overdue ? 'border-rose-400' : 'border-transparent'
      } ${completing ? 'opacity-0' : 'opacity-100'}`}
      style={{ transition: completing ? 'opacity 600ms ease' : undefined }}
    >
      {/* Completion checkbox */}
      <button
        onClick={handleComplete}
        className="flex-shrink-0 text-gray-300 dark:text-gray-600 hover:text-indigo-400 dark:hover:text-indigo-400 transition-colors"
      >
        <Circle size={16} />
      </button>

      {showClassPill && classData && <ColorPill color={classData.color} name={classData.name} size="xs" />}
      <PriorityDot priority={assignment.priority} />

      <span className={`flex-1 text-sm font-medium truncate transition-all duration-300 ${
        completing || assignment.status === 'graded'
          ? 'line-through text-gray-400'
          : 'text-gray-800 dark:text-gray-200'
      }`}>
        {assignment.title}
      </span>

      {(() => {
        const typeObj = getTypeByValue(assignment.type)
        return (
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium capitalize hidden sm:block ${TYPE_PILL_STYLES[typeObj?.category] || TYPE_PILL_STYLES.general}`}>
            {typeObj?.label || assignment.type}
          </span>
        )
      })()}

      {assignment.checklist && assignment.checklist.length > 0 && (
        <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums hidden sm:block">
          {assignment.checklist.filter((i) => i.completed).length}/{assignment.checklist.length}
        </span>
      )}

      {assignment.due_date && (
        <span className={`flex items-center gap-1 text-xs ${
          overdue ? 'text-rose-500' : due24 ? 'text-amber-500' : 'text-gray-400 dark:text-gray-500'
        }`}>
          <Clock size={11} />
          {formatDueDate(assignment.due_date)}
        </span>
      )}

      <button
        onClick={cycleStatus}
        className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${STATUS_STYLES[assignment.status]}`}
      >
        {statusLabel}
      </button>

      {/* Three-dot menu - portaled to body to escape card's overflow-hidden */}
      <div className="relative">
        <button
          ref={menuBtnRef}
          onClick={toggleMenu}
          className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
        >
          <MoreHorizontal size={15} />
        </button>

        {menuOpen && menuPos && createPortal(
          <div
            ref={menuContentRef}
            style={{
              position: 'fixed',
              top: menuPos.top,
              right: menuPos.right,
              zIndex: 9999,
              pointerEvents: 'auto',
            }}
            className="w-40 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl shadow-xl py-1"
          >
            <button
              onClick={handleEdit}
              style={{ pointerEvents: 'auto' }}
              className="w-full text-left px-3 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Edit assignment
            </button>
            <button
              onClick={handleDelete}
              style={{ pointerEvents: 'auto' }}
              className="w-full text-left px-3 py-2 text-xs text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20"
            >
              Delete
            </button>
          </div>,
          document.body
        )}
      </div>

    </div>
  )
}
