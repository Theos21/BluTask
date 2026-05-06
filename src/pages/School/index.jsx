import { useState, useEffect } from 'react'
import { Plus, GraduationCap, BookOpen, Calendar, FlaskConical, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { useSchoolStore } from '../../stores/useSchoolStore'
import { useAuthStore } from '../../stores/useAuthStore'
import { getColorByValue } from '../../lib/constants'
import EmptyState from '../../components/ui/EmptyState'
import ClassModal from './ClassModal'
import AssignmentModal from './AssignmentModal'
import AssignmentRow from './AssignmentRow'

const VIEWS = [
  { id: 'byclass', label: 'By Class', icon: BookOpen },
  { id: 'bydate', label: 'By Due Date', icon: Calendar },
  { id: 'tests', label: 'Upcoming Tests', icon: FlaskConical },
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

  const sortedAssignments = [...assignments].sort(
    (a, b) => new Date(a.due_date || '9999') - new Date(b.due_date || '9999')
  )

  const testAssignments = sortedAssignments.filter((a) =>
    ['quiz', 'test'].includes(a.type) && a.status !== 'graded'
  )

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-8 pt-8 pb-6 border-b border-gray-100 dark:border-gray-800/60 flex-shrink-0">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
              <GraduationCap size={18} className="text-indigo-500" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">School</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setEditClass(null); setClassModalOpen(true) }}
              className="btn-ghost text-xs"
            >
              <Plus size={14} />
              New class
            </button>
            <button
              onClick={() => openNewAssignment()}
              className="btn-primary text-xs"
              disabled={classes.length === 0}
            >
              <Plus size={14} />
              Add assignment
            </button>
          </div>
        </div>

        {/* View tabs */}
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
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
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
                  const clsAssignments = sortedAssignments.filter((a) => a.class_id === cls.id)
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
                          <div className="relative">
                            <button
                              onClick={() => setClassMenuOpen(classMenuOpen === cls.id ? null : cls.id)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            >
                              <MoreHorizontal size={14} />
                            </button>
                            {classMenuOpen === cls.id && (
                              <div className="absolute right-0 top-8 z-10 w-32 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl shadow-lg py-1 animate-fade-in">
                                <button
                                  onClick={() => { setEditClass(cls); setClassModalOpen(true); setClassMenuOpen(null) }}
                                  className="w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2"
                                >
                                  <Pencil size={12} /> Edit
                                </button>
                                <button
                                  onClick={async () => { await deleteClass(cls.id); setClassMenuOpen(null) }}
                                  className="w-full text-left px-3 py-1.5 text-xs text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 flex items-center gap-2"
                                >
                                  <Trash2 size={12} /> Delete
                                </button>
                              </div>
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

            {view === 'tests' && (
              <div className="card overflow-hidden">
                {testAssignments.length === 0 ? (
                  <EmptyState
                    icon={FlaskConical}
                    title="No upcoming tests or quizzes"
                    description="Tests and quizzes will appear here."
                  />
                ) : (
                  <div className="divide-y divide-gray-50 dark:divide-gray-800/60">
                    {testAssignments.map((a) => {
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
    </div>
  )
}
