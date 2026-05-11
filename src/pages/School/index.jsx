import { useState, useEffect, useRef, useMemo } from 'react'
import {
  Plus, GraduationCap, BookOpen, Calendar, FlaskConical,
  Pencil, Trash2, Sparkles, Timer, GripVertical, ArrowUp, ArrowDown,
} from 'lucide-react'
import {
  DndContext, PointerSensor, TouchSensor, useSensor, useSensors, closestCenter,
} from '@dnd-kit/core'
import {
  SortableContext, useSortable, arrayMove, rectSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useSchoolStore } from '../../stores/useSchoolStore'
import { useAuthStore } from '../../stores/useAuthStore'
import { getTypeByValue } from '../../lib/constants'
import EmptyState from '../../components/ui/EmptyState'
import ConfirmDeleteModal from '../../components/ui/ConfirmDeleteModal'
import ClassModal from './ClassModal'
import AssignmentModal from './AssignmentModal'
import AssignmentRow from './AssignmentRow'
import SmartImportModal from './SmartImportModal'
import StudyMode from '../../components/StudyMode'

const VIEWS = [
  { id: 'byclass', label: 'By Class', icon: BookOpen },
  { id: 'bydate', label: 'By Due Date', icon: Calendar },
  { id: 'assessments', label: 'Upcoming Assessments', icon: FlaskConical },
]

function SortableClassCard({
  cls, editingOrder, isMobile, isFirst, isLast,
  onMoveUp, onMoveDown, assignments, onEdit, onDelete, onAddAssignment,
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: cls.id })

  const allClsAssign = assignments.filter((a) => a.class_id === cls.id)
  const pending = allClsAssign.filter((a) => !a.completed).length
  const done = allClsAssign.filter((a) => a.completed).length
  const total = allClsAssign.length
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  return (
    <div
      ref={setNodeRef}
      className="class-card"
      style={{
        borderLeft: `3px solid ${cls.color}`,
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="class-name">{cls.name}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 10px', marginTop: 5, fontSize: 11.5, color: 'var(--fg-3)' }}>
            {cls.teacher && <span>{cls.teacher}</span>}
            {cls.period && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 3, height: 3, borderRadius: 999, background: 'var(--fg-4)', display: 'inline-block' }} />
                {cls.period}
              </span>
            )}
            {cls.room && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 3, height: 3, borderRadius: 999, background: 'var(--fg-4)', display: 'inline-block' }} />
                Room {cls.room}
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 2, flexShrink: 0, marginTop: -2, alignItems: 'center' }}>
          {editingOrder && (
            isMobile ? (
              <>
                <button onClick={onMoveUp} disabled={isFirst} className="icon-btn ghost" title="Move up">
                  <ArrowUp size={11} />
                </button>
                <button onClick={onMoveDown} disabled={isLast} className="icon-btn ghost" title="Move down">
                  <ArrowDown size={11} />
                </button>
              </>
            ) : (
              <button
                {...listeners}
                {...attributes}
                className="icon-btn ghost"
                style={{ cursor: 'grab', touchAction: 'none' }}
                title="Drag to reorder"
              >
                <GripVertical size={12} />
              </button>
            )
          )}
          <button className="icon-btn ghost" title="Edit class" onClick={onEdit}>
            <Pencil size={12} />
          </button>
          <button className="icon-btn ghost" title="Delete class" style={{ color: 'var(--fg-3)' }} onClick={onDelete}>
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      <div className="class-meta">
        <span><b>{pending}</b> pending</span>
        {done > 0 && <span><b>{done}</b> done</span>}
        {total === 0 && <span style={{ fontStyle: 'italic' }}>No assignments yet</span>}
      </div>

      {total > 0 && (
        <div className="class-progress">
          <div className="class-progress-fill" style={{ width: `${pct}%`, background: cls.color }} />
        </div>
      )}

      <button
        onClick={onAddAssignment}
        style={{
          marginTop: 10, display: 'flex', alignItems: 'center', gap: 4,
          fontSize: 11, fontWeight: 500, color: cls.color,
          background: 'none', border: 0, cursor: 'pointer', padding: 0,
        }}
      >
        <Plus size={11} /> Add assignment
      </button>
    </div>
  )
}

export default function School() {
  const { user } = useAuthStore()
  const { classes, assignments, fetchClasses, fetchAssignments, deleteClass } = useSchoolStore()
  const [view, setView] = useState('byclass')
  const [classModalOpen, setClassModalOpen] = useState(false)
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false)
  const [editClass, setEditClass] = useState(null)
  const [editAssignment, setEditAssignment] = useState(null)
  const [defaultClassId, setDefaultClassId] = useState(null)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [studyModeOpen, setStudyModeOpen] = useState(false)
  const [studyClass, setStudyClass] = useState(null)
  const [studyAssignment, setStudyAssignment] = useState(null)
  const [deleteClassConfirm, setDeleteClassConfirm] = useState(null)

  const [sortMode, setSortMode] = useState('period')
  const [editingOrder, setEditingOrder] = useState(false)
  const [classOrder, setClassOrder] = useState(() => {
    try {
      const key = user ? `blutask-class-order-${user.id}` : null
      return key ? JSON.parse(localStorage.getItem(key) || '[]') : []
    } catch { return [] }
  })
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 860)

  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 860)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])

  useEffect(() => {
    if (!classes.length) return
    setClassOrder((prev) => {
      const existingSet = new Set(prev)
      const newIds = classes.map((c) => c.id).filter((id) => !existingSet.has(id))
      const pruned = prev.filter((id) => classes.some((c) => c.id === id))
      return newIds.length > 0 || pruned.length !== prev.length ? [...pruned, ...newIds] : prev
    })
  }, [classes])

  useEffect(() => {
    if (!user || sortMode !== 'custom' || !classOrder.length) return
    localStorage.setItem(`blutask-class-order-${user.id}`, JSON.stringify(classOrder))
  }, [classOrder, user, sortMode])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 300, tolerance: 8 } }),
  )

  const sortedClasses = useMemo(() => {
    if (sortMode === 'period') {
      return [...classes].sort((a, b) => {
        const pa = parseInt(a.period) || 999
        const pb = parseInt(b.period) || 999
        return pa !== pb ? pa - pb : a.name.localeCompare(b.name)
      })
    }
    if (sortMode === 'alpha') {
      return [...classes].sort((a, b) => a.name.localeCompare(b.name))
    }
    return [...classes].sort((a, b) => {
      const ia = classOrder.indexOf(a.id)
      const ib = classOrder.indexOf(b.id)
      if (ia === -1 && ib === -1) return 0
      if (ia === -1) return 1
      if (ib === -1) return -1
      return ia - ib
    })
  }, [classes, sortMode, classOrder])

  function handleDragEnd({ active, over }) {
    if (!over || active.id === over.id) return
    setClassOrder((prev) => {
      const from = prev.indexOf(active.id)
      const to = prev.indexOf(over.id)
      return from === -1 || to === -1 ? prev : arrayMove(prev, from, to)
    })
  }

  function moveCard(id, delta) {
    setClassOrder((prev) => {
      const idx = prev.indexOf(id)
      const next = idx + delta
      if (idx === -1 || next < 0 || next >= prev.length) return prev
      return arrayMove(prev, idx, next)
    })
  }

  useEffect(() => {
    if (user) {
      fetchClasses(user.id)
      fetchAssignments(user.id)
    }
  }, [user])

  function openNewAssignment(classId = null) {
    setEditAssignment(null)
    setDefaultClassId(classId)
    setAssignmentModalOpen(true)
  }

  function openEditAssignment(assignment) {
    setEditAssignment(assignment)
    setAssignmentModalOpen(true)
  }

  const sortedAssignments = [...assignments]
    .filter((a) => !a.completed)
    .sort((a, b) => new Date(a.due_date || '9999') - new Date(b.due_date || '9999'))

  const assessmentAssignments = sortedAssignments.filter((a) =>
    ['quiz', 'test'].includes(a.type) && a.status !== 'graded'
  )

  return (
    <div className="page" style={{ maxWidth: 1200 }}>
      <div className="page-head">
        <div>
          <div className="crumbs">
            <span style={{ width: 8, height: 8, borderRadius: 999, background: 'oklch(0.72 0.14 295)', display: 'inline-block' }} />
            <span>School</span>
          </div>
          <h1>School</h1>
          <div className="page-sub">
            <span><b>{classes.length}</b> classes</span>
            {sortedAssignments.length > 0 && (
              <><span className="sep" /><span><b>{sortedAssignments.length}</b> upcoming</span></>
            )}
          </div>
        </div>
        <div className="page-head-right">
          <button onClick={() => { setEditClass(null); setClassModalOpen(true) }} className="btn-ghost">
            <Plus size={14} />
            <span>New class</span>
          </button>
          <button
            onClick={() => setImportModalOpen(true)}
            disabled={classes.length === 0}
            className="btn-ghost"
            style={{ display: classes.length === 0 ? 'none' : undefined }}
          >
            <Sparkles size={13} />
            Import
          </button>
          <button
            onClick={() => { setStudyClass(null); setStudyAssignment(null); setStudyModeOpen(true) }}
            className="btn-ghost"
          >
            <Timer size={13} />
            Study
          </button>
          <button onClick={() => openNewAssignment()} className="btn-primary" disabled={classes.length === 0}>
            <Plus size={14} />
            Add assignment
          </button>
        </div>
      </div>

      <div className="toolbar" style={{ marginBottom: 20 }}>
        <div className="seg">
          {VIEWS.map(({ id, label }) => (
            <button key={id} onClick={() => setView(id)} className={`seg-btn${view === id ? ' on' : ''}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        {classes.length === 0 ? (
          <EmptyState
            icon={GraduationCap}
            title="No classes yet"
            description="Create your first class to start adding assignments."
            action={
              <button onClick={() => setClassModalOpen(true)} className="btn-primary text-sm">
                <Plus size={15} />
                Create a class
              </button>
            }
          />
        ) : (
          <>
            {view === 'byclass' && (
              <div>
                {/* Sort toolbar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <span style={{ fontSize: 11, color: 'var(--fg-3)', fontWeight: 500 }}>Sort:</span>
                  <select
                    value={sortMode}
                    onChange={(e) => {
                      const val = e.target.value
                      setSortMode(val)
                      setEditingOrder(val === 'custom')
                    }}
                    style={{
                      fontSize: 11, padding: '3px 8px', borderRadius: 6,
                      border: '1px solid var(--border)', background: 'var(--bg-2)',
                      color: 'var(--fg)', cursor: 'pointer',
                    }}
                  >
                    <option value="period">By Period</option>
                    <option value="alpha">A–Z</option>
                    <option value="custom">Custom Order</option>
                  </select>
                  {sortMode === 'custom' && editingOrder && (
                    <>
                      <span style={{ fontSize: 10, color: 'var(--fg-4)' }}>
                        {isMobile ? 'Use arrows to reorder' : 'Drag cards to reorder'}
                      </span>
                      <button
                        onClick={() => setEditingOrder(false)}
                        className="btn-ghost"
                        style={{ fontSize: 11, padding: '3px 10px', height: 'auto' }}
                      >
                        Done
                      </button>
                    </>
                  )}
                  {sortMode === 'custom' && !editingOrder && (
                    <button
                      onClick={() => setEditingOrder(true)}
                      className="btn-ghost"
                      style={{ fontSize: 11, padding: '3px 8px', height: 'auto' }}
                    >
                      Edit order
                    </button>
                  )}
                </div>

                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext items={sortedClasses.map((c) => c.id)} strategy={rectSortingStrategy}>
                    <div className="class-grid">
                      {sortedClasses.map((cls, idx) => (
                        <SortableClassCard
                          key={cls.id}
                          cls={cls}
                          editingOrder={editingOrder}
                          isMobile={isMobile}
                          isFirst={idx === 0}
                          isLast={idx === sortedClasses.length - 1}
                          onMoveUp={() => moveCard(cls.id, -1)}
                          onMoveDown={() => moveCard(cls.id, 1)}
                          assignments={assignments}
                          onEdit={(e) => { e.stopPropagation(); setEditClass(cls); setClassModalOpen(true) }}
                          onDelete={(e) => { e.stopPropagation(); setDeleteClassConfirm(cls) }}
                          onAddAssignment={() => openNewAssignment(cls.id)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>

                {sortedAssignments.length > 0 && (
                  <div className="group-head" style={{ marginBottom: 16, marginTop: 28 }}>
                    <h3>Assignments</h3>
                    <div className="group-rule" />
                  </div>
                )}

                <div className="space-y-4">
                  {sortedClasses.map((cls) => {
                    const clsAssignments = sortedAssignments.filter((a) => a.class_id === cls.id)
                    if (clsAssignments.length === 0) return null
                    return (
                      <div key={cls.id} className="card overflow-hidden">
                        <div
                          className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 dark:border-gray-800"
                          style={{ borderLeftColor: cls.color, borderLeftWidth: 3 }}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">{cls.name}</span>
                            <span className="text-xs text-gray-400 dark:text-gray-500">
                              {clsAssignments.length} assignment{clsAssignments.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                          <button onClick={() => openNewAssignment(cls.id)} className="btn-ghost text-xs py-1">
                            <Plus size={13} /> Add
                          </button>
                        </div>
                        <div className="divide-y divide-gray-50 dark:divide-gray-800/60">
                          {clsAssignments.map((a) => (
                            <AssignmentRow
                              key={a.id}
                              assignment={a}
                              classData={cls}
                              onEdit={openEditAssignment}
                              showClassPill={false}
                            />
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {view === 'bydate' && (
              <div className="card overflow-hidden">
                {sortedAssignments.length === 0 ? (
                  <div className="px-4 py-12 text-center">
                    <p className="text-sm text-gray-400">No assignments yet</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50 dark:divide-gray-800/60">
                    {sortedAssignments.map((a) => {
                      const cls = classes.find((c) => c.id === a.class_id)
                      return (
                        <AssignmentRow key={a.id} assignment={a} classData={cls} onEdit={openEditAssignment} />
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {view === 'assessments' && (
              <div className="card overflow-hidden">
                {assessmentAssignments.length === 0 ? (
                  <EmptyState
                    icon={FlaskConical}
                    title="No upcoming assessments"
                    description="Quizzes and tests will appear here."
                  />
                ) : (
                  <div className="divide-y divide-gray-50 dark:divide-gray-800/60">
                    {assessmentAssignments.map((a) => {
                      const cls = classes.find((c) => c.id === a.class_id)
                      return (
                        <AssignmentRow key={a.id} assignment={a} classData={cls} onEdit={openEditAssignment} />
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <ClassModal
        isOpen={classModalOpen}
        onClose={() => { setClassModalOpen(false); setEditClass(null) }}
        editClass={editClass}
      />
      <AssignmentModal
        isOpen={assignmentModalOpen}
        onClose={() => { setAssignmentModalOpen(false); setEditAssignment(null) }}
        editAssignment={editAssignment}
        defaultClassId={defaultClassId}
      />
      <SmartImportModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
      />
      {studyModeOpen && (
        <StudyMode
          onClose={() => setStudyModeOpen(false)}
          currentClass={studyClass}
          currentAssignment={studyAssignment}
        />
      )}
      <ConfirmDeleteModal
        isOpen={!!deleteClassConfirm}
        onClose={() => setDeleteClassConfirm(null)}
        onConfirm={() => deleteClass(deleteClassConfirm.id)}
        title={`Delete ${deleteClassConfirm?.name}?`}
        description="This will permanently delete all assignments in this class. This cannot be undone."
        confirmLabel="Delete class"
      />
    </div>
  )
}
