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

  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors group">
      <CheckCircle2
        size={16}
        className="flex-shrink-0"
        style={{ color: item.space === 'school' ? '#6366f1' : '#14b8a6' }}
      />

      <span className="flex-1 text-sm text-gray-500 dark:text-gray-400 line-through truncate">
        {item.title}
      </span>

      {item.space === 'school' ? (
        <>
          {item.classColor && (
            <ColorPill color={item.classColor} name={item.context || ''} size="xs" />
          )}
          {typeObj && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium capitalize flex-shrink-0 hidden sm:block ${TYPE_PILL_STYLES[typeObj.category] || TYPE_PILL_STYLES.general}`}>
              {typeObj.label}
            </span>
          )}
        </>
      ) : (
        <>
          <SpacePill space={item.space} />
          {item.context && (
            <span className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[100px] hidden sm:block">
              {item.context}
            </span>
          )}
        </>
      )}

      <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums flex-shrink-0 hidden sm:block">
        {format(new Date(item.completed_at || item.updated_at), 'MMM d, h:mm a')}
      </span>

      <button
        onClick={() => onUndo(item)}
        className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-all flex-shrink-0"
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
    <div className="max-w-[1200px] mx-auto w-full h-full flex flex-col">
      {/* Header */}
      <div className="px-8 pt-8 pb-6 border-b border-gray-100 dark:border-gray-800/60 flex-shrink-0">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <ArchiveIcon size={16} className="text-gray-500 dark:text-gray-400" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Archive</h1>
          </div>
          {completedItems.length > 0 && (
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {weekCount} completed this week
            </span>
          )}
        </div>

        {/* Space filter tabs */}
        <div className="flex gap-1">
          {filterTabs.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setSpaceFilter(id)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                spaceFilter === id
                  ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        {!hasAny ? (
          <div className="flex flex-col items-center justify-center h-full text-center pb-16">
            <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
              <ArchiveIcon size={22} className="text-gray-400 dark:text-gray-500" />
            </div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Nothing archived yet</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 max-w-xs">
              Completed tasks and assignments will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {groupOrder.map((label) => {
              const items = groups[label]
              if (!items || items.length === 0) return null
              return (
                <div key={label}>
                  <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 px-1">
                    {label}
                  </p>
                  <div className="card overflow-hidden divide-y divide-gray-50 dark:divide-gray-800/60">
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
    </div>
  )
}
