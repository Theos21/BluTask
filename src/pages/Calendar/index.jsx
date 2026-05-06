import { useState, useEffect } from 'react'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react'
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isToday, isSameDay, addMonths, subMonths, getDay
} from 'date-fns'
import { useSchoolStore } from '../../stores/useSchoolStore'
import { useTaskStore } from '../../stores/useTaskStore'
import { useRoutineStore } from '../../stores/useRoutineStore'
import { useAuthStore } from '../../stores/useAuthStore'
import { getColorByValue } from '../../lib/constants'

export default function Calendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState(new Date())
  const { assignments, classes } = useSchoolStore()
  const { tasks } = useTaskStore()
  const { routineBlocks, fetchRoutineBlocks } = useRoutineStore()
  const { user } = useAuthStore()

  useEffect(() => {
    if (user) fetchRoutineBlocks(user.id)
  }, [user])

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calStart = startOfWeek(monthStart)
  const calEnd = endOfWeek(monthEnd)
  const days = eachDayOfInterval({ start: calStart, end: calEnd })

  function getEventsForDay(day) {
    const asgn = assignments.filter((a) => a.due_date && isSameDay(new Date(a.due_date), day))
    const tsks = tasks.filter((t) => t.due_date && !t.completed && isSameDay(new Date(t.due_date), day))
    const dow = getDay(day)
    const blocks = routineBlocks.filter((b) => b.days_of_week?.includes(dow))
    return { assignments: asgn, tasks: tsks, blocks }
  }

  const selectedEvents = getEventsForDay(selectedDay)

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-8 pt-8 pb-6 border-b border-gray-100 dark:border-gray-800/60 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-900/30 flex items-center justify-center">
              <CalendarIcon size={18} className="text-rose-500" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Calendar</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="btn-ghost p-2"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 min-w-[120px] text-center">
              {format(currentMonth, 'MMMM yyyy')}
            </span>
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="btn-ghost p-2"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Calendar grid */}
        <div className="flex-1 overflow-y-auto p-8">
          {/* Day headers */}
          <div className="grid grid-cols-7 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="text-center text-xs font-semibold text-gray-400 dark:text-gray-500 py-2">
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day) => {
              const { assignments: dayA, tasks: dayT } = getEventsForDay(day)
              const total = dayA.length + dayT.length
              const inMonth = isSameMonth(day, currentMonth)
              const today = isToday(day)
              const selected = isSameDay(day, selectedDay)

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDay(day)}
                  className={`relative min-h-[72px] p-2 rounded-xl text-left transition-colors ${
                    !inMonth ? 'opacity-30' : ''
                  } ${
                    selected
                      ? 'bg-rose-50 dark:bg-rose-900/20 ring-1 ring-rose-300 dark:ring-rose-700'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                  }`}
                >
                  <span className={`text-xs font-semibold inline-flex w-6 h-6 items-center justify-center rounded-full ${
                    today
                      ? 'bg-rose-500 text-white'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}>
                    {format(day, 'd')}
                  </span>
                  {total > 0 && (
                    <div className="mt-1 space-y-0.5">
                      {dayA.slice(0, 2).map((a) => {
                        const cls = classes.find((c) => c.id === a.class_id)
                        return (
                          <div
                            key={a.id}
                            className="text-xs truncate rounded px-1 py-0.5"
                            style={{
                              backgroundColor: cls ? cls.color + '25' : '#6366f125',
                              color: cls ? cls.color : '#6366f1',
                            }}
                          >
                            {a.title}
                          </div>
                        )
                      })}
                      {dayT.slice(0, total > 2 ? 1 : 2).map((t) => (
                        <div
                          key={t.id}
                          className="text-xs truncate rounded px-1 py-0.5 bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400"
                        >
                          {t.title}
                        </div>
                      ))}
                      {total > 2 && (
                        <div className="text-xs text-gray-400 px-1">+{total - 2} more</div>
                      )}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Day detail panel */}
        <div className="w-72 flex-shrink-0 border-l border-gray-100 dark:border-gray-800/60 p-6 overflow-y-auto">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
            {format(selectedDay, 'EEEE, MMM d')}
          </h3>

          {selectedEvents.assignments.length === 0 && selectedEvents.tasks.length === 0 && selectedEvents.blocks.length === 0 ? (
            <p className="text-xs text-gray-400 dark:text-gray-500">Nothing scheduled this day</p>
          ) : (
            <div className="space-y-4">
              {selectedEvents.blocks.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Routine</p>
                  <div className="space-y-1.5">
                    {selectedEvents.blocks
                      .sort((a, b) => a.start_time.localeCompare(b.start_time))
                      .map((b) => (
                      <div
                        key={b.id}
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg"
                        style={{ backgroundColor: b.color + '18', borderLeft: `3px solid ${b.color}` }}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate" style={{ color: b.color }}>{b.name}</p>
                          <p className="text-xs opacity-60 truncate" style={{ color: b.color }}>
                            {b.start_time?.slice(0, 5)} – {b.end_time?.slice(0, 5)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {selectedEvents.assignments.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">School</p>
                  <div className="space-y-2">
                    {selectedEvents.assignments.map((a) => {
                      const cls = classes.find((c) => c.id === a.class_id)
                      return (
                        <div key={a.id} className="flex items-start gap-2">
                          {cls && (
                            <span className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ backgroundColor: cls.color }} />
                          )}
                          <div>
                            <p className="text-xs font-medium text-gray-800 dark:text-gray-200">{a.title}</p>
                            {cls && <p className="text-xs text-gray-400">{cls.name} · {a.type}</p>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
              {selectedEvents.tasks.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Tasks</p>
                  <div className="space-y-2">
                    {selectedEvents.tasks.map((t) => (
                      <div key={t.id} className="flex items-start gap-2">
                        <span className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5 bg-teal-400" />
                        <p className="text-xs font-medium text-gray-800 dark:text-gray-200">{t.title}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
