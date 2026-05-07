import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Plus, CheckSquare, Inbox, ChevronRight, ChevronDown, Tag, Trash2, Upload, ArrowUpDown, Filter } from 'lucide-react'
import { isPast, isToday } from 'date-fns'
import { useTaskStore } from '../../stores/useTaskStore'
import { useAuthStore } from '../../stores/useAuthStore'
import { useFolderStore } from '../../stores/useFolderStore'
import { useTagStore } from '../../stores/useTagStore'
import FolderModal from './FolderModal'
import ListModal from './ListModal'
import TaskModal from './TaskModal'
import TaskRow from './TaskRow'
import TasksSmartImportModal from './SmartImportModal'

function ListNavItem({ active, onClick, onContextMenu, color, name, count }) {
  return (
    <button
      onClick={onClick}
      onContextMenu={onContextMenu}
      className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-colors text-left ${
        active
          ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 font-medium'
          : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/60 hover:text-gray-700 dark:hover:text-gray-300'
      }`}
    >
      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
      <span className="flex-1 truncate">{name}</span>
      {count > 0 && <span className="tabular-nums text-gray-400 dark:text-gray-500 text-[11px]">{count}</span>}
    </button>
  )
}

export default function Tasks() {
  const { user } = useAuthStore()
  const { lists, tasks, headers, fetchLists, fetchTasks, fetchHeaders, deleteList, addHeader, updateHeader, deleteHeader } = useTaskStore()
  const { folders, fetchFolders, updateFolder, deleteFolder } = useFolderStore()
  const { tags, taskTags, fetchTags, fetchTaskTags } = useTagStore()

  const [selectedView, setSelectedView] = useState({ type: 'inbox' })
  const [collapsedFolders, setCollapsedFolders] = useState(new Set())
  const [tagsCollapsed, setTagsCollapsed] = useState(false)
  const [sortBy, setSortBy] = useState('created') // 'created' | 'due' | 'priority' | 'name'
  const [filterBy, setFilterBy] = useState('all') // 'all' | 'overdue' | 'today' | 'upcoming'
  const [sortMenuOpen, setSortMenuOpen] = useState(false)
  const sortMenuRef = useRef(null)

  const [folderModalOpen, setFolderModalOpen] = useState(false)
  const [editFolder, setEditFolder] = useState(null)
  const [listModalOpen, setListModalOpen] = useState(false)
  const [editList, setEditList] = useState(null)
  const [defaultFolderId, setDefaultFolderId] = useState(null)
  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const [editTask, setEditTask] = useState(null)
  const [defaultListId, setDefaultListId] = useState(null)
  const [defaultHeaderId, setDefaultHeaderId] = useState(null)
  const [importModalOpen, setImportModalOpen] = useState(false)

  const [ctxMenu, setCtxMenu] = useState(null)
  const ctxMenuRef = useRef(null)

  const [addingHeader, setAddingHeader] = useState(false)
  const [newHeaderTitle, setNewHeaderTitle] = useState('')
  const [renamingHeaderId, setRenamingHeaderId] = useState(null)
  const [renameHeaderValue, setRenameHeaderValue] = useState('')

  useEffect(() => {
    if (user) {
      fetchFolders(user.id)
      fetchLists(user.id)
      fetchTasks(user.id)
      fetchHeaders(user.id)
      fetchTags(user.id)
      fetchTaskTags(user.id)
    }
  }, [user])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (folders.length === 0) return
    setCollapsedFolders(prev => {
      const next = new Set(prev)
      folders.forEach(f => { if (f.collapsed) next.add(f.id) })
      return next
    })
  }, [folders.map(f => f.id).join(',')])

  useEffect(() => {
    if (!ctxMenu) return
    function handle(e) {
      if (!ctxMenuRef.current?.contains(e.target)) setCtxMenu(null)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [ctxMenu])

  useEffect(() => {
    if (!sortMenuOpen) return
    function handle(e) {
      if (!sortMenuRef.current?.contains(e.target)) setSortMenuOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [sortMenuOpen])

  function openContextMenu(e, type, id) {
    e.preventDefault()
    e.stopPropagation()
    const x = Math.min(e.clientX, window.innerWidth - 164)
    const y = Math.min(e.clientY, window.innerHeight - 96)
    setCtxMenu({ type, id, x, y })
  }

  function toggleFolder(folderId) {
    setCollapsedFolders(prev => {
      const next = new Set(prev)
      const willCollapse = !next.has(folderId)
      if (willCollapse) next.add(folderId)
      else next.delete(folderId)
      updateFolder(folderId, { collapsed: willCollapse })
      return next
    })
  }

  const activeTasks = tasks.filter(t => !t.completed)

  const PRIORITY_ORDER = { urgent: 0, important: 1, normal: 2 }

  function applySort(list) {
    return [...list].sort((a, b) => {
      if (sortBy === 'due') {
        if (!a.due_date && !b.due_date) return 0
        if (!a.due_date) return 1
        if (!b.due_date) return -1
        return new Date(a.due_date) - new Date(b.due_date)
      }
      if (sortBy === 'priority') return (PRIORITY_ORDER[a.priority] ?? 2) - (PRIORITY_ORDER[b.priority] ?? 2)
      if (sortBy === 'name') return a.title.localeCompare(b.title)
      return 0 // 'created' — already in store order
    })
  }

  function applyFilter(list) {
    if (filterBy === 'all') return list
    if (filterBy === 'overdue') return list.filter(t => t.due_date && isPast(new Date(t.due_date)) && !isToday(new Date(t.due_date)))
    if (filterBy === 'today') return list.filter(t => t.due_date && isToday(new Date(t.due_date)))
    if (filterBy === 'upcoming') return list.filter(t => t.due_date && !isPast(new Date(t.due_date)))
    return list
  }

  function getListData(task) {
    if (!task.list_id) return { id: 'inbox', name: 'Inbox', color: '#6b7280' }
    return lists.find(l => l.id === task.list_id) || { id: 'inbox', name: 'Inbox', color: '#6b7280' }
  }

  function openNewTask(listId = null, headerId = null) {
    setEditTask(null)
    setDefaultListId(listId)
    setDefaultHeaderId(headerId)
    setTaskModalOpen(true)
  }

  async function handleAddHeader() {
    if (!newHeaderTitle.trim() || selectedView.type !== 'list') return
    const listId = selectedView.id
    const listHeaders = headers.filter(h => h.list_id === listId)
    await addHeader({ user_id: user.id, list_id: listId, title: newHeaderTitle.trim(), position: listHeaders.length })
    setNewHeaderTitle('')
    setAddingHeader(false)
  }

  async function handleRenameHeader(headerId) {
    if (!renameHeaderValue.trim()) { setRenamingHeaderId(null); return }
    await updateHeader(headerId, { title: renameHeaderValue.trim() })
    setRenamingHeaderId(null)
  }

  function openCtxEditFolder(id) {
    setEditFolder(folders.find(f => f.id === id) || null)
    setFolderModalOpen(true)
    setCtxMenu(null)
  }

  function openCtxAddList(folderId) {
    setEditList(null)
    setDefaultFolderId(folderId)
    setListModalOpen(true)
    setCtxMenu(null)
  }

  async function handleCtxDeleteFolder(id) {
    await deleteFolder(id)
    if (selectedView.type === 'list') {
      const list = lists.find(l => l.id === selectedView.id)
      if (list?.folder_id === id) setSelectedView({ type: 'inbox' })
    }
    setCtxMenu(null)
  }

  function openCtxEditList(id) {
    setEditList(lists.find(l => l.id === id) || null)
    setListModalOpen(true)
    setCtxMenu(null)
  }

  async function handleCtxDeleteList(id) {
    await deleteList(id)
    if (selectedView.id === id) setSelectedView({ type: 'inbox' })
    setCtxMenu(null)
  }

  const unfolderedLists = lists.filter(l => !l.folder_id)

  const ctxItems = ctxMenu?.type === 'folder'
    ? [
        { label: 'Rename folder', onClick: () => openCtxEditFolder(ctxMenu.id) },
        { label: 'Add list', onClick: () => openCtxAddList(ctxMenu.id) },
        { label: 'Delete folder', onClick: () => handleCtxDeleteFolder(ctxMenu.id), danger: true },
      ]
    : ctxMenu?.type === 'list'
    ? [
        { label: 'Rename list', onClick: () => openCtxEditList(ctxMenu.id) },
        { label: 'Delete list', onClick: () => handleCtxDeleteList(ctxMenu.id), danger: true },
      ]
    : []

  return (
    <div className="max-w-[1200px] mx-auto w-full h-full flex flex-col md:flex-row overflow-hidden">

      {/* ── Sidebar — hidden on mobile ───────────────────────────────────── */}
      <div className="hidden md:flex w-56 flex-shrink-0 border-r border-gray-100 dark:border-gray-800/60 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto px-3 pt-4 pb-4">

          {/* Inbox — styled as a primary nav item */}
          <button
            onClick={() => setSelectedView({ type: 'inbox' })}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors text-left mb-1 ${
              selectedView.type === 'inbox'
                ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 font-medium'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/60 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <Inbox size={14} className="flex-shrink-0 opacity-70" />
            <span className="flex-1 truncate">Inbox</span>
            {activeTasks.filter(t => !t.list_id).length > 0 && (
              <span className="tabular-nums text-[11px] text-gray-400 dark:text-gray-500">
                {activeTasks.filter(t => !t.list_id).length}
              </span>
            )}
          </button>

          {/* Divider */}
          <div className="border-t border-gray-100 dark:border-gray-800/60 my-3" />

          {/* MY LISTS section label */}
          <p className="px-2.5 mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 select-none">
            My Lists
          </p>

          {/* Unfoldered lists — direct, no indent */}
          <div className="space-y-0.5">
            {unfolderedLists.map(list => (
              <ListNavItem
                key={list.id}
                active={selectedView.type === 'list' && selectedView.id === list.id}
                onClick={() => setSelectedView({ type: 'list', id: list.id })}
                onContextMenu={e => openContextMenu(e, 'list', list.id)}
                color={list.color}
                name={list.name}
                count={activeTasks.filter(t => t.list_id === list.id).length}
              />
            ))}
          </div>

          {/* Folders */}
          <div className="mt-1 space-y-1">
            {folders.map(folder => {
              const collapsed = collapsedFolders.has(folder.id)
              const folderLists = lists.filter(l => l.folder_id === folder.id)
              return (
                <div key={folder.id}>
                  {/* Folder row */}
                  <button
                    onClick={() => toggleFolder(folder.id)}
                    onContextMenu={e => openContextMenu(e, 'folder', folder.id)}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/60 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                  >
                    {collapsed
                      ? <ChevronRight size={12} className="flex-shrink-0 opacity-50" />
                      : <ChevronDown size={12} className="flex-shrink-0 opacity-50" />}
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: folder.color }} />
                    <span className="flex-1 truncate">{folder.name}</span>
                  </button>

                  {/* Lists indented under folder */}
                  {!collapsed && folderLists.length > 0 && (
                    <div className="ml-3 mt-0.5 space-y-0.5">
                      {folderLists.map(list => (
                        <ListNavItem
                          key={list.id}
                          active={selectedView.type === 'list' && selectedView.id === list.id}
                          onClick={() => setSelectedView({ type: 'list', id: list.id })}
                          onContextMenu={e => openContextMenu(e, 'list', list.id)}
                          color={list.color}
                          name={list.name}
                          count={activeTasks.filter(t => t.list_id === list.id).length}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* New list / New folder — right below the lists section */}
          <div className="mt-3 space-y-0.5">
            <button
              onClick={() => { setEditList(null); setDefaultFolderId(null); setListModalOpen(true) }}
              className="w-full flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/60 transition-colors"
            >
              <Plus size={12} className="opacity-60" /> New list
            </button>
            <button
              onClick={() => { setEditFolder(null); setFolderModalOpen(true) }}
              className="w-full flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/60 transition-colors"
            >
              <Plus size={12} className="opacity-60" /> New folder
            </button>
          </div>

          {/* Tags — collapsible, below the lists section */}
          {tags.length > 0 && (
            <div className="mt-4">
              <div className="border-t border-gray-100 dark:border-gray-800/60 mb-3" />
              <button
                onClick={() => setTagsCollapsed(p => !p)}
                className="w-full flex items-center gap-2 px-2.5 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-400 transition-colors select-none"
              >
                {tagsCollapsed ? <ChevronRight size={10} /> : <ChevronDown size={10} />}
                <Tag size={10} />
                Tags
              </button>
              {!tagsCollapsed && (
                <div className="space-y-0.5">
                  {tags.map(tag => (
                    <button
                      key={tag.id}
                      onClick={() => setSelectedView({ type: 'tag', id: tag.id })}
                      className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-colors text-left ${
                        selectedView.type === 'tag' && selectedView.id === tag.id
                          ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 font-medium'
                          : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/60 hover:text-gray-700 dark:hover:text-gray-300'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: tag.color }} />
                      <span className="flex-1 truncate">{tag.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Mobile nav strip — visible only below md */}
        <div className="flex md:hidden items-center gap-2 px-4 py-2 overflow-x-auto border-b border-gray-100 dark:border-gray-800/60 flex-shrink-0 scrollbar-none scroll-touch">
          <button
            onClick={() => setSelectedView({ type: 'inbox' })}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              selectedView.type === 'inbox'
                ? 'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
            }`}
          >
            <Inbox size={11} />
            Inbox
          </button>
          {lists.map(list => (
            <button
              key={list.id}
              onClick={() => setSelectedView({ type: 'list', id: list.id })}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                selectedView.type === 'list' && selectedView.id === list.id
                  ? 'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
              }`}
            >
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: list.color }} />
              {list.name}
            </button>
          ))}
          {tags.map(tag => (
            <button
              key={tag.id}
              onClick={() => setSelectedView({ type: 'tag', id: tag.id })}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                selectedView.type === 'tag' && selectedView.id === tag.id
                  ? 'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
              }`}
            >
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: tag.color }} />
              {tag.name}
            </button>
          ))}
        </div>

        {/* Top bar */}
        <div className="px-4 pt-4 pb-3 md:px-8 md:pt-6 md:pb-4 border-b border-gray-100 dark:border-gray-800/60 flex-shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center">
              <CheckSquare size={15} className="text-teal-500" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Tasks</h1>
          </div>
          <button onClick={() => setImportModalOpen(true)} className="btn-ghost text-xs flex items-center gap-1.5">
            <Upload size={13} /> Quick import
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-6 md:px-8 md:pt-6 md:pb-8">

          {/* ── Inbox view ──────────────────────────────────────────────── */}
          {selectedView.type === 'inbox' && (() => {
            const inboxTasks = activeTasks.filter(t => !t.list_id)
            return (
              <div>
                <div className="flex items-center justify-between mb-5">
                  <h2 className="flex items-center gap-2.5 text-[22px] font-medium text-gray-900 dark:text-gray-100">
                    <Inbox size={18} className="text-gray-400" />
                    Inbox
                  </h2>
                  <button onClick={() => openNewTask(null)} className="btn-ghost text-xs">
                    <Plus size={13} /> Add task
                  </button>
                </div>

                {inboxTasks.length === 0 ? (
                  <p className="text-sm text-gray-400 dark:text-gray-500 italic">
                    No tasks yet.{' '}
                    <button
                      onClick={() => openNewTask(null)}
                      className="not-italic text-teal-500 hover:text-teal-600 dark:text-teal-400 dark:hover:text-teal-300 transition-colors"
                    >
                      + add one
                    </button>
                  </p>
                ) : (
                  <div className="card overflow-hidden">
                    <div className="divide-y divide-gray-50 dark:divide-gray-800/60">
                      {inboxTasks.map(t => (
                        <TaskRow
                          key={t.id}
                          task={t}
                          listData={getListData(t)}
                          onEdit={task => { setEditTask(task); setTaskModalOpen(true) }}
                          onTagClick={tagId => setSelectedView({ type: 'tag', id: tagId })}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })()}

          {/* ── List view ────────────────────────────────────────────────── */}
          {selectedView.type === 'list' && (() => {
            const list = lists.find(l => l.id === selectedView.id)
            if (!list) return null
            const rawListTasks = activeTasks.filter(t => t.list_id === list.id)
            const listTasks = applySort(applyFilter(rawListTasks))
            const listHeaders = headers
              .filter(h => h.list_id === list.id)
              .sort((a, b) => a.position - b.position)
            const tasksWithoutHeader = listTasks.filter(t => !t.header_id)
            const hasContent = rawListTasks.length > 0 || listHeaders.length > 0

            const FILTER_LABELS = { all: 'All', overdue: 'Overdue', today: 'Today', upcoming: 'Upcoming' }
            const SORT_OPTIONS = [
              { value: 'created', label: 'Date created' },
              { value: 'due', label: 'Due date' },
              { value: 'priority', label: 'Priority' },
              { value: 'name', label: 'Name A→Z' },
            ]

            return (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="flex items-center gap-2.5 text-[22px] font-medium text-gray-900 dark:text-gray-100">
                    <span className="w-3.5 h-3.5 rounded-full flex-shrink-0" style={{ backgroundColor: list.color }} />
                    {list.name}
                  </h2>
                  <button onClick={() => openNewTask(list.id)} className="btn-ghost text-xs">
                    <Plus size={13} /> Add task
                  </button>
                </div>

                {/* Sort & Filter bar */}
                <div className="flex items-center gap-2 mb-5 flex-wrap">
                  {/* Filter pills */}
                  <div className="flex items-center gap-1">
                    <Filter size={11} className="text-gray-400" />
                    {['all', 'overdue', 'today', 'upcoming'].map(f => (
                      <button
                        key={f}
                        onClick={() => setFilterBy(f)}
                        className={`px-2 py-0.5 rounded-full text-[11px] font-medium transition-colors ${
                          filterBy === f
                            ? f === 'overdue' ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'
                              : f === 'today' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                              : 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300'
                            : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400'
                        }`}
                      >
                        {FILTER_LABELS[f]}
                      </button>
                    ))}
                  </div>
                  <div className="w-px h-3.5 bg-gray-200 dark:bg-gray-700" />
                  {/* Sort */}
                  <div className="relative" ref={sortMenuRef}>
                    <button
                      onClick={() => setSortMenuOpen(v => !v)}
                      className="flex items-center gap-1 text-[11px] text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 transition-colors"
                    >
                      <ArrowUpDown size={11} />
                      {SORT_OPTIONS.find(o => o.value === sortBy)?.label}
                    </button>
                    {sortMenuOpen && (
                      <div className="absolute top-full left-0 mt-1 z-50 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl shadow-lg py-1 w-36">
                        {SORT_OPTIONS.map(o => (
                          <button
                            key={o.value}
                            onClick={() => { setSortBy(o.value); setSortMenuOpen(false) }}
                            className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                              sortBy === o.value
                                ? 'text-teal-600 dark:text-teal-400 font-medium'
                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                            }`}
                          >
                            {o.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {!hasContent ? (
                  <p className="text-sm text-gray-400 dark:text-gray-500 italic">
                    No tasks yet.{' '}
                    <button
                      onClick={() => openNewTask(list.id)}
                      className="not-italic text-teal-500 hover:text-teal-600 dark:text-teal-400 dark:hover:text-teal-300 transition-colors"
                    >
                      + add one
                    </button>
                  </p>
                ) : (
                  <div className="space-y-4">
                    {tasksWithoutHeader.length > 0 && (
                      <div className="card overflow-hidden">
                        <div className="divide-y divide-gray-50 dark:divide-gray-800/60">
                          {tasksWithoutHeader.map(t => (
                            <TaskRow
                              key={t.id}
                              task={t}
                              listData={list}
                              onEdit={task => { setEditTask(task); setTaskModalOpen(true) }}
                          onTagClick={tagId => setSelectedView({ type: 'tag', id: tagId })}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {listHeaders.map(header => {
                      const hTasks = listTasks.filter(t => t.header_id === header.id)
                      return (
                        <div key={header.id}>
                          <div className="group flex items-center gap-2 mb-2 pl-1">
                            {renamingHeaderId === header.id ? (
                              <input
                                autoFocus
                                value={renameHeaderValue}
                                onChange={e => setRenameHeaderValue(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') handleRenameHeader(header.id)
                                  if (e.key === 'Escape') setRenamingHeaderId(null)
                                }}
                                onBlur={() => handleRenameHeader(header.id)}
                                className="flex-1 text-xs font-bold uppercase tracking-wide bg-transparent border-b border-teal-400 outline-none text-gray-700 dark:text-gray-300 pb-0.5"
                              />
                            ) : (
                              <button
                                onClick={() => { setRenamingHeaderId(header.id); setRenameHeaderValue(header.title) }}
                                className="flex-1 text-left text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                              >
                                {header.title}
                              </button>
                            )}
                            <button
                              onClick={() => openNewTask(list.id, header.id)}
                              className="opacity-0 group-hover:opacity-100 p-1 rounded text-gray-400 hover:text-teal-500 transition-all"
                            >
                              <Plus size={12} />
                            </button>
                            <button
                              onClick={() => deleteHeader(header.id)}
                              className="opacity-0 group-hover:opacity-100 p-1 rounded text-gray-400 hover:text-rose-500 transition-all"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                          {hTasks.length > 0 ? (
                            <div className="card overflow-hidden">
                              <div className="divide-y divide-gray-50 dark:divide-gray-800/60">
                                {hTasks.map(t => (
                                  <TaskRow
                                    key={t.id}
                                    task={t}
                                    listData={list}
                                    onEdit={task => { setEditTask(task); setTaskModalOpen(true) }}
                          onTagClick={tagId => setSelectedView({ type: 'tag', id: tagId })}
                                  />
                                ))}
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs text-gray-400 dark:text-gray-500 px-1 italic">No tasks</p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Add section header — only shown when list has content */}
                {hasContent && (
                  <div className="mt-5">
                    {addingHeader ? (
                      <input
                        autoFocus
                        value={newHeaderTitle}
                        onChange={e => setNewHeaderTitle(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleAddHeader()
                          if (e.key === 'Escape') { setAddingHeader(false); setNewHeaderTitle('') }
                        }}
                        onBlur={() => {
                          if (newHeaderTitle.trim()) handleAddHeader()
                          else { setAddingHeader(false); setNewHeaderTitle('') }
                        }}
                        placeholder="Section header..."
                        className="w-full text-xs font-bold uppercase tracking-wide bg-transparent border-b border-teal-400 outline-none text-gray-700 dark:text-gray-300 pb-0.5"
                      />
                    ) : (
                      <button
                        onClick={() => setAddingHeader(true)}
                        className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-400 transition-colors"
                      >
                        <Plus size={11} /> Add section header
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })()}

          {/* ── Tag view ─────────────────────────────────────────────────── */}
          {selectedView.type === 'tag' && (() => {
            const tag = tags.find(t => t.id === selectedView.id)
            if (!tag) return null
            const tagTaskIds = Object.entries(taskTags)
              .filter(([, tIds]) => tIds.includes(tag.id))
              .map(([taskId]) => taskId)
            const tagTasks = activeTasks.filter(t => tagTaskIds.includes(t.id))
            return (
              <div>
                <div className="flex items-center mb-5">
                  <h2 className="flex items-center gap-2.5 text-[22px] font-medium text-gray-900 dark:text-gray-100">
                    <span className="w-3.5 h-3.5 rounded-full flex-shrink-0" style={{ backgroundColor: tag.color }} />
                    {tag.name}
                  </h2>
                </div>
                {tagTasks.length === 0 ? (
                  <p className="text-sm text-gray-400 dark:text-gray-500 italic">
                    No tasks tagged &ldquo;{tag.name}&rdquo;.
                  </p>
                ) : (
                  <div className="card overflow-hidden">
                    <div className="divide-y divide-gray-50 dark:divide-gray-800/60">
                      {tagTasks.map(t => (
                        <TaskRow
                          key={t.id}
                          task={t}
                          listData={getListData(t)}
                          onEdit={task => { setEditTask(task); setTaskModalOpen(true) }}
                          onTagClick={tagId => setSelectedView({ type: 'tag', id: tagId })}
                          showListName
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })()}

        </div>
      </div>

      {/* ── Context menu ─────────────────────────────────────────────────── */}
      {ctxMenu && createPortal(
        <div
          ref={ctxMenuRef}
          style={{ position: 'fixed', top: ctxMenu.y, left: ctxMenu.x, zIndex: 9999 }}
          className="w-40 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl shadow-xl py-1"
        >
          {ctxItems.map((item, i) => (
            <button
              key={i}
              onClick={item.onClick}
              className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                item.danger
                  ? 'text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>,
        document.body
      )}

      <FolderModal
        isOpen={folderModalOpen}
        onClose={() => { setFolderModalOpen(false); setEditFolder(null) }}
        editFolder={editFolder}
      />
      <ListModal
        isOpen={listModalOpen}
        onClose={() => { setListModalOpen(false); setEditList(null); setDefaultFolderId(null) }}
        editList={editList}
        defaultFolderId={defaultFolderId}
      />
      <TaskModal
        isOpen={taskModalOpen}
        onClose={() => { setTaskModalOpen(false); setEditTask(null) }}
        editTask={editTask}
        defaultListId={defaultListId}
        defaultHeaderId={defaultHeaderId}
      />
      <TasksSmartImportModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
      />
    </div>
  )
}
