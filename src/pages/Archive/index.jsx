import { useEffect, useMemo, useState } from 'react'
import { Archive as ArchiveIcon, CheckCircle2, RotateCcw } from 'lucide-react'
import { isToday, isYesterday, isAfter, subDays, startOfDay, format } from 'date-fns'
import { useTaskStore } from '../../stores/useTaskStore'
import { useSchoolStore } from '../../stores/useSchoolStore'
import { useAuthStore } from '../../stores/useAuthStore'
import { showToast } from '../../lib/toast'
import { cn } from '../../lib/utils'
import ColorPill from '../../components/ui/ColorPill'
import { getTypeByValue, TYPE_PILL_STYLES } from '../../lib/constants'

function groupByDate(items) {
  const groups = { Today: [], Yesterday: [], 'This week': [], Earlier: [] }
  const weekAgo = startOfDay(subDays(new Date(), 7))

  for (const item of items) {
    const d = new Date(item.completed_at || item.updated_at)
    if (isToday(d)) groups['Today'].push(item)
    else if (isYesterday(d)) groups['Yesterday'].push(item)
    else if (isAfter(d, weekAgo)) groups['This week'].push(item)
    else groups['Earlier'].push(item)
  }
  return groups
}

function SpacePill({ space }) {
  const colors = {
    tasks: 'bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400',
    school: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400',
  }
  return (
    <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-medium ${colors[space]}`}>
      {space === 'tasks' ? 'Tasks' : 'School'}
    </span>
  )
}

function ArchiveRow({ item, onUndo }) {
  const typeObj = item.type ? getTypeByValue(item.type) : null
  const accentColor = item.space === 'school' ? 'oklch(0.72 0.14 295)' : 'oklch(0.72 0.14 150)'

  return (
    <div className="task task-done" style={{ cursor: 'default' }}>
      <div className="task-grip" />
      <div
        className="cb cb-on"
        style={{ background: accentColor, borderColor: accentColor }}
      >
        <span className="cb-inner">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12l5 5L20 7" />
          </svg>
        </span>
      </div>
      <div className="prio prio-low" />
      <div className="task-main">
        <div className="task-title">{item.title}</div>
        <div className="task-meta">
          {item.context && (
            <span className="meta-list">
              {item.classColor && (
                <span style={{ width: 6, height: 6, borderRadius: 999, background: item.classColor, display: 'inline-block' }} />
              )}
              {item.context}
            </span>
          )}
          {typeObj && (
            <span style={{ fontSize: 10.5 }}>{typeObj.label}</span>
          )}
        </div>
      </div>
      <div
        className="task-due done-time"
        style={{ color: 'var(--fg-4)', background: 'transparent', border: 'none', fontSize: 11 }}
      >
        {format(new Date(item.completed_at || item.updated_at), 'MMM d')}
      </div>
      <button
        onClick={() => onUndo(item)}
        className="row-more"
        style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--fg-3)', background: 'none', border: 0 }}
      >
        <RotateCcw size={12} />
        Undo
      </button>
    </div>
  )
}

export default function Archive() {
  const { user, profile } = useAuthStore()
  const showSchool = profile?.show_school ?? true
  const { tasks, lists, fetchTasks, fetchLists, toggleTask } = useTaskStore()
  const { assignments, classes, fetchAssignments, fetchClasses, uncompleteAssignment } = useSchoolStore()
  const [spaceFilter, setSpaceFilter] = useState('all')

  // Reset filter to 'all' if school is turned off while 'school' filter is active
  useEffect(() => {
    if (!showSchool && spaceFilter === 'school') setSpaceFilter('all')
  }, [showSchool])

  useEffect(() => {
    if (!user) return
    fetchTasks(user.id)
    fetchLists(user.id)
    if (showSchool) {
      fetchAssignments(user.id)
      fetchClasses(user.id)
    }
  }, [user, showSchool])

  const completedItems = useMemo(() => {
    const taskItems = tasks
      .filter((t) => t.completed && t.completed_at)
      .map((t) => {
        const list = lists.find((l) => l.id === t.list_id)
        return {
          id: t.id,
          title: t.title,
          space: 'tasks',
          context: list?.name || null,
          completed_at: t.completed_at,
          updated_at: t.updated_at,
        }
      })

    const assignmentItems = showSchool
      ? assignments
          .filter((a) => a.completed && a.completed_at)
          .map((a) => {
            const cls = classes.find((c) => c.id === a.class_id)
            return {
              id: a.id,
              title: a.title,
              space: 'school',
              context: cls?.name || null,
              classColor: cls?.color || null,
              type: a.type || null,
              completed_at: a.completed_at,
              updated_at: a.updated_at,
            }
          })
      : []

    return [...taskItems, ...assignmentItems].sort(
      (a, b) => new Date(b.completed_at) - new Date(a.completed_at)
    )
  }, [tasks, lists, assignments, classes, showSchool])

  const weekCount = useMemo(() => {
    const weekAgo = startOfDay(subDays(new Date(), 7))
    return completedItems.filter((i) => isAfter(new Date(i.completed_at), weekAgo)).length
  }, [completedItems])

  const filteredItems = useMemo(
    () => spaceFilter === 'all' ? completedItems : completedItems.filter((i) => i.space === spaceFilter),
    [completedItems, spaceFilter]
  )

  const groups = useMemo(() => groupByDate(filteredItems), [filteredItems])
  const groupOrder = ['Today', 'Yesterday', 'This week', 'Earlier']

  async function handleUndo(item) {
    if (item.space === 'tasks') {
      await toggleTask(item.id, false)
      showToast({ message: 'Task restored' })
    } else {
      await uncompleteAssignment(item.id)
      showToast({ message: 'Assignment restored' })
    }
  }

  const hasAny = filteredItems.length > 0

  const filterTabs = [
    { id: 'all', label: 'All' },
    { id: 'tasks', label: 'Tasks' },
    ...(showSchool ? [{ id: 'school', label: 'School' }] : []),
  ]

  return (
    <div className="page" style={{ maxWidth: 1100 }}>
      {/* Header */}
      <div className="page-head">
        <div>
          <div className="crumbs">
            <span style={{ width: 8, height: 8, borderRadius: 999, background: 'oklch(0.55 0.04 250)', display: 'inline-block' }} />
            <span>Archive</span>
          </div>
          <h1>Archive</h1>
          {completedItems.length > 0 && (
            <div className="page-sub">
              <span className="muted">{weekCount} completed this week</span>
            </div>
          )}
        </div>
        {/* Space filter tabs */}
        <div style={{ display: 'flex', gap: 4 }}>
          <div className="seg">
            {filterTabs.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setSpaceFilter(id)}
                className={`seg-btn${spaceFilter === id ? ' on' : ''}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      {!hasAny ? (
        <div className="ds-empty" style={{ marginTop: 24 }}>
          <div className="ds-empty-mark">
            <ArchiveIcon size={22} />
          </div>
          <div className="ds-empty-title">Nothing archived yet</div>
          <div className="ds-empty-sub">Completed tasks and assignments will appear here.</div>
        </div>
      ) : (
        <div className="task-body">
          {groupOrder.map((label) => {
            const items = groups[label]
            if (!items || items.length === 0) return null
            return (
              <div className="task-group" key={label}>
                <div className="group-head">
                  <h3>{label}</h3>
                  <span className="group-count">{items.length}</span>
                  <div className="group-rule" />
                </div>
                <div className="task-list">
                  {items.map((item) => (
                    <ArchiveRow key={`${item.space}-${item.id}`} item={item} onUndo={handleUndo} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
