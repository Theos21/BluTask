import { useState, useEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { Search, CheckSquare, GraduationCap, Clock, List, X } from 'lucide-react'
import { useTaskStore } from '../stores/useTaskStore'
import { useSchoolStore } from '../stores/useSchoolStore'
import { useWatchStore } from '../stores/useWatchStore'
import { format } from 'date-fns'

const RECENT_KEY = 'blutask_recent'
const MAX_RECENT = 5

function loadRecent() {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]') } catch { return [] }
}

export function saveRecent(item) {
  const existing = loadRecent().filter(r => !(r.id === item.id && r.type === item.type))
  const next = [item, ...existing].slice(0, MAX_RECENT)
  localStorage.setItem(RECENT_KEY, JSON.stringify(next))
}

function match(str, q) {
  return str?.toLowerCase().includes(q.toLowerCase())
}

function ResultRow({ result, active, onClick }) {
  const ref = useRef(null)
  useEffect(() => {
    if (active) ref.current?.scrollIntoView({ block: 'nearest' })
  }, [active])

  return (
    <button
      ref={ref}
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
        active
          ? 'bg-gray-100 dark:bg-gray-800'
          : 'hover:bg-gray-50 dark:hover:bg-gray-800/60'
      }`}
    >
      <span className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center"
        style={{ backgroundColor: result.iconBg }}>
        <result.Icon size={13} style={{ color: result.iconColor }} />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{result.title}</p>
        {result.sub && (
          <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{result.sub}</p>
        )}
      </div>
      {result.badge && (
        <span
          className="flex-shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full"
          style={{ backgroundColor: result.badge.bg, color: result.badge.color }}
        >
          {result.badge.label}
        </span>
      )}
    </button>
  )
}

export default function CommandPalette({ isOpen, onClose }) {
  const navigate = useNavigate()
  const { tasks, lists } = useTaskStore()
  const { assignments, classes } = useSchoolStore()
  const { shows } = useWatchStore()

  const [query, setQuery] = useState('')
  const [activeIdx, setActiveIdx] = useState(0)
  const inputRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setActiveIdx(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  const results = useMemo(() => {
    if (!query.trim()) return []
    const q = query.trim()
    const items = []

    // Tasks
    tasks.filter(t => !t.completed && match(t.title, q)).slice(0, 5).forEach(t => {
      const list = lists.find(l => l.id === t.list_id)
      items.push({
        id: t.id,
        type: 'task',
        title: t.title,
        sub: list ? list.name : 'Inbox',
        badge: t.due_date ? { label: format(new Date(t.due_date), 'MMM d'), bg: '#f3f4f6', color: '#6b7280' } : null,
        Icon: CheckSquare,
        iconBg: '#f0fdf4',
        iconColor: '#16a34a',
        action: () => navigate('/tasks'),
      })
    })

    // Assignments
    assignments.filter(a => !a.submitted && match(a.title, q)).slice(0, 5).forEach(a => {
      const cls = classes.find(c => c.id === a.class_id)
      items.push({
        id: a.id,
        type: 'assignment',
        title: a.title,
        sub: cls?.name || 'Assignment',
        badge: cls ? { label: cls.name, bg: (cls.color || '#6366f1') + '20', color: cls.color || '#6366f1' } : null,
        Icon: GraduationCap,
        iconBg: '#eef2ff',
        iconColor: '#6366f1',
        action: () => navigate('/school'),
      })
    })

    // Shows
    shows.filter(s => match(s.title, q)).slice(0, 4).forEach(s => {
      items.push({
        id: s.id,
        type: 'show',
        title: s.title,
        sub: s.status ? s.status.replace(/_/g, ' ') : 'Show',
        Icon: Clock,
        iconBg: '#fffbeb',
        iconColor: '#d97706',
        action: () => navigate('/watch'),
      })
    })

    // Lists
    lists.filter(l => match(l.name, q)).slice(0, 3).forEach(l => {
      items.push({
        id: l.id,
        type: 'list',
        title: l.name,
        sub: 'List',
        Icon: List,
        iconBg: l.color ? l.color + '20' : '#f3f4f6',
        iconColor: l.color || '#6b7280',
        action: () => navigate('/tasks'),
      })
    })

    return items
  }, [query, tasks, assignments, shows, lists, classes])

  const displayItems = query.trim() ? results : loadRecent().map(r => ({
    ...r,
    Icon: r.type === 'task' ? CheckSquare : r.type === 'assignment' ? GraduationCap : r.type === 'show' ? Clock : List,
    iconBg: r.type === 'task' ? '#f0fdf4' : r.type === 'assignment' ? '#eef2ff' : r.type === 'show' ? '#fffbeb' : '#f3f4f6',
    iconColor: r.type === 'task' ? '#16a34a' : r.type === 'assignment' ? '#6366f1' : r.type === 'show' ? '#d97706' : '#6b7280',
  }))

  function select(item) {
    saveRecent({ id: item.id, type: item.type, title: item.title, sub: item.sub })
    item.action?.()
    onClose()
  }

  useEffect(() => {
    setActiveIdx(0)
  }, [query])

  useEffect(() => {
    if (!isOpen) return
    function onKey(e) {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIdx(i => Math.min(i + 1, displayItems.length - 1))
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIdx(i => Math.max(i - 1, 0))
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        const item = displayItems[activeIdx]
        if (item) select(item)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, displayItems, activeIdx])

  if (!isOpen) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh]"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60" />

      {/* Panel */}
      <div className="relative w-full max-w-xl mx-4 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">

        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100 dark:border-gray-800">
          <Search size={16} className="text-gray-400 flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search tasks, assignments, shows, lists…"
            className="flex-1 text-sm bg-transparent outline-none text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <X size={14} />
            </button>
          )}
          <kbd className="hidden sm:flex items-center gap-0.5 text-[10px] text-gray-400 border border-gray-200 dark:border-gray-700 rounded px-1.5 py-0.5 font-mono">
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto py-1">
          {displayItems.length === 0 && query.trim() && (
            <p className="px-4 py-8 text-sm text-gray-400 dark:text-gray-500 italic text-center">
              No results for &ldquo;{query}&rdquo;
            </p>
          )}
          {displayItems.length === 0 && !query.trim() && (
            <p className="px-4 py-8 text-sm text-gray-400 dark:text-gray-500 italic text-center">
              Start typing to search…
            </p>
          )}
          {displayItems.length > 0 && !query.trim() && (
            <p className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
              Recent
            </p>
          )}
          {displayItems.map((item, i) => (
            <ResultRow
              key={`${item.type}-${item.id}`}
              result={item}
              active={i === activeIdx}
              onClick={() => select(item)}
            />
          ))}
        </div>

        {/* Footer */}
        {displayItems.length > 0 && (
          <div className="border-t border-gray-100 dark:border-gray-800 px-4 py-2 flex items-center gap-3 text-[10px] text-gray-400 dark:text-gray-500">
            <span><kbd className="font-mono">↑↓</kbd> navigate</span>
            <span><kbd className="font-mono">↵</kbd> open</span>
            <span><kbd className="font-mono">Esc</kbd> close</span>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
