import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Plus, GraduationCap, BookOpen, Calendar, FlaskConical, MoreHorizontal, Pencil, Trash2, Sparkles, Timer } from 'lucide-react'
import { useSchoolStore } from '../../stores/useSchoolStore'
import { useAuthStore } from '../../stores/useAuthStore'
import { getColorByValue, TYPE_CATEGORIES, getTypeByValue } from '../../lib/constants'
import EmptyState from '../../components/ui/EmptyState'
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

export default function School() {
  const { user } = useAuthStore()
  const { classes, assignments, fetchClasses, fetchAssignments, deleteClass } = useSchoolStore()
  const [view, setView] = useState('byclass')
  const [classModalOpen, setClassModalOpen] = useState(false)
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false)
  const [editClass, setEditClass] = useState(null)
  const [editAssignment, setEditAssignment] = useState(null)
  const [defaultClassId, setDefaultClassId] = useState(null)
  const [classMenuOpen, setClassMenuOpen] = useState(null)
  const [classMenuPos, setClassMenuPos] = useState(null)
  const classMenuContentRef = useRef(null)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [typeFilter, setTypeFilter] = useState('all')
  const [studyModeOpen, setStudyModeOpen] = useState(false)
  const [studyClass, setStudyClass] = useState(null)
  const [studyAssignment, setStudyAssignment] = useState(null)

  useEffect(() => {
    if (user) {
      fetchClasses(user.id)
      fetchAssignments(user.id)
    }
  }, [user])

  useEffect(() => {
    if (!classMenuOpen) return
    function handle(e) {
      if (!classMenuContentRef.current?.contains(e.target)) setClassMenuOpen(null)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [classMenuOpen])

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

  function applyTypeFilter(list) {
    if (typeFilter === 'all') return list
    return list.filter((a) => getTypeByValue(a.type)?.category === typeFilter)
  }

  return (
    <div className="max-w-[1200px] mx-auto w-full h-full flex flex-col">
      {/* Header */}
      <div className="px-4 pt-4 pb-4 md:px-8 md:pt-8 md:pb-6 border-b border-gray-100 dark:border-gray-800/60 flex-shrink-0">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
              <GraduationCap size={18} className="text-indigo-500" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">School</h1>
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            <button
              onClick={() => { setEditClass(null); setClassModalOpen(true) }}
              className="btn-ghost text-xs"
            >
              <Plus size={14} />
              <span className="hidden sm:inline">New class</span>
            </button>
            <button
              onClick={() => setImportModalOpen(true)}
              disabled={classes.length === 0}
              className="hidden md:inline-flex btn-ghost text-xs items-center gap-1"
            >
              <Sparkles size={13} />
              Quick import
            </button>
            <button
              onClick={() => { setStudyClass(null); setStudyAssignment(null); setStudyModeOpen(true) }}
              className="hidden md:inline-flex btn-ghost text-xs items-center gap-1"
            >
              <Timer size={13} />
              Study mode
            </button>
            <button
              onClick={() => openNewAssignment()}
              className="btn-primary text-xs"
              disabled={classes.length === 0}
            >
              <Plus size={14} />
              <span className="hidden sm:inline">Add assignment</span>
            </button>
          </div>
        </div>

        {/* View tabs */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-0.5">
          <div className="flex gap-1">
            {VIEWS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setView(id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  view === id
                    ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <Icon size={13} />
                {label}
              </button>
            ))}
          </div>
          <div className="h-4 w-px bg-gray-200 dark:bg-gray-700" />
          <div className="flex gap-1">
            {TYPE_CATEGORIES.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setTypeFilter(id)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  typeFilter === id
                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                    : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 md:px-8 md:py-6">
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
              <div className="space-y-6">
                {classes.map((cls) => {
                  const colorObj = getColorByValue(cls.color)
                  const clsAssignments = applyTypeFilter(sortedAssignments.filter((a) => a.class_id === cls.id))
                  return (
                    <div key={cls.id} className="card overflow-hidden">
                      {/* Class header */}
                      <div
                        className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800"
                        style={{ borderLeftColor: cls.color, borderLeftWidth: 3 }}
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: cls.color }}
                          />
                          <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                            {cls.name}
                          </span>
                          {cls.teacher && (
                            <span className="text-xs text-gray-400 dark:text-gray-500">· {cls.teacher}</span>
                          )}
                          {cls.period && (
                            <span className="text-xs text-gray-400 dark:text-gray-500">· {cls.period}</span>
                          )}
                          <span className="text-xs text-gray-400 dark:text-gray-500">
                            {clsAssignments.length} assignment{clsAssignments.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openNewAssignment(cls.id)}
                            className="btn-ghost text-xs py-1"
                          >
                            <Plus size={13} />
                            Add
                          </button>
                          <div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                if (classMenuOpen === cls.id) { setClassMenuOpen(null); return }
                                const rect = e.currentTarget.getBoundingClientRect()
                                const menuH = 72
                                const top = rect.bottom + 4 + menuH > window.innerHeight ? rect.top - menuH - 4 : rect.bottom + 4
                                setClassMenuPos({ top, right: window.innerWidth - rect.right })
                                setClassMenuOpen(cls.id)
                              }}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            >
                              <MoreHorizontal size={14} />
                            </button>
                            {classMenuOpen === cls.id && classMenuPos && createPortal(
                              <div
                                ref={classMenuContentRef}
                                style={{ position: 'fixed', top: classMenuPos.top, right: classMenuPos.right, zIndex: 9999 }}
                                className="w-32 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl shadow-xl py-1"
                              >
                                <button
                                  onClick={(e) => { e.stopPropagation(); setEditClass(cls); setClassModalOpen(true); setClassMenuOpen(null) }}
                                  className="w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2"
                                >
                                  <Pencil size={12} /> Edit
                                </button>
                                <button
                                  onClick={async (e) => { e.stopPropagation(); await deleteClass(cls.id); setClassMenuOpen(null) }}
                                  className="w-full text-left px-3 py-1.5 text-xs text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 flex items-center gap-2"
                                >
                                  <Trash2 size={12} /> Delete
                                </button>
                              </div>,
                              document.body
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Assignments */}
                      {clsAssignments.length === 0 ? (
                        <div className="px-4 py-6 text-center">
                          <p className="text-xs text-gray-400 dark:text-gray-500">No assignments yet</p>
                        </div>
                      ) : (
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
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {view === 'bydate' && (
              <div className="card overflow-hidden">
                {applyTypeFilter(sortedAssignments).length === 0 ? (
                  <div className="px-4 py-12 text-center">
                    <p className="text-sm text-gray-400">No assignments yet</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50 dark:divide-gray-800/60">
                    {applyTypeFilter(sortedAssignments).map((a) => {
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
                {applyTypeFilter(assessmentAssignments).length === 0 ? (
                  <EmptyState
                    icon={FlaskConical}
                    title="No upcoming assessments"
                    description="Quizzes and tests will appear here."
                  />
                ) : (
                  <div className="divide-y divide-gray-50 dark:divide-gray-800/60">
                    {applyTypeFilter(assessmentAssignments).map((a) => {
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
    </div>
  )
}
