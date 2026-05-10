import { MoreHorizontal, Clock, Circle, ChevronDown, Plus, Trash2 } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import ColorPill from '../../components/ui/ColorPill'
import PriorityDot from '../../components/ui/PriorityDot'
import { ASSIGNMENT_STATUSES, TYPE_PILL_STYLES, getTypeByValue } from '../../lib/constants'
import { formatDueDate, isDueWithin24Hours, isOverdue } from '../../lib/utils'
import { useSchoolStore } from '../../stores/useSchoolStore'
import { showToast } from '../../lib/toast'
import { renderMarkdown } from '../../lib/markdown'

function uid() { return Math.random().toString(36).slice(2, 10) }

const STATUS_STYLES = {
  todo:       'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
  inprogress: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  submitted:  'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300',
  graded:     'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300',
}

export default function AssignmentRow({ assignment, classData, onEdit, showClassPill = true }) {
  const { updateAssignment, deleteAssignment, addAssignment, completeAssignmentInDB, markAssignmentCompleted, uncompleteAssignment } = useSchoolStore()

  const [menuOpen, setMenuOpen] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [menuPos, setMenuPos] = useState(null)
  const menuBtnRef = useRef(null)
  const menuContentRef = useRef(null)

  const [expanded, setExpanded] = useState(false)
  const [notesValue, setNotesValue] = useState(assignment.notes || '')
  const [notesFocused, setNotesFocused] = useState(false)
  const [checklist, setChecklist] = useState(assignment.checklist || [])
  const [addingItem, setAddingItem] = useState(false)
  const [newItemText, setNewItemText] = useState('')
  const newItemRef = useRef(null)

  // Sync local state when assignment identity changes (not on every store update)
  useEffect(() => {
    setNotesValue(assignment.notes || '')
    setChecklist(assignment.checklist || [])
  }, [assignment.id])

  useEffect(() => {
    if (addingItem) newItemRef.current?.focus()
  }, [addingItem])

  const due24 = isDueWithin24Hours(assignment.due_date)
  const overdue = isOverdue(assignment.due_date) && assignment.status !== 'submitted' && assignment.status !== 'graded'
  const statusLabel = ASSIGNMENT_STATUSES.find((s) => s.value === assignment.status)?.label
  const completedCount = checklist.filter((i) => i.completed).length
  const hasContent = !!(assignment.notes || checklist.length > 0)

  useEffect(() => {
    if (!menuOpen) return
    function handle(e) {
      const inBtn = menuBtnRef.current?.contains(e.target)
      const inMenu = menuContentRef.current?.contains(e.target)
      if (!inBtn && !inMenu) setMenuOpen(false)
    }
    document.addEventListener('pointerdown', handle)
    return () => document.removeEventListener('pointerdown', handle)
  }, [menuOpen])

  function toggleMenu(e) {
    e.stopPropagation()
    if (menuOpen) { setMenuOpen(false); return }
    const rect = menuBtnRef.current?.getBoundingClientRect()
    if (!rect) return
    const menuHeight = 80
    // Reserve 64px at the bottom for the mobile tab bar
    const safeBottom = window.innerHeight - 64
    const top = rect.bottom + 4 + menuHeight > safeBottom ? rect.top - menuHeight - 4 : rect.bottom + 4
    setMenuPos({ top, right: window.innerWidth - rect.right })
    setMenuOpen(true)
  }

  async function cycleStatus(e) {
    e.stopPropagation()
    const order = ['todo', 'inprogress', 'submitted', 'graded']
    const idx = order.indexOf(assignment.status)
    const next = order[(idx + 1) % order.length]
    await updateAssignment(assignment.id, { status: next })
    if (next === 'submitted') showToast({ message: 'Assignment submitted', variant: 'success' })
  }

  function handleEdit(e) {
    e.stopPropagation()
    setMenuOpen(false)
    onEdit(assignment)
  }

  async function handleDelete(e) {
    e.stopPropagation()
    const { id, created_at, updated_at, ...snapshot } = assignment
    setMenuOpen(false)
    const { error } = await deleteAssignment(assignment.id)
    if (!error) showToast({ message: 'Deleted', actions: { label: 'Undo', onClick: () => addAssignment(snapshot) } })
  }

  async function handleComplete(e) {
    e.stopPropagation()
    setCompleting(true)
    const [{ data, error }] = await Promise.all([
      completeAssignmentInDB(assignment.id),
      new Promise((r) => setTimeout(r, 600)),
    ])
    if (error) { setCompleting(false); showToast({ message: 'Failed to complete', variant: 'error' }); return }
    markAssignmentCompleted(assignment.id, data)
    showToast({ message: 'Assignment completed', actions: { label: 'Undo', onClick: () => uncompleteAssignment(assignment.id) } })
  }

  async function handleNotesSave() {
    const trimmed = notesValue.trim()
    if (trimmed !== (assignment.notes || '').trim()) {
      await updateAssignment(assignment.id, { notes: trimmed || null })
    }
  }

  async function handleToggleItem(id) {
    const next = checklist.map((item) => item.id === id ? { ...item, completed: !item.completed } : item)
    setChecklist(next)
    await updateAssignment(assignment.id, { checklist: next })
  }

  async function handleAddItem() {
    const text = newItemText.trim()
    setAddingItem(false)
    setNewItemText('')
    if (!text) return
    const next = [...checklist, { id: uid(), title: text, completed: false }]
    setChecklist(next)
    await updateAssignment(assignment.id, { checklist: next })
  }

  async function handleDeleteItem(id) {
    const next = checklist.filter((item) => item.id !== id)
    setChecklist(next)
    await updateAssignment(assignment.id, { checklist: next })
  }

  return (
    <div
      className={`group/row transition-all duration-300 border-l-2 ${
        due24 && !overdue ? 'border-amber-400' : overdue ? 'border-rose-400' : 'border-transparent'
      } ${completing ? 'opacity-0' : 'opacity-100'}`}
      style={{ transition: completing ? 'opacity 600ms ease' : undefined }}
    >
      {/* ── Main row ── */}
      <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
        <button onClick={handleComplete}
          className="flex-shrink-0 text-gray-300 dark:text-gray-600 hover:text-indigo-400 transition-colors">
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

        {checklist.length > 0 && (
          <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums hidden sm:block">
            {completedCount}/{checklist.length}
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

        <button onClick={cycleStatus}
          className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${STATUS_STYLES[assignment.status]}`}>
          {statusLabel}
        </button>

        {/* Expand toggle */}
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded(v => !v) }}
          title={expanded ? 'Collapse' : 'Notes & checklist'}
          className={`p-1 rounded-md transition-all ${
            expanded
              ? 'text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20'
              : hasContent
                ? 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                : 'opacity-0 group-hover/row:opacity-100 text-gray-300 dark:text-gray-700 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          <ChevronDown size={12} style={{ transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.15s' }} />
        </button>

        {/* Three-dot menu */}
        <div className="relative">
          <button ref={menuBtnRef} onClick={toggleMenu}
            className="opacity-0 group-hover/row:opacity-100 p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all">
            <MoreHorizontal size={15} />
          </button>

          {menuOpen && menuPos && createPortal(
            <div ref={menuContentRef}
              style={{ position: 'fixed', top: menuPos.top, right: menuPos.right, zIndex: 9999, pointerEvents: 'auto' }}
              className="w-40 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl shadow-xl py-1">
              <button onClick={handleEdit} style={{ pointerEvents: 'auto' }}
                className="w-full text-left px-3 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                Edit assignment
              </button>
              <button onClick={handleDelete} style={{ pointerEvents: 'auto' }}
                className="w-full text-left px-3 py-2 text-xs text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20">
                Delete
              </button>
            </div>,
            document.body
          )}
        </div>
      </div>

      {/* ── Expanded detail panel ── */}
      {expanded && (
        <div className="border-t border-gray-100 dark:border-gray-800/60 bg-gray-50/60 dark:bg-gray-800/20"
          style={{ paddingLeft: 44, paddingRight: 16, paddingBottom: 12, paddingTop: 10 }}>

          {/* Notes */}
          <div style={{ marginBottom: 10 }}>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-600 mb-1.5">Notes</p>
            {notesFocused ? (
              <textarea
                autoFocus
                value={notesValue}
                onChange={(e) => setNotesValue(e.target.value)}
                onBlur={() => { setNotesFocused(false); handleNotesSave() }}
                placeholder="Add a note…"
                rows={notesValue ? Math.min(Math.max(notesValue.split('\n').length, 1), 6) : 2}
                className="w-full text-sm text-gray-700 dark:text-gray-300 bg-transparent border-0 outline-none resize-none placeholder:text-gray-300 dark:placeholder:text-gray-700 leading-relaxed"
              />
            ) : notesValue ? (
              <div
                onClick={() => setNotesFocused(true)}
                className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed cursor-text prose-notes"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(notesValue) }}
              />
            ) : (
              <div
                onClick={() => setNotesFocused(true)}
                className="text-sm text-gray-300 dark:text-gray-700 cursor-text"
              >
                Add a note…
              </div>
            )}
          </div>

          {/* Checklist */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-600">
                Checklist
                {checklist.length > 0 && (
                  <span className="ml-1.5 normal-case tracking-normal font-normal text-gray-400 dark:text-gray-500">
                    {completedCount}/{checklist.length}
                  </span>
                )}
              </p>
              <button
                onClick={() => setAddingItem(true)}
                className="flex items-center gap-0.5 text-[11px] text-gray-400 dark:text-gray-500 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors"
              >
                <Plus size={11} /> Add item
              </button>
            </div>

            <div className="space-y-1">
              {checklist.map((item) => (
                <div key={item.id} className="group/ci flex items-center gap-2">
                  <button
                    onClick={() => handleToggleItem(item.id)}
                    className={`flex-shrink-0 flex items-center justify-center rounded-full border-2 transition-all ${
                      item.completed ? 'bg-indigo-500 border-indigo-500' : 'border-gray-300 dark:border-gray-600 hover:border-indigo-400'
                    }`}
                    style={{ width: 13, height: 13 }}
                  >
                    {item.completed && (
                      <svg width="6" height="5" viewBox="0 0 8 6" fill="none">
                        <path d="M1 3L3 5L7 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                  <span
                    className={`flex-1 text-xs leading-snug ${
                      item.completed ? 'line-through text-gray-400 dark:text-gray-600' : 'text-gray-700 dark:text-gray-300'
                    }`}
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(item.title) }}
                  />
                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    className="opacity-0 group-hover/ci:opacity-100 text-gray-300 dark:text-gray-700 hover:text-rose-400 transition-all"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              ))}

              {addingItem && (
                <div className="flex items-center gap-2">
                  <div className="flex-shrink-0 rounded-full border-2 border-gray-300 dark:border-gray-600" style={{ width: 13, height: 13 }} />
                  <input
                    ref={newItemRef}
                    value={newItemText}
                    onChange={(e) => setNewItemText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); handleAddItem() }
                      if (e.key === 'Escape') { setAddingItem(false); setNewItemText('') }
                    }}
                    onBlur={handleAddItem}
                    placeholder="New item…"
                    className="flex-1 text-xs bg-transparent border-0 outline-none text-gray-700 dark:text-gray-300 placeholder:text-gray-300 dark:placeholder:text-gray-700"
                  />
                </div>
              )}

              {!addingItem && checklist.length === 0 && (
                <button
                  onClick={() => setAddingItem(true)}
                  className="text-xs text-gray-300 dark:text-gray-700 hover:text-gray-500 dark:hover:text-gray-500 transition-colors"
                >
                  + Add first item
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
