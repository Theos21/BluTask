import { useEffect, useState } from 'react'
import { format, isToday } from 'date-fns'
import { Clock } from 'lucide-react'
import { useAuthStore } from '../../stores/useAuthStore'
import { useSchoolStore } from '../../stores/useSchoolStore'
import { useTaskStore } from '../../stores/useTaskStore'
import { useRoutineStore } from '../../stores/useRoutineStore'
import { getGreeting } from '../../lib/utils'
import ColorPill from '../../components/ui/ColorPill'
import PriorityDot from '../../components/ui/PriorityDot'
import QuickAdd from './QuickAdd'
import DayStrip from './DayStrip'
import { cn } from '../../lib/utils'
import { showToast } from '../../lib/toast'

export default function Home() {
  const { user, profile } = useAuthStore()
  const showSchool = profile?.show_school ?? true
  const { classes, assignments, fetchClasses, fetchAssignments } = useSchoolStore()
  const { lists, tasks, fetchLists, fetchTasks, toggleTask } = useTaskStore()
  const { routineBlocks, fetchRoutineBlocks } = useRoutineStore()
  const [completingIds, setCompletingIds] = useState(new Set())

  const rawName = profile?.display_name
    || profile?.full_name?.split(' ')[0]
    || user?.email?.split('@')[0]
    || 'there'
  const displayName = rawName.charAt(0).toUpperCase() + rawName.slice(1)

  useEffect(() => {
    if (user) {
      fetchLists(user.id)
      fetchTasks(user.id)
      fetchRoutineBlocks(user.id)
      if (showSchool) {
        fetchClasses(user.id)
        fetchAssignments(user.id)
      }
    }
  }, [user, showSchool])

  const todayAssignments = assignments.filter(
    (a) => a.due_date && isToday(new Date(a.due_date)) && a.status !== 'graded'
  )

  const todayTasks = tasks.filter(
    (t) => t.due_date && !t.completed && isToday(new Date(t.due_date))
  )

  const allEmpty = todayTasks.length === 0 && (!showSchool || todayAssignments.length === 0)

  function getListData(task) {
    const INBOX = { id: 'inbox', name: 'Inbox', color: '#6b7280' }
    if (!task.list_id) return INBOX
    return lists.find((l) => l.id === task.list_id) || INBOX
  }

  function handleCompleteTask(taskId) {
    setCompletingIds((prev) => new Set([...prev, taskId]))
    setTimeout(() => {
      toggleTask(taskId, true)
      setCompletingIds((prev) => {
        const next = new Set(prev)
        next.delete(taskId)
        return next
      })
    }, 600)
    showToast({
      message: 'Task completed',
      variant: 'success',
      actions: { label: 'Undo', onClick: () => toggleTask(taskId, false) },
    })
  }

  return (
    <div className="max-w-[1200px] mx-auto w-full h-full flex flex-col md:flex-row overflow-hidden">
      {/* Left column — full width on mobile, flex-1 on desktop */}
      <div className="flex-1 overflow-y-auto px-4 py-6 md:px-10 md:py-10">
        {/* Greeting */}
        <div className="mb-6 md:mb-10">
          <h1
            className="text-gray-900 dark:text-gray-100 leading-tight"
            style={{ fontSize: 'clamp(22px, 5vw, 32px)', fontWeight: 300 }}
          >
            {getGreeting()}, {displayName}
          </h1>
          <p className="text-[13px] text-gray-400 dark:text-gray-500 mt-3 tracking-wide">
            {format(new Date(), 'EEEE, MMMM d')}
          </p>
        </div>

        {/* Quick add */}
        <div className="mb-10">
          <QuickAdd />
        </div>

        {/* Overload warning */}
        {showSchool && todayAssignments.length >= 3 && todayAssignments.some((a) => ['quiz', 'test'].includes(a.type)) && (
          <div className="mb-6 flex items-start gap-2.5 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50">
            <span className="text-amber-500 text-base leading-none mt-0.5">⚠️</span>
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Heavy day ahead</p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">You have {todayAssignments.length} assignments due including a {todayAssignments.find(a => ['quiz','test'].includes(a.type))?.type}. Consider starting early.</p>
            </div>
          </div>
        )}

        {allEmpty ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-lg font-medium text-gray-700 dark:text-gray-300">You're all caught up</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Nothing due today</p>
          </div>
        ) : (
          <>
            {/* Due from school */}
            {showSchool && (
              <section className="mb-8">
                <p className="section-label mb-4">From school</p>
                {todayAssignments.length === 0 ? (
                  <p className="text-sm italic text-gray-400 dark:text-gray-600">
                    Nothing due today
                  </p>
                ) : (
                  <div className="space-y-2">
                    {todayAssignments.map((a) => {
                      const cls = classes.find((c) => c.id === a.class_id)
                      return (
                        <div
                          key={a.id}
                          className="flex items-center gap-3 py-2.5 border-b border-gray-100 dark:border-white/[0.04] last:border-0"
                          style={cls ? { borderLeftColor: cls.color, borderLeftWidth: 2, paddingLeft: 10 } : {}}
                        >
                          {cls && <ColorPill color={cls.color} name={cls.name} size="xs" />}
                          <PriorityDot priority={a.priority} />
                          <span className="flex-1 text-sm text-gray-800 dark:text-gray-200 truncate">
                            {a.title}
                          </span>
                          <span className="text-xs text-gray-400 dark:text-gray-600 capitalize">{a.type}</span>
                          {a.due_date && (
                            <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-600">
                              <Clock size={11} />
                              {format(new Date(a.due_date), 'h:mm a')}
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </section>
            )}

            {/* Tasks due today */}
            <section>
              <p className="section-label mb-4">Tasks due today</p>
              {todayTasks.length === 0 ? (
                <p className="text-sm italic text-gray-400 dark:text-gray-600">
                  All clear for now
                </p>
              ) : (
                <div className="space-y-0.5">
                  {todayTasks.map((t) => {
                    const listData = getListData(t)
                    const completing = completingIds.has(t.id)
                    return (
                      <div
                        key={t.id}
                        className={cn(
                          'flex items-center gap-3 py-2.5 border-b border-gray-100 dark:border-white/[0.04] last:border-0 transition-opacity duration-[600ms]',
                          completing && 'opacity-0'
                        )}
                      >
                        <button
                          onClick={() => handleCompleteTask(t.id)}
                          className="w-[18px] h-[18px] rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all border-gray-300 dark:border-white/20 hover:border-teal-400 dark:hover:border-teal-500"
                        />
                        <ColorPill color={listData.color} name={listData.name} size="xs" />
                        <PriorityDot priority={t.priority} />
                        <span
                          className={cn(
                            'flex-1 text-sm text-gray-800 dark:text-gray-200 truncate',
                            completing && 'line-through text-gray-400'
                          )}
                        >
                          {t.title}
                        </span>
                        {t.due_date && (
                          <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-600">
                            <Clock size={11} />
                            {format(new Date(t.due_date), 'h:mm a')}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {/* Right column */}
      <div className="w-full border-t border-gray-100 dark:border-white/[0.04] px-4 py-6 overflow-hidden flex flex-col md:w-72 md:flex-shrink-0 md:border-t-0 md:border-l md:px-6 md:py-10">
        <DayStrip
          routineBlocks={routineBlocks}
          tasks={todayTasks}
          assignments={showSchool ? todayAssignments : []}
          classes={showSchool ? classes : []}
        />
      </div>
    </div>
  )
}
