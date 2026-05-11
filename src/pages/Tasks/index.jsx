import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Plus, CheckSquare, Inbox, ChevronRight, ChevronDown, Tag, Trash2, Sparkles, ArrowUpDown, Filter, X, Star, Clock, GraduationCap } from 'lucide-react'
import { isPast, isToday, addDays, isSameDay, startOfDay, format } from 'date-fns'
import { useTaskStore } from '../../stores/useTaskStore'
import { useAuthStore } from '../../stores/useAuthStore'
import { useFolderStore } from '../../stores/useFolderStore'
import { useTagStore } from '../../stores/useTagStore'
import { useSchoolStore } from '../../stores/useSchoolStore'
import FolderModal from './FolderModal'
import ListModal from './ListModal'
import TaskModal from './TaskModal'
import TaskRow from './TaskRow'
import TasksSmartImportModal from './SmartImportModal'
import ConfirmDeleteModal from '../../components/ui/ConfirmDeleteModal'

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
  const { lists, tasks, headers, fetchLists, fetchTasks, fetchHeaders, deleteList, updateList, addHeader, updateHeader, deleteHeader } = useTaskStore()
  const { folders, fetchFolders, updateFolder, deleteFolder } = useFolderStore()
  const { tags, taskTags, fetchTags, fetchTaskTags, deleteTag, updateTag } = useTagStore()
  const { assignments: schoolAssignments, classes: schoolClasses, fetchAssignments: fetchSchoolAssignments } = useSchoolStore()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

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
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const [renamingTagId, setRenamingTagId] = useState(null)
  const [renameTagValue, setRenameTagValue] = useState('')
  const [manageSheetOpen, setManageSheetOpen] = useState(false)
  const [manageTab, setManageTab] = useState('lists')
  const [mobileRenaming, setMobileRenaming] = useState(null) // { type, id, value }

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
      fetchSchoolAssignments(user.id)
    }
  }, [user])

  // Activate view from URL param (sidebar Quick nav / tag clicks)
  useEffect(() => {
    const tagId = searchParams.get('tag')
    const view = searchParams.get('view')
    if (tagId) {
      setSelectedView({ type: 'tag', id: tagId })
    } else if (view === 'today') {
      setSelectedView({ type: 'today' })
    } else if (view === 'upcoming') {
      setSelectedView({ type: 'upcoming' })
    } else if (view === 'inbox') {
      setSelectedView({ type: 'inbox' })
    }
  }, [searchParams])

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
    document.addEventListener('pointerdown', handle)
    return () => document.removeEventListener('pointerdown', handle)
  }, [ctxMenu])

  useEffect(() => {
    if (!sortMenuOpen) return
    function handle(e) {
      if (!sortMenuRef.current?.contains(e.target)) setSortMenuOpen(false)
    }
    document.addEventListener('pointerdown', handle)
    return () => document.removeEventListener('pointerdown', handle)
  }, [sortMenuOpen])

  function openContextMenu(e, type, id) {
    e.preventDefault()
    e.stopPropagation()
    const x = Math.max(8, Math.min(e.clientX, window.innerWidth - 164))
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

  function handleCtxDeleteFolder(id) {
    const folder = folders.find(f => f.id === id)
    setDeleteConfirm({ type: 'folder', id, name: folder?.name || 'this folder' })
    setCtxMenu(null)
  }

  function openCtxEditList(id) {
    setEditList(lists.find(l => l.id === id) || null)
    setListModalOpen(true)
    setCtxMenu(null)
  }

  function handleCtxDeleteList(id) {
    const list = lists.find(l => l.id === id)
    setDeleteConfirm({ type: 'list', id, name: list?.name || 'this list' })
    setCtxMenu(null)
  }

  async function handleConfirmDelete() {
    if (!deleteConfirm) return
    const { type, id } = deleteConfirm
    if (type === 'folder') {
      await deleteFolder(id)
      if (selectedView.type === 'list') {
        const list = lists.find(l => l.id === selectedView.id)
        if (list?.folder_id === id) setSelectedView({ type: 'inbox' })
      }
    } else if (type === 'list') {
      await deleteList(id)
      if (selectedView.id === id) setSelectedView({ type: 'inbox' })
    } else if (type === 'header') {
      await deleteHeader(id)
    } else if (type === 'tag') {
      await deleteTag(id)
      if (selectedView.type === 'tag' && selectedView.id === id) setSelectedView({ type: 'inbox' })
    }
  }

  const unfolderedLists = lists.filter(l => !l.folder_id)

  function openCtxRenameTag(id) {
    const tag = tags.find(t => t.id === id)
    if (tag) { setRenamingTagId(tag.id); setRenameTagValue(tag.name) }
    setCtxMenu(null)
  }

  function handleCtxDeleteTag(id) {
    const tag = tags.find(t => t.id === id)
    setDeleteConfirm({ type: 'tag', id, name: tag?.name || 'this tag' })
    setCtxMenu(null)
  }

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
    : ctxMenu?.type === 'tag'
    ? [
        { label: 'Rename tag', onClick: () => openCtxRenameTag(ctxMenu.id) },
        { label: 'Delete tag', onClick: () => handleCtxDeleteTag(ctxMenu.id), danger: true },
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
              <div className="flex items-center mb-1.5">
                <button
                  onClick={() => setTagsCollapsed(p => !p)}
                  className="flex-1 flex items-center gap-2 px-2.5 text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-400 transition-colors select-none"
                >
                  {tagsCollapsed ? <ChevronRight size={10} /> : <ChevronDown size={10} />}
                  <Tag size={10} />
                  Tags
                </button>
                <button
                  title="Manage tags"
                  onClick={() => { setManageTab('tags'); setManageSheetOpen(true) }}
                  className="p-1 rounded text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors mr-1"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                  </svg>
                </button>
              </div>
              {!tagsCollapsed && (
                <div className="space-y-0.5">
                  {tags.map(tag => (
                    <div key={tag.id} className="flex items-center">
                      {renamingTagId === tag.id ? (
                        <input
                          autoFocus
                          value={renameTagValue}
                          onChange={e => setRenameTagValue(e.target.value)}
                          onBlur={async () => {
                            const trimmed = renameTagValue.trim()
                            if (trimmed && trimmed !== tag.name) await updateTag(tag.id, { name: trimmed })
                            setRenamingTagId(null)
                          }}
                          onKeyDown={e => {
                            if (e.key === 'Enter') e.target.blur()
                            if (e.key === 'Escape') setRenamingTagId(null)
                          }}
                          className="flex-1 px-2.5 py-1.5 rounded-md text-xs bg-white dark:bg-gray-800 border border-teal-300 dark:border-teal-600 text-gray-900 dark:text-gray-100 outline-none"
                        />
                      ) : (
                        <button
                          onClick={() => setSelectedView({ type: 'tag', id: tag.id })}
                          onContextMenu={e => openCtxTag(e, tag.id)}
                          className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-colors text-left ${
                            selectedView.type === 'tag' && selectedView.id === tag.id
                              ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 font-medium'
                              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/60 hover:text-gray-700 dark:hover:text-gray-300'
                          }`}
                        >
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: tag.color }} />
                          <span className="flex-1 truncate">{tag.name}</span>
                        </button>
                      )}
                    </div>
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
          <button
            onClick={() => setSelectedView({ type: 'today' })}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              selectedView.type === 'today'
                ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
            }`}
          >
            <Star size={11} />
            Today
          </button>
          <button
            onClick={() => setSelectedView({ type: 'upcoming' })}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              selectedView.type === 'upcoming'
                ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
            }`}
          >
            <Clock size={11} />
            Upcoming
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
          {/* Mobile manage button */}
          <div className="flex-shrink-0 w-px h-4 bg-gray-200 dark:bg-gray-700 mx-1 self-center" />
          <button
            onClick={() => setManageSheetOpen(true)}
            className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
          >
            Manage
          </button>
        </div>

        {/* Manage sheet — lists, folders, tags (web + mobile) */}
        {manageSheetOpen && (
          <div className="fixed inset-0 z-50 flex items-end" onClick={e => { if (e.target === e.currentTarget) { setManageSheetOpen(false); setMobileRenaming(null) } }}>
            <div className="w-full bg-white dark:bg-gray-900 rounded-t-2xl shadow-xl border-t border-gray-100 dark:border-gray-800 flex flex-col max-h-[75vh]">
              <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
                <div className="w-10 h-1 rounded-full bg-gray-200 dark:bg-gray-700" />
              </div>
              <div className="flex items-center justify-between px-4 py-2 flex-shrink-0">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Manage</h3>
                <button onClick={() => { setManageSheetOpen(false); setMobileRenaming(null) }} className="p-1.5 rounded-lg text-gray-400">
                  <X size={16} />
                </button>
              </div>
              {/* Tabs */}
              <div className="flex gap-1 px-4 pb-2 flex-shrink-0">
                {['lists', 'folders', 'tags'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => { setManageTab(tab); setMobileRenaming(null) }}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors capitalize ${
                      manageTab === tab
                        ? 'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <div className="overflow-y-auto flex-1 px-2 pb-6">
                {manageTab === 'lists' && (
                  <div className="space-y-0.5">
                    {lists.map(list => (
                      <div key={list.id} className="flex items-center gap-2 px-2 py-2.5 rounded-lg">
                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: list.color }} />
                        {mobileRenaming?.type === 'list' && mobileRenaming.id === list.id ? (
                          <input
                            autoFocus
                            value={mobileRenaming.value}
                            onChange={e => setMobileRenaming(r => ({ ...r, value: e.target.value }))}
                            onBlur={async () => {
                              const v = mobileRenaming.value.trim()
                              if (v && v !== list.name) await updateList(list.id, { name: v })
                              setMobileRenaming(null)
                            }}
                            onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') setMobileRenaming(null) }}
                            className="flex-1 text-sm bg-transparent border-b border-teal-400 outline-none text-gray-900 dark:text-gray-100"
                          />
                        ) : (
                          <span className="flex-1 text-sm text-gray-800 dark:text-gray-200">{list.name}</span>
                        )}
                        <div className="flex items-center gap-1">
                          <button onClick={() => setMobileRenaming({ type: 'list', id: list.id, value: list.name })} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          </button>
                          <button onClick={() => { setManageSheetOpen(false); setDeleteConfirm({ type: 'list', id: list.id, name: list.name }) }} className="p-1.5 rounded-lg text-gray-400 hover:text-rose-500 dark:hover:text-rose-400">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                    <button
                      onClick={() => { setManageSheetOpen(false); setEditList(null); setDefaultFolderId(null); setListModalOpen(true) }}
                      className="w-full flex items-center gap-2 px-2 py-2.5 rounded-lg text-sm text-teal-500 dark:text-teal-400"
                    >
                      <Plus size={14} /> New list
                    </button>
                  </div>
                )}
                {manageTab === 'folders' && (
                  <div className="space-y-0.5">
                    {folders.map(folder => (
                      <div key={folder.id} className="flex items-center gap-2 px-2 py-2.5 rounded-lg">
                        <span className="text-gray-400 dark:text-gray-500 text-xs">📁</span>
                        {mobileRenaming?.type === 'folder' && mobileRenaming.id === folder.id ? (
                          <input
                            autoFocus
                            value={mobileRenaming.value}
                            onChange={e => setMobileRenaming(r => ({ ...r, value: e.target.value }))}
                            onBlur={async () => {
                              const v = mobileRenaming.value.trim()
                              if (v && v !== folder.name) await updateFolder(folder.id, { name: v })
                              setMobileRenaming(null)
                            }}
                            onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') setMobileRenaming(null) }}
                            className="flex-1 text-sm bg-transparent border-b border-teal-400 outline-none text-gray-900 dark:text-gray-100"
                          />
                        ) : (
                          <span className="flex-1 text-sm text-gray-800 dark:text-gray-200">{folder.name}</span>
                        )}
                        <div className="flex items-center gap-1">
                          <button onClick={() => setMobileRenaming({ type: 'folder', id: folder.id, value: folder.name })} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          </button>
                          <button onClick={() => { setManageSheetOpen(false); setDeleteConfirm({ type: 'folder', id: folder.id, name: folder.name }) }} className="p-1.5 rounded-lg text-gray-400 hover:text-rose-500 dark:hover:text-rose-400">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                    <button
                      onClick={() => { setManageSheetOpen(false); setEditFolder(null); setFolderModalOpen(true) }}
                      className="w-full flex items-center gap-2 px-2 py-2.5 rounded-lg text-sm text-teal-500 dark:text-teal-400"
                    >
                      <Plus size={14} /> New folder
                    </button>
                  </div>
                )}
                {manageTab === 'tags' && (
                  <div className="space-y-0.5">
                    {tags.map(tag => (
                      <div key={tag.id} className="flex items-center gap-2 px-2 py-2.5 rounded-lg">
                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: tag.color }} />
                        {mobileRenaming?.type === 'tag' && mobileRenaming.id === tag.id ? (
                          <input
                            autoFocus
                            value={mobileRenaming.value}
                            onChange={e => setMobileRenaming(r => ({ ...r, value: e.target.value }))}
                            onBlur={async () => {
                              const v = mobileRenaming.value.trim()
                              if (v && v !== tag.name) await updateTag(tag.id, { name: v })
                              setMobileRenaming(null)
                            }}
                            onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') setMobileRenaming(null) }}
                            className="flex-1 text-sm bg-transparent border-b border-teal-400 outline-none text-gray-900 dark:text-gray-100"
                          />
                        ) : (
                          <span className="flex-1 text-sm text-gray-800 dark:text-gray-200">{tag.name}</span>
                        )}
                        <div className="flex items-center gap-1">
                          <button onClick={() => setMobileRenaming({ type: 'tag', id: tag.id, value: tag.name })} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          </button>
                          <button onClick={() => { setManageSheetOpen(false); setDeleteConfirm({ type: 'tag', id: tag.id, name: tag.name }) }} className="p-1.5 rounded-lg text-gray-400 hover:text-rose-500 dark:hover:text-rose-400">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {tags.length === 0 && (
                      <p className="px-2 py-3 text-sm text-gray-400 dark:text-gray-500">No tags yet. Create one inside a task.</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Top bar */}
        <div className="px-4 pt-4 pb-3 md:px-8 md:pt-6 md:pb-4 border-b border-gray-100 dark:border-gray-800/60 flex-shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center">
              <CheckSquare size={15} className="text-teal-500" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Tasks
              {selectedView.type === 'tag' && (() => {
                const tag = tags.find(t => t.id === selectedView.id)
                return tag ? <span className="font-normal text-gray-400 dark:text-gray-500"> · {tag.name}</span> : null
              })()}
              {selectedView.type === 'today' && (
                <span className="font-normal text-gray-400 dark:text-gray-500"> · Today</span>
              )}
              {selectedView.type === 'upcoming' && (
                <span className="font-normal text-gray-400 dark:text-gray-500"> · Upcoming</span>
              )}
            </h1>
          </div>
          <button onClick={() => setImportModalOpen(true)} className="btn-ghost text-xs flex items-center gap-1.5">
            <Sparkles size={13} /> Quick import
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
                              onClick={() => setDeleteConfirm({ type: 'header', id: header.id, name: header.title })}
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

          {/* ── Today view ───────────────────────────────────────────────── */}
          {selectedView.type === 'today' && (() => {
            const overdueTasks = activeTasks.filter(t =>
              t.due_date && isPast(new Date(t.due_date)) && !isToday(new Date(t.due_date))
            )
            const todayTasks = activeTasks.filter(t =>
              t.due_date && isToday(new Date(t.due_date))
            )
            const total = overdueTasks.length + todayTasks.length
            return (
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="flex items-center gap-2.5 text-[22px] font-medium text-gray-900 dark:text-gray-100">
                      <Star size={18} className="text-amber-400" />
                      Today
                    </h2>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 ml-[26px]">
                      {format(new Date(), 'EEEE, MMMM d')}
                      {total > 0 && ` · ${total} task${total !== 1 ? 's' : ''}`}
                    </p>
                  </div>
                  <button onClick={() => openNewTask(null)} className="btn-ghost text-xs">
                    <Plus size={13} /> Add task
                  </button>
                </div>

                {total === 0 ? (
                  <p className="text-sm text-gray-400 dark:text-gray-500 italic">Nothing due today. Great work!</p>
                ) : (
                  <div className="space-y-4">
                    {overdueTasks.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-semibold uppercase tracking-wide text-rose-500">Overdue</span>
                          <div className="flex-1 h-px bg-rose-100 dark:bg-rose-900/30" />
                          <span className="text-xs tabular-nums text-rose-400">{overdueTasks.length}</span>
                        </div>
                        <div className="card overflow-hidden">
                          <div className="divide-y divide-gray-50 dark:divide-gray-800/60">
                            {overdueTasks.map(t => (
                              <TaskRow key={t.id} task={t} listData={getListData(t)}
                                onEdit={task => { setEditTask(task); setTaskModalOpen(true) }}
                                onTagClick={tagId => setSelectedView({ type: 'tag', id: tagId })}
                                showListName />
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                    {todayTasks.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-semibold uppercase tracking-wide text-amber-500">Due today</span>
                          <div className="flex-1 h-px bg-amber-100 dark:bg-amber-900/30" />
                          <span className="text-xs tabular-nums text-amber-400">{todayTasks.length}</span>
                        </div>
                        <div className="card overflow-hidden">
                          <div className="divide-y divide-gray-50 dark:divide-gray-800/60">
                            {todayTasks.map(t => (
                              <TaskRow key={t.id} task={t} listData={getListData(t)}
                                onEdit={task => { setEditTask(task); setTaskModalOpen(true) }}
                                onTagClick={tagId => setSelectedView({ type: 'tag', id: tagId })}
                                showListName />
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })()}

          {/* ── Upcoming view ─────────────────────────────────────────────── */}
          {selectedView.type === 'upcoming' && (() => {
            const cutoff = addDays(startOfDay(new Date()), 8)
            const upcomingTasks = activeTasks.filter(t => {
              if (!t.due_date) return false
              const d = new Date(t.due_date)
              return !isPast(d) && !isToday(d) && d < cutoff
            })
            const upcomingAssignments = schoolAssignments.filter(a => {
              if (!a.due_date || a.completed) return false
              const d = new Date(a.due_date)
              return !isPast(d) && !isToday(d) && d < cutoff
            })
            const days = Array.from({ length: 7 }, (_, i) => addDays(startOfDay(new Date()), i + 1))
            const total = upcomingTasks.length + upcomingAssignments.length
            return (
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="flex items-center gap-2.5 text-[22px] font-medium text-gray-900 dark:text-gray-100">
                      <Clock size={18} className="text-blue-400" />
                      Upcoming
                    </h2>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 ml-[26px]">
                      Next 7 days
                      {total > 0 && ` · ${total} item${total !== 1 ? 's' : ''}`}
                    </p>
                  </div>
                </div>

                {total === 0 ? (
                  <p className="text-sm text-gray-400 dark:text-gray-500 italic">Nothing due in the next 7 days.</p>
                ) : (
                  <div className="space-y-4">
                    {days.map(day => {
                      const dayTasks = upcomingTasks.filter(t => isSameDay(new Date(t.due_date), day))
                      const dayAssignments = upcomingAssignments.filter(a => isSameDay(new Date(a.due_date), day))
                      if (dayTasks.length === 0 && dayAssignments.length === 0) return null
                      return (
                        <div key={day.toISOString()}>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                              {format(day, 'EEEE')}
                            </span>
                            <span className="text-xs text-gray-400 dark:text-gray-500">{format(day, 'MMM d')}</span>
                            <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
                          </div>
                          <div className="card overflow-hidden">
                            <div className="divide-y divide-gray-50 dark:divide-gray-800/60">
                              {dayTasks.map(t => (
                                <TaskRow key={t.id} task={t} listData={getListData(t)}
                                  onEdit={task => { setEditTask(task); setTaskModalOpen(true) }}
                                  onTagClick={tagId => setSelectedView({ type: 'tag', id: tagId })}
                                  showListName />
                              ))}
                              {dayAssignments.map(a => {
                                const cls = schoolClasses.find(c => c.id === a.class_id)
                                return (
                                  <div key={a.id} className="flex items-center gap-3 px-4 py-2.5">
                                    <div className="flex-shrink-0 w-4 h-4 rounded-full border-2 border-gray-300 dark:border-gray-600" />
                                    <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                                      <span className="text-sm text-gray-700 dark:text-gray-300 font-medium truncate">
                                        {a.title}
                                      </span>
                                      {cls && (
                                        <span
                                          className="text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0"
                                          style={{ backgroundColor: (cls.color || '#6366f1') + '20', color: cls.color || '#6366f1' }}
                                        >
                                          {cls.name}
                                        </span>
                                      )}
                                    </div>
                                    <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 font-medium flex-shrink-0">
                                      <GraduationCap size={9} />
                                      Assignment
                                    </span>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        </div>
                      )
                    })}
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

            function clearTagFilter() {
              setSelectedView({ type: 'inbox' })
              navigate('/home/tasks', { replace: true })
            }

            return (
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="flex items-center gap-2.5 text-[22px] font-medium text-gray-900 dark:text-gray-100">
                      <span className="w-3.5 h-3.5 rounded-full flex-shrink-0" style={{ backgroundColor: tag.color }} />
                      {tag.name}
                    </h2>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 ml-[26px]">
                      {tagTasks.length} task{tagTasks.length !== 1 ? 's' : ''} tagged &ldquo;{tag.name}&rdquo;
                    </p>
                  </div>
                  <button
                    onClick={clearTagFilter}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <X size={11} />
                    Clear filter
                  </button>
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
      <ConfirmDeleteModal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleConfirmDelete}
        title={`Delete "${deleteConfirm?.name}"?`}
        description={
          deleteConfirm?.type === 'folder'
            ? 'This will permanently delete the folder and all lists and tasks inside it. This cannot be undone.'
            : deleteConfirm?.type === 'list'
            ? 'All tasks in this list will be permanently deleted. This cannot be undone.'
            : deleteConfirm?.type === 'tag'
            ? 'This tag will be removed from all tasks. This cannot be undone.'
            : 'This section header will be removed. Tasks inside it will remain. This cannot be undone.'
        }
        confirmLabel={
          deleteConfirm?.type === 'folder' ? 'Delete folder'
            : deleteConfirm?.type === 'list' ? 'Delete list'
            : deleteConfirm?.type === 'tag' ? 'Delete tag'
            : 'Delete section'
        }
      />
    </div>
  )
}
