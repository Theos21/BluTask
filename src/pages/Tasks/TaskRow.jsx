import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Clock, MoreHorizontal, RefreshCw, ChevronDown, Plus, Trash2 } from 'lucide-react'
import PriorityDot from '../../components/ui/PriorityDot'
import { formatDueDate, isDueWithin24Hours, isOverdue } from '../../lib/utils'
import { useTaskStore } from '../../stores/useTaskStore'
import { useTagStore } from '../../stores/useTagStore'
import { showToast } from '../../lib/toast'
import { renderMarkdown } from '../../lib/markdown'

const PRIORITY_BORDER = {
  urgent:    'border-rose-500',
  important: 'border-amber-400',
  normal:    'border-transparent',
}

export default function TaskRow({ task, listData, onEdit, onTagClick, showListName = false }) {
  const {
    toggleTask, deleteTask, addTask, updateTask,
    checklistItems, fetchChecklistItems, toggleChecklistItem, addChecklistItem, deleteChecklistItem,
  } = useTaskStore()
  const { tags, taskTags } = useTagStore()

  const [menuOpen, setMenuOpen] = useState(false)
  const [menuPos, setMenuPos] = useState(null)
  const menuBtnRef = useRef(null)
  const menuContentRef = useRef(null)

  const [expanded, setExpanded] = useState(false)
  const [notesValue, setNotesValue] = useState(task.notes || '')
  const [notesFocused, setNotesFocused] = useState(false)
  const [addingItem, setAddingItem] = useState(false)
  const [newItemText, setNewItemText] = useState('')
  const newItemRef = useRef(null)

  const due24 = isDueWithin24Hours(task.due_date)
  const overdue = isOverdue(task.due_date) && !task.completed
  const items = checklistItems[task.id] || []
  const completedItems = items.filter((i) => i.completed).length

  const taskTagIds = taskTags[task.id] || []
  const taskTagObjects = tags.filter((t) => taskTagIds.includes(t.id))

  const hasContent = !!(task.notes || items.length > 0)

  // Lazy-load checklist items the first time this row is expanded
  useEffect(() => {
    if (expanded && checklistItems[task.id] === undefined) {
      fetchChecklistItems(task.id)
    }
  }, [expanded])

  // Sync notes from task only when the identity of the task changes
  useEffect(() => {
    setNotesValue(task.notes || '')
  }, [task.id])

  useEffect(() => {
    if (addingItem) newItemRef.current?.focus()
  }, [addingItem])

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

  async function handleNotesSave() {
    const trimmed = notesValue.trim()
    if (trimmed !== (task.notes || '').trim()) {
      await updateTask(task.id, { notes: trimmed || null })
    }
  }

  async function handleAddItem() {
    const text = newItemText.trim()
    setAddingItem(false)
    setNewItemText('')
    if (!text) return
    await addChecklistItem({ task_id: task.id, title: text, completed: false, position: items.length })
  }

  const borderClass = task.completed
    ? 'border-transparent opacity-60'
    : PRIORITY_BORDER[task.priority] || 'border-transparent'

  return (
    <div className={`group/row border-l-2 ${borderClass}`}>
      {/* ── Main row ── */}
      <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
        {/* Checkbox */}
        <button
          onClick={() => {
            const completing = !task.completed
            toggleTask(task.id, completing)
            if (completing) showToast({ message: 'Task completed', variant: 'success', actions: { label: 'Undo', onClick: () => toggleTask(task.id, false) } })
          }}
          className={`flex-shrink-0 flex items-center justify-center rounded-full border-2 transition-all ${
            task.completed ? 'bg-teal-500 border-teal-500' : 'border-gray-300 dark:border-gray-600 hover:border-teal-400'
          }`}
          style={{ width: 16, height: 16 }}
        >
          {task.completed && (
            <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
              <path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>

        {/* Title + tags */}
        <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
          <span className={`text-sm font-medium truncate ${
            task.completed ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-800 dark:text-gray-200'
          }`}>
            {task.title}
          </span>

          {showListName && listData && listData.id !== 'inbox' && (
            <span className="text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0"
              style={{ backgroundColor: listData.color + '20', color: listData.color }}>
              {listData.name}
            </span>
          )}

          {taskTagObjects.slice(0, 3).map((tag) => {
            const c = tag.color || '#6366f1'
            return (
              <button key={tag.id} type="button"
                onClick={onTagClick ? (e) => { e.stopPropagation(); onTagClick(tag.id) } : undefined}
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 leading-none ${onTagClick ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
                style={{ backgroundColor: c + '28', color: c, border: `1px solid ${c}55`, lineHeight: '16px' }}>
                {tag.name}
              </button>
            )
          })}
          {taskTagObjects.length > 3 && (
            <span className="text-[10px] px-1.5 rounded-full font-medium flex-shrink-0 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400" style={{ lineHeight: '16px' }}>
              +{taskTagObjects.length - 3}
            </span>
          )}
        </div>

        {/* Right metadata */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {items.length > 0 && (
            <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">{completedItems}/{items.length}</span>
          )}
          {task.repeat_rule && <RefreshCw size={11} className="text-gray-400 dark:text-gray-500" />}
          {task.due_date && (
            <span className={`flex items-center gap-1 text-xs ${
              task.completed ? 'text-gray-400' : overdue ? 'text-rose-500' : due24 ? 'text-amber-500' : 'text-gray-400 dark:text-gray-500'
            }`}>
              <Clock size={10} />
              {formatDueDate(task.due_date)}
            </span>
          )}

          {/* Expand toggle */}
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded(v => !v) }}
            title={expanded ? 'Collapse' : 'Notes & checklist'}
            className={`p-1 rounded-md transition-all ${
              expanded
                ? 'text-teal-500 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20'
                : hasContent
                  ? 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  : 'opacity-0 group-hover/row:opacity-100 text-gray-300 dark:text-gray-700 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <ChevronDown size={12} style={{ transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.15s' }} />
          </button>

          {/* Three-dot menu */}
          <button
            ref={menuBtnRef}
            onClick={toggleMenu}
            className="opacity-0 group-hover/row:opacity-100 p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
          >
            <MoreHorizontal size={14} />
          </button>
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
                {items.length > 0 && (
                  <span className="ml-1.5 normal-case tracking-normal font-normal text-gray-400 dark:text-gray-500">
                    {completedItems}/{items.length}
                  </span>
                )}
              </p>
              <button
                onClick={() => setAddingItem(true)}
                className="flex items-center gap-0.5 text-[11px] text-gray-400 dark:text-gray-500 hover:text-teal-500 dark:hover:text-teal-400 transition-colors"
              >
                <Plus size={11} /> Add item
              </button>
            </div>

            <div className="space-y-1">
              {items.map((item) => (
                <div key={item.id} className="group/ci flex items-center gap-2">
                  <button
                    onClick={() => toggleChecklistItem(task.id, item.id, !item.completed)}
                    className={`flex-shrink-0 flex items-center justify-center rounded-full border-2 transition-all ${
                      item.completed ? 'bg-teal-500 border-teal-500' : 'border-gray-300 dark:border-gray-600 hover:border-teal-400'
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
                    onClick={() => deleteChecklistItem(task.id, item.id)}
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

              {!addingItem && items.length === 0 && (
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

      {/* Portal context menu */}
      {menuOpen && menuPos && createPortal(
        <div ref={menuContentRef}
          style={{ position: 'fixed', top: menuPos.top, right: menuPos.right, zIndex: 9999 }}
          className="w-32 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl shadow-xl py-1">
          <button onClick={handleEdit}
            className="w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
            Edit
          </button>
          <button onClick={handleDelete}
            className="w-full text-left px-3 py-1.5 text-xs text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20">
            Delete
          </button>
        </div>,
        document.body
      )}
    </div>
  )
}
