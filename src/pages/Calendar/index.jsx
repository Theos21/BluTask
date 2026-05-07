import { useState, useEffect, useRef } from 'react'
import { CalendarIcon, ChevronLeft, ChevronRight, Plus, Settings2, Pencil, Trash2 } from 'lucide-react'
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isToday, isSameDay,
  addMonths, subMonths, addWeeks, subWeeks, getDay, isSameWeek,
} from 'date-fns'
import { useSchoolStore } from '../../stores/useSchoolStore'
import { useTaskStore } from '../../stores/useTaskStore'
import { useRoutineStore } from '../../stores/useRoutineStore'
import { useAuthStore } from '../../stores/useAuthStore'
import RoutineBlockModal from '../Watch/RoutineBlockModal'
import ConfirmDeleteModal from '../../components/ui/ConfirmDeleteModal'

const GRID_START = 6
const GRID_END = 23
const HOUR_PX = 40
const GRID_HEIGHT = (GRID_END - GRID_START) * HOUR_PX
const HOURS = Array.from({ length: GRID_END - GRID_START + 1 }, (_, i) => i + GRID_START)

function parseTimeStr(str) {
  if (!str) return 0
  const [h, m] = str.split(':').map(Number)
  return h + m / 60
}

function formatHour(h) {
  if (h === 0 || h === 24) return '12am'
  if (h === 12) return '12pm'
  return h < 12 ? `${h}am` : `${h - 12}pm`
}

export default function Calendar() {
  const [view, setView] = useState('month')
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))
  const [selectedDay, setSelectedDay] = useState(new Date())
  const [routineModalOpen, setRoutineModalOpen] = useState(false)
  const [editBlock, setEditBlock] = useState(null)
  const [defaultDay, setDefaultDay] = useState(null)
  const [showBuilderPanel, setShowBuilderPanel] = useState(false)
  const [activeBlock, setActiveBlock] = useState(null)
  const [mobileDaySheetOpen, setMobileDaySheetOpen] = useState(false)
  const [deleteBlockConfirm, setDeleteBlockConfirm] = useState(null)

  const { assignments, classes, fetchClasses, fetchAssignments } = useSchoolStore()
  const { tasks, fetchTasks } = useTaskStore()
  const { routineBlocks, fetchRoutineBlocks, deleteRoutineBlock } = useRoutineStore()
  const { user } = useAuthStore()

  const gridRef = useRef(null)

  useEffect(() => {
    if (user) {
      fetchRoutineBlocks(user.id)
      fetchClasses(user.id)
      fetchAssignments(user.id)
      fetchTasks(user.id)
    }
  }, [user])

  useEffect(() => {
    if (view === 'week' && gridRef.current) {
      gridRef.current.scrollTop = HOUR_PX * 2
    }
  }, [view])

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calStart = startOfWeek(monthStart)
  const calEnd = endOfWeek(monthEnd)
  const monthDays = eachDayOfInterval({ start: calStart, end: calEnd })

  // Build weeks and remove trailing rows with no current-month days
  const allWeeks = []
  for (let i = 0; i < monthDays.length; i += 7) {
    allWeeks.push(monthDays.slice(i, i + 7))
  }
  const monthWeeks = allWeeks.filter((week) => week.some((d) => isSameMonth(d, currentMonth)))

  const weekDays = eachDayOfInterval({ start: weekStart, end: endOfWeek(weekStart) })
  const isCurrentWeek = isSameWeek(weekStart, new Date())

  function getEventsForDay(day) {
    const asgn = assignments.filter(
      (a) => a.due_date && isSameDay(new Date(a.due_date), day)
    )
    const tsks = tasks.filter(
      (t) => t.due_date && !t.completed && isSameDay(new Date(t.due_date), day)
    )
    const dow = getDay(day)
    const blocks = routineBlocks.filter((b) => b.days_of_week?.includes(dow))
    return { assignments: asgn, tasks: tsks, blocks }
  }

  const selectedEvents = getEventsForDay(selectedDay)

  const now = new Date()
  const currentTimeY = (now.getHours() + now.getMinutes() / 60 - GRID_START) * HOUR_PX

  const isCurrentMonth = isSameMonth(currentMonth, new Date()) && currentMonth.getFullYear() === new Date().getFullYear()

  function openRoutineModal(block, dayIdx) {
    setEditBlock(block || null)
    setDefaultDay(dayIdx != null ? dayIdx : null)
    setRoutineModalOpen(true)
  }

  function handleDeleteBlock(id, e) {
    e.stopPropagation()
    const block = routineBlocks.find(b => b.id === id)
    setDeleteBlockConfirm(block || { id, name: 'this block' })
    setActiveBlock(null)
  }

  function DayDetailPanel() {
    return (
      <div className="flex flex-col h-full overflow-y-auto p-5">
        {showBuilderPanel ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="section-label">Routine Blocks</p>
              <button
                onClick={() => openRoutineModal(null, null)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <Plus size={14} />
              </button>
            </div>
            {routineBlocks.length === 0 ? (
              <p className="text-xs italic text-gray-400 dark:text-gray-600">No routine blocks yet</p>
            ) : (
              <div className="space-y-1">
                {routineBlocks.map((block) => (
                  <div
                    key={block.id}
                    className="group flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  >
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: block.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">{block.name}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {block.start_time?.slice(0, 5)} – {block.end_time?.slice(0, 5)}
                      </p>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 flex gap-0.5">
                      <button
                        onClick={(e) => { e.stopPropagation(); openRoutineModal(block, null) }}
                        className="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        <Pencil size={11} />
                      </button>
                      <button
                        onClick={(e) => handleDeleteBlock(block.id, e)}
                        className="p-1 rounded text-gray-400 hover:text-rose-500"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
              {format(selectedDay, 'EEEE, MMM d')}
            </h3>
            {selectedEvents.assignments.length === 0 &&
             selectedEvents.tasks.length === 0 &&
             selectedEvents.blocks.length === 0 ? (
              <p className="text-xs italic text-gray-400 dark:text-gray-600">Nothing scheduled this day</p>
            ) : (
              <div className="space-y-4">
                {selectedEvents.blocks.length > 0 && (
                  <div>
                    <p className="section-label mb-2">Routine</p>
                    <div className="space-y-1.5">
                      {selectedEvents.blocks
                        .slice()
                        .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''))
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
                    <p className="section-label mb-2">School</p>
                    <div className="space-y-2">
                      {selectedEvents.assignments.map((a) => {
                        const cls = classes.find((c) => c.id === a.class_id)
                        return (
                          <div key={a.id} className="flex items-start gap-2">
                            {cls && (
                              <span
                                className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
                                style={{ backgroundColor: cls.color }}
                              />
                            )}
                            <div>
                              <p className="text-xs font-medium text-gray-800 dark:text-gray-200">{a.title}</p>
                              {cls && (
                                <p className="text-xs text-gray-400">{cls.name} · {a.type}</p>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
                {selectedEvents.tasks.length > 0 && (
                  <div>
                    <p className="section-label mb-2">Tasks</p>
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
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800/60">
              <button
                onClick={() => openRoutineModal(null, null)}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <Plus size={13} />
                Quick add block
              </button>
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-[1200px] mx-auto w-full h-full flex flex-col">
      <div className="px-4 pt-4 pb-3 md:px-8 md:pt-8 md:pb-5 border-b border-gray-100 dark:border-gray-800/60 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-900/30 flex items-center justify-center">
              <CalendarIcon size={18} className="text-rose-500" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Calendar</h1>
          </div>

          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-gray-100 dark:bg-white/[0.05] p-0.5 flex">
              {['month', 'week'].map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all capitalize ${
                    view === v
                      ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-gray-100 shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
            <div className="hidden md:block h-6 w-px bg-gray-200 dark:bg-gray-700" />
            <button
              onClick={() => setShowBuilderPanel((v) => !v)}
              className={`hidden md:flex btn-ghost text-xs items-center gap-1.5 ${showBuilderPanel ? 'text-rose-500' : ''}`}
            >
              <Settings2 size={13} />
              Routine Builder
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {view === 'month' ? (
            <>
              <button
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="btn-ghost p-1.5"
              >
                <ChevronLeft size={15} />
              </button>
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 min-w-[130px] text-center">
                {format(currentMonth, 'MMMM yyyy')}
              </span>
              <button
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="btn-ghost p-1.5"
              >
                <ChevronRight size={15} />
              </button>
              {!isCurrentMonth && (
                <button
                  onClick={() => setCurrentMonth(new Date())}
                  className="text-xs text-rose-500 hover:text-rose-600 font-medium ml-1"
                >
                  Today
                </button>
              )}
            </>
          ) : (
            <>
              <button
                onClick={() => setWeekStart(subWeeks(weekStart, 1))}
                className="btn-ghost p-1.5"
              >
                <ChevronLeft size={15} />
              </button>
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 min-w-[200px] text-center">
                {format(weekStart, 'MMM d')} – {format(endOfWeek(weekStart), 'MMM d, yyyy')}
              </span>
              <button
                onClick={() => setWeekStart(addWeeks(weekStart, 1))}
                className="btn-ghost p-1.5"
              >
                <ChevronRight size={15} />
              </button>
              {!isCurrentWeek && (
                <button
                  onClick={() => setWeekStart(startOfWeek(new Date()))}
                  className="text-xs text-rose-500 hover:text-rose-600 font-medium ml-1"
                >
                  Today
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex">
        {view === 'month' ? (
          <>
            <div className="flex-1 flex flex-col overflow-hidden p-2 md:p-6">
              <div className="grid grid-cols-7 mb-2 flex-shrink-0">
                {[['Sun','S'], ['Mon','M'], ['Tue','T'], ['Wed','W'], ['Thu','T'], ['Fri','F'], ['Sat','S']].map(([full, short]) => (
                  <div
                    key={full}
                    className="text-center text-xs font-semibold text-gray-400 dark:text-gray-500 py-2"
                  >
                    <span className="hidden sm:block">{full}</span>
                    <span className="sm:hidden">{short}</span>
                  </div>
                ))}
              </div>
              <div
                className="flex-1 grid grid-cols-7 gap-1"
                style={{ gridTemplateRows: `repeat(${monthWeeks.length}, minmax(52px, 1fr))` }}
              >
                {monthWeeks.flat().map((day) => {
                  const { assignments: dayA, tasks: dayT } = getEventsForDay(day)
                  const total = dayA.length + dayT.length
                  const inMonth = isSameMonth(day, currentMonth)
                  const today = isToday(day)
                  const selected = isSameDay(day, selectedDay)

                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => { setSelectedDay(day); setMobileDaySheetOpen(true) }}
                      className={`relative p-2 rounded-xl text-left transition-colors ${
                        !inMonth ? 'opacity-30' : ''
                      } ${
                        selected
                          ? 'bg-rose-50 dark:bg-rose-900/20 ring-1 ring-rose-300 dark:ring-rose-700'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                      }`}
                    >
                      <span
                        className={`text-xs font-semibold inline-flex w-6 h-6 items-center justify-center rounded-full ${
                          today ? 'bg-rose-500 text-white' : 'text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {format(day, 'd')}
                      </span>
                      {total > 0 && (
                        <div className="mt-1 space-y-0.5">
                          {dayA.slice(0, 2).map((a) => {
                            const cls = classes.find((c) => c.id === a.class_id)
                            return (
                              <div
                                key={a.id}
                                className="text-[10px] truncate rounded px-1 py-0.5 font-medium"
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
                              className="text-[10px] truncate rounded px-1 py-0.5 bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 font-medium"
                            >
                              {t.title}
                            </div>
                          ))}
                          {total > 2 && (
                            <div className="text-[10px] text-gray-400 px-1">+{total - 2} more</div>
                          )}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="hidden md:flex flex-col w-72 flex-shrink-0 border-l border-gray-100 dark:border-gray-800/60 overflow-y-auto">
              <DayDetailPanel />
            </div>
          </>
        ) : (
          <>
            <div className="flex-1 overflow-x-auto overflow-y-hidden flex flex-col">
              <div className="flex flex-shrink-0 border-b border-gray-100 dark:border-gray-800/60">
                <div className="w-14 flex-shrink-0" />
                {weekDays.map((day, i) => {
                  const today = isToday(day)
                  return (
                    <div
                      key={i}
                      className={`flex-1 min-w-[90px] py-3 text-center border-l border-gray-100 dark:border-gray-800/60 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors ${
                        today ? 'bg-rose-50/60 dark:bg-rose-900/10' : ''
                      }`}
                      onClick={() => {
                        setSelectedDay(day)
                        setMobileDaySheetOpen(true)
                      }}
                    >
                      <p
                        className={`text-xs font-semibold uppercase tracking-wide ${
                          today ? 'text-rose-500' : 'text-gray-400 dark:text-gray-500'
                        }`}
                      >
                        {format(day, 'EEE')}
                      </p>
                      <p
                        className={`text-sm font-bold mt-0.5 ${
                          today ? 'text-rose-500' : 'text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {format(day, 'd')}
                      </p>
                    </div>
                  )
                })}
              </div>

              <div ref={gridRef} className="flex-1 overflow-y-auto">
                <div className="flex" style={{ height: GRID_HEIGHT }}>
                  <div className="w-14 flex-shrink-0 relative">
                    {HOURS.map((h) => (
                      <div
                        key={h}
                        className="absolute right-2 text-[11px] md:text-xs text-gray-400 dark:text-gray-500 select-none"
                        style={{ top: (h - GRID_START) * HOUR_PX - 8 }}
                      >
                        {formatHour(h)}
                      </div>
                    ))}
                  </div>

                  {weekDays.map((day, colIdx) => {
                    const today = isToday(day)
                    const dow = getDay(day)
                    const blocksForDay = routineBlocks.filter((b) => b.days_of_week?.includes(dow))
                    const dayAssignments = assignments.filter(
                      (a) => a.due_date && isSameDay(new Date(a.due_date), day) &&
                        a.due_time && a.due_time !== '23:59'
                    )
                    const dayTasks = tasks.filter(
                      (t) => t.due_date && !t.completed && isSameDay(new Date(t.due_date), day) &&
                        t.due_time && t.due_time !== '23:59'
                    )

                    return (
                      <div
                        key={colIdx}
                        className={`flex-1 min-w-[90px] relative border-l border-gray-100 dark:border-gray-800/40 ${
                          today ? 'bg-rose-50/10 dark:bg-rose-900/5' : ''
                        }`}
                      >
                        {HOURS.map((h) => (
                          <div
                            key={h}
                            className="absolute inset-x-0 border-t border-gray-100 dark:border-gray-800/40"
                            style={{ top: (h - GRID_START) * HOUR_PX }}
                          />
                        ))}

                        {today && currentTimeY >= 0 && currentTimeY <= GRID_HEIGHT && (
                          <div
                            className="absolute inset-x-0 z-20 flex items-center pointer-events-none"
                            style={{ top: currentTimeY }}
                          >
                            <div className="w-2 h-2 rounded-full bg-rose-500 -ml-1 flex-shrink-0" />
                            <div className="flex-1 border-t border-rose-500" />
                          </div>
                        )}

                        {blocksForDay.map((block) => {
                          const startH = parseTimeStr(block.start_time)
                          const endH = parseTimeStr(block.end_time)
                          const top = Math.max(0, (startH - GRID_START) * HOUR_PX)
                          const height = Math.max(20, (endH - startH) * HOUR_PX - 2)
                          const isActive = activeBlock === block.id

                          return (
                            <div
                              key={block.id}
                              className="absolute inset-x-1 z-10 rounded-lg px-2 py-1 cursor-pointer select-none overflow-visible"
                              style={{
                                top,
                                height,
                                backgroundColor: block.color + '28',
                                borderLeft: `3px solid ${block.color}`,
                              }}
                              onClick={(e) => {
                                e.stopPropagation()
                                setActiveBlock(isActive ? null : block.id)
                              }}
                            >
                              <p
                                className="text-xs font-semibold truncate leading-tight"
                                style={{ color: block.color }}
                              >
                                {block.name}
                              </p>
                              {height >= 36 && (
                                <p
                                  className="text-xs opacity-70 truncate"
                                  style={{ color: block.color }}
                                >
                                  {block.start_time?.slice(0, 5)} – {block.end_time?.slice(0, 5)}
                                </p>
                              )}

                              {isActive && (
                                <div
                                  className="absolute left-0 top-full mt-1 z-30 w-44 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl shadow-xl p-3"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 mb-0.5">{block.name}</p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                                    {block.start_time?.slice(0, 5)} – {block.end_time?.slice(0, 5)}
                                  </p>
                                  {block.notes && (
                                    <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">{block.notes}</p>
                                  )}
                                  <div className="flex gap-1.5">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setActiveBlock(null)
                                        openRoutineModal(block, null)
                                      }}
                                      className="flex-1 py-1 rounded-lg text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      onClick={(e) => handleDeleteBlock(block.id, e)}
                                      className="flex-1 py-1 rounded-lg text-xs font-medium bg-rose-50 dark:bg-rose-900/20 text-rose-500 hover:bg-rose-100"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })}

                        {dayAssignments.map((a) => {
                          const cls = classes.find((c) => c.id === a.class_id)
                          const color = cls?.color || '#6366f1'
                          const timeH = parseTimeStr(a.due_time)
                          if (timeH < GRID_START || timeH > GRID_END) return null
                          const top = (timeH - GRID_START) * HOUR_PX
                          return (
                            <div
                              key={a.id}
                              className="absolute inset-x-1 z-10 rounded px-1.5 py-1 overflow-hidden"
                              style={{
                                top,
                                height: 28,
                                backgroundColor: color + '28',
                                borderLeft: `3px solid ${color}`,
                              }}
                            >
                              <p className="text-[10px] font-semibold truncate leading-tight" style={{ color }}>
                                {a.title}
                              </p>
                            </div>
                          )
                        })}

                        {dayTasks.map((t) => {
                          const timeH = parseTimeStr(t.due_time)
                          if (timeH < GRID_START || timeH > GRID_END) return null
                          const top = (timeH - GRID_START) * HOUR_PX
                          return (
                            <div
                              key={t.id}
                              className="absolute inset-x-1 z-10 rounded px-1.5 py-1 overflow-hidden bg-teal-500/20 border-l-[3px] border-teal-500"
                              style={{ top, height: 28 }}
                            >
                              <p className="text-[10px] font-semibold truncate leading-tight text-teal-600 dark:text-teal-400">
                                {t.title}
                              </p>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="hidden md:flex flex-col w-64 flex-shrink-0 border-l border-gray-100 dark:border-gray-800/60 overflow-y-auto">
              <DayDetailPanel />
            </div>
          </>
        )}
      </div>

      {mobileDaySheetOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30 md:hidden"
            onClick={() => setMobileDaySheetOpen(false)}
          />
          <div
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 md:hidden flex flex-col"
            style={{ height: '70vh' }}
          >
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1 rounded-full bg-gray-200 dark:bg-gray-700" />
            </div>
            <div className="flex-1 overflow-y-auto">
              <DayDetailPanel />
            </div>
          </div>
        </>
      )}

      <ConfirmDeleteModal
        isOpen={!!deleteBlockConfirm}
        onClose={() => setDeleteBlockConfirm(null)}
        onConfirm={() => deleteRoutineBlock(deleteBlockConfirm.id)}
        title={`Delete "${deleteBlockConfirm?.name}"?`}
        description="This routine block will be permanently removed from your schedule. This cannot be undone."
        confirmLabel="Delete block"
      />
      <RoutineBlockModal
        isOpen={routineModalOpen}
        onClose={() => { setRoutineModalOpen(false); setEditBlock(null) }}
        editBlock={editBlock}
        defaultDay={defaultDay}
      />
    </div>
  )
}
