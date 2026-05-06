import { useState, useEffect } from 'react'
import { Plus, CheckSquare, List, Calendar, Hash, MoreHorizontal, Pencil, Trash2, Inbox } from 'lucide-react'
import { useTaskStore } from '../../stores/useTaskStore'
import { useAuthStore } from '../../stores/useAuthStore'
import { getColorByValue } from '../../lib/constants'
import EmptyState from '../../components/ui/EmptyState'
import ListModal from './ListModal'
import TaskModal from './TaskModal'
import TaskRow from './TaskRow'
import { isValid } from 'date-fns'

const VIEWS = [
  { id: 'bydate', label: 'By Due Date', icon: Calendar },
  { id: 'bylist', label: 'By List', icon: List },
  { id: 'nodate', label: 'No Date', icon: Hash },
]

export default function Tasks() {
  const { user } = useAuthStore()
  const { lists, tasks, fetchLists, fetchTasks, deleteList } = useTaskStore()
  const [view, setView] = useState('bydate')
  const [listModalOpen, setListModalOpen] = useState(false)
  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const [editList, setEditList] = useState(null)
  const [editTask, setEditTask] = useState(null)
  const [defaultListId, setDefaultListId] = useState(null)
  const [listMenuOpen, setListMenuOpen] = useState(null)
  const [activeListFilter, setActiveListFilter] = useState('all')

  useEffect(() => {
    if (user) {
      fetchLists(user.id)
      fetchTasks(user.id)
    }
  }, [user])

  const INBOX_LIST = { id: 'inbox', name: 'Inbox', color: '#6b7280' }
  const allLists = [INBOX_LIST, ...lists]

  function openNewTask(listId = null) {
    setEditTask(null)
    setDefaultListId(listId)
    setTaskModalOpen(true)
  }

  const activeTasks = tasks.filter((t) => !t.completed)
  const tasksWithDate = activeTasks
    .filter((t) => t.due_date)
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
  const tasksWithoutDate = activeTasks.filter((t) => !t.due_date)

  function getListData(task) {
    if (!task.list_id) return INBOX_LIST
    return lists.find((l) => l.id === task.list_id) || INBOX_LIST
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-8 pt-8 pb-6 border-b border-gray-100 dark:border-gray-800/60 flex-shrink-0">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center">
              <CheckSquare size={18} className="text-teal-500" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Tasks</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { setEditList(null); setListModalOpen(true) }} className="btn-ghost text-xs">
              <Plus size={14} />
              New list
            </button>
            <button onClick={() => openNewTask()} className="btn-primary text-xs">
              <Plus size={14} />
              Add task
            </button>
          </div>
        </div>

        {/* Views */}
        <div className="flex gap-1">
          {VIEWS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setView(id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                view === id
                  ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* List sidebar */}
        <div className="w-44 flex-shrink-0 border-r border-gray-100 dark:border-gray-800/60 px-3 py-4 space-y-0.5 overflow-y-auto">
          <button
            onClick={() => setActiveListFilter('all')}
            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeListFilter === 'all'
                ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'
            }`}
          >
            <CheckSquare size={13} />
            All tasks
            <span className="ml-auto text-gray-400 tabular-nums">{activeTasks.length}</span>
          </button>
          {allLists.map((list) => {
            const count = activeTasks.filter((t) =>
              list.id === 'inbox' ? !t.list_id : t.list_id === list.id
            ).length
            const colorObj = getColorByValue(list.color)
            return (
              <div key={list.id} className="group relative">
                <button
                  onClick={() => setActiveListFilter(list.id)}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    activeListFilter === list.id
                      ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: list.color }} />
                  <span className="truncate">{list.name}</span>
                  <span className="ml-auto text-gray-400 tabular-nums">{count}</span>
                </button>
                {list.id !== 'inbox' && (
                  <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100">
                    <div className="relative">
                      <button
                        onClick={(e) => { e.stopPropagation(); setListMenuOpen(listMenuOpen === list.id ? null : list.id) }}
                        className="p-0.5 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        <MoreHorizontal size={12} />
                      </button>
                      {listMenuOpen === list.id && (
                        <div className="absolute right-0 top-6 z-10 w-28 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl shadow-lg py-1 animate-fade-in">
                          <button
                            onClick={() => { setEditList(list); setListModalOpen(true); setListMenuOpen(null) }}
                            className="w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2"
                          >
                            <Pencil size={11} /> Edit
                          </button>
                          <button
                            onClick={async () => { await deleteList(list.id); setListMenuOpen(null) }}
                            className="w-full text-left px-3 py-1.5 text-xs text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 flex items-center gap-2"
                          >
                            <Trash2 size={11} /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          {(() => {
            const filtered = activeListFilter === 'all'
              ? activeTasks
              : activeListFilter === 'inbox'
              ? activeTasks.filter((t) => !t.list_id)
              : activeTasks.filter((t) => t.list_id === activeListFilter)

            if (filtered.length === 0) {
              return (
                <EmptyState
                  icon={CheckSquare}
                  title="All clear"
                  description="No tasks here. Add one to get started."
                  action={
                    <button onClick={() => openNewTask(activeListFilter !== 'all' && activeListFilter !== 'inbox' ? activeListFilter : null)} className="btn-primary text-sm">
                      <Plus size={15} />
                      Add task
                    </button>
                  }
                />
              )
            }

            if (view === 'bydate') {
              const withDate = filtered.filter((t) => t.due_date).sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
              const withoutDate = filtered.filter((t) => !t.due_date)
              return (
                <div className="space-y-4">
                  {withDate.length > 0 && (
                    <div className="card overflow-hidden">
                      <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Scheduled</span>
                      </div>
                      <div className="divide-y divide-gray-50 dark:divide-gray-800/60">
                        {withDate.map((t) => (
                          <TaskRow key={t.id} task={t} listData={getListData(t)} onEdit={(task) => { setEditTask(task); setTaskModalOpen(true) }} />
                        ))}
                      </div>
                    </div>
                  )}
                  {withoutDate.length > 0 && (
                    <div className="card overflow-hidden">
                      <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">No date</span>
                      </div>
                      <div className="divide-y divide-gray-50 dark:divide-gray-800/60">
                        {withoutDate.map((t) => (
                          <TaskRow key={t.id} task={t} listData={getListData(t)} onEdit={(task) => { setEditTask(task); setTaskModalOpen(true) }} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            }

            if (view === 'bylist') {
              const listsToShow = activeListFilter === 'all' ? allLists : allLists.filter((l) => l.id === activeListFilter)
              return (
                <div className="space-y-4">
                  {listsToShow.map((list) => {
                    const listTasks = filtered.filter((t) =>
                      list.id === 'inbox' ? !t.list_id : t.list_id === list.id
                    )
                    if (listTasks.length === 0) return null
                    return (
                      <div key={list.id} className="card overflow-hidden">
                        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 dark:border-gray-800" style={{ borderLeftColor: list.color, borderLeftWidth: 3 }}>
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: list.color }} />
                          <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">{list.name}</span>
                          <span className="text-xs text-gray-400 ml-1">{listTasks.length}</span>
                          <button onClick={() => openNewTask(list.id !== 'inbox' ? list.id : null)} className="ml-auto btn-ghost text-xs py-0.5">
                            <Plus size={12} /> Add
                          </button>
                        </div>
                        <div className="divide-y divide-gray-50 dark:divide-gray-800/60">
                          {listTasks.map((t) => (
                            <TaskRow key={t.id} task={t} listData={list} onEdit={(task) => { setEditTask(task); setTaskModalOpen(true) }} />
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            }

            if (view === 'nodate') {
              const noDate = filtered.filter((t) => !t.due_date)
              if (noDate.length === 0) {
                return <EmptyState icon={Hash} title="No tasks without a date" description="All your tasks have due dates!" />
              }
              return (
                <div className="card overflow-hidden">
                  <div className="divide-y divide-gray-50 dark:divide-gray-800/60">
                    {noDate.map((t) => (
                      <TaskRow key={t.id} task={t} listData={getListData(t)} onEdit={(task) => { setEditTask(task); setTaskModalOpen(true) }} />
                    ))}
                  </div>
                </div>
              )
            }
          })()}
        </div>
      </div>

      <ListModal
        isOpen={listModalOpen}
        onClose={() => { setListModalOpen(false); setEditList(null) }}
        editList={editList}
      />
      <TaskModal
        isOpen={taskModalOpen}
        onClose={() => { setTaskModalOpen(false); setEditTask(null) }}
        editTask={editTask}
        defaultListId={defaultListId}
      />
    </div>
  )
}
