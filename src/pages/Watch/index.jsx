import { useState, useEffect, useRef } from 'react'
import { Plus, Clock, Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import {
  startOfWeek, endOfWeek, eachDayOfInterval, format, isToday,
  addWeeks, subWeeks, isSameWeek
} from 'date-fns'
import { useRoutineStore } from '../../stores/useRoutineStore'
import { useAuthStore } from '../../stores/useAuthStore'
import { getColorByValue, DAYS_OF_WEEK } from '../../lib/constants'
import EmptyState from '../../components/ui/EmptyState'
import RoutineBlockModal from './RoutineBlockModal'

const GRID_START = 6   // 6am
const GRID_END = 23    // 11pm
const HOUR_PX = 64
const GRID_HEIGHT = (GRID_END - GRID_START) * HOUR_PX

const HOURS = Array.from({ length: GRID_END - GRID_START + 1 }, (_, i) => i + GRID_START)

function parseTimeStr(str) {
  if (!str) return 0
  const [h, m] = str.split(':').map(Number)
  return h + m / 60
}

function blockStyle(startTime, endTime) {
  const start = parseTimeStr(startTime)
  const end = parseTimeStr(endTime)
  const top = Math.max(0, (start - GRID_START) * HOUR_PX)
  const height = Math.max(20, (end - start) * HOUR_PX - 2)
  return { top, height }
}

function formatHour(h) {
  if (h === 0 || h === 24) return '12am'
  if (h === 12) return '12pm'
  return h < 12 ? `${h}am` : `${h - 12}pm`
}

export default function Watch() {
  const { user } = useAuthStore()
  const { routineBlocks, fetchRoutineBlocks, deleteRoutineBlock } = useRoutineStore()
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))
  const [modalOpen, setModalOpen] = useState(false)
  const [editBlock, setEditBlock] = useState(null)
  const [defaultDay, setDefaultDay] = useState(null)
  const [activeBlock, setActiveBlock] = useState(null)
  const gridRef = useRef(null)

  const days = eachDayOfInterval({ start: weekStart, end: endOfWeek(weekStart) })
  const isCurrentWeek = isSameWeek(weekStart, new Date())

  useEffect(() => {
    if (user) fetchRoutineBlocks(user.id)
  }, [user])

  // Scroll to 7am on mount
  useEffect(() => {
    if (gridRef.current) {
      gridRef.current.scrollTop = HOUR_PX
    }
  }, [])

  // Current time Y position
  const now = new Date()
  const currentTimeY = (now.getHours() + now.getMinutes() / 60 - GRID_START) * HOUR_PX

  function openNew(dayIndex = null) {
    setEditBlock(null)
    setDefaultDay(dayIndex)
    setModalOpen(true)
  }

  function openEdit(block, e) {
    e.stopPropagation()
    setEditBlock(block)
    setDefaultDay(null)
    setModalOpen(true)
  }

  async function handleDelete(id, e) {
    e.stopPropagation()
    setActiveBlock(null)
    await deleteRoutineBlock(id)
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-950">
      {/* Header */}
      <div className="px-8 pt-8 pb-5 border-b border-gray-100 dark:border-gray-800/60 flex-shrink-0">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center">
              <Clock size={18} className="text-amber-500" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Watch</h1>
          </div>
          <button onClick={() => openNew()} className="btn-primary text-xs">
            <Plus size={14} />
            New block
          </button>
        </div>

        {/* Week navigation */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setWeekStart(subWeeks(weekStart, 1))}
            className="btn-ghost p-1.5"
          >
            <ChevronLeft size={15} />
          </button>
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 min-w-[180px] text-center">
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
              className="text-xs text-amber-500 hover:text-amber-600 font-medium ml-1"
            >
              Today
            </button>
          )}
        </div>
      </div>

      {/* Block list sidebar + Grid */}
      <div className="flex flex-1 overflow-hidden">

        {/* Blocks list */}
        <div className="w-52 flex-shrink-0 border-r border-gray-100 dark:border-gray-800/60 overflow-y-auto py-4 px-3 space-y-1">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide px-2 mb-2">
            All blocks ({routineBlocks.length})
          </p>
          {routineBlocks.length === 0 ? (
            <p className="text-xs text-gray-400 dark:text-gray-500 px-2">No blocks yet</p>
          ) : (
            routineBlocks.map((block) => (
              <div
                key={block.id}
                className="group flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-default"
              >
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
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
                    onClick={(e) => openEdit(block, e)}
                    className="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <Pencil size={11} />
                  </button>
                  <button
                    onClick={(e) => handleDelete(block.id, e)}
                    className="p-1 rounded text-gray-400 hover:text-rose-500"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Calendar grid */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Day headers */}
          <div className="flex flex-shrink-0 border-b border-gray-100 dark:border-gray-800/60">
            <div className="w-14 flex-shrink-0" />
            {days.map((day, i) => {
              const today = isToday(day)
              return (
                <div
                  key={i}
                  className={`flex-1 py-3 text-center border-l border-gray-100 dark:border-gray-800/60 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors ${
                    today ? 'bg-amber-50/60 dark:bg-amber-900/10' : ''
                  }`}
                  onClick={() => openNew(i)}
                  title="Click to add a block"
                >
                  <p className={`text-xs font-semibold uppercase tracking-wide ${
                    today ? 'text-amber-500' : 'text-gray-400 dark:text-gray-500'
                  }`}>
                    {DAYS_OF_WEEK[i]}
                  </p>
                  <p className={`text-sm font-bold mt-0.5 ${
                    today
                      ? 'text-amber-500'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}>
                    {format(day, 'd')}
                  </p>
                </div>
              )
            })}
          </div>

          {/* Scrollable time grid */}
          <div ref={gridRef} className="flex-1 overflow-y-auto">
            <div className="flex" style={{ height: GRID_HEIGHT }}>
              {/* Time labels */}
              <div className="w-14 flex-shrink-0 relative">
                {HOURS.map((h) => (
                  <div
                    key={h}
                    className="absolute right-2 text-xs text-gray-400 dark:text-gray-500 select-none"
                    style={{ top: (h - GRID_START) * HOUR_PX - 8 }}
                  >
                    {formatHour(h)}
                  </div>
                ))}
              </div>

              {/* Day columns */}
              {days.map((day, colIdx) => {
                const today = isToday(day)
                const blocksForDay = routineBlocks.filter((b) =>
                  b.days_of_week?.includes(colIdx)
                )

                return (
                  <div
                    key={colIdx}
                    className={`flex-1 relative border-l border-gray-100 dark:border-gray-800/40 ${
                      today ? 'bg-amber-50/30 dark:bg-amber-900/5' : ''
                    }`}
                  >
                    {/* Hour lines */}
                    {HOURS.map((h) => (
                      <div
                        key={h}
                        className="absolute inset-x-0 border-t border-gray-100 dark:border-gray-800/40"
                        style={{ top: (h - GRID_START) * HOUR_PX }}
                      />
                    ))}

                    {/* Current time line — only on today's column */}
                    {today && currentTimeY >= 0 && currentTimeY <= GRID_HEIGHT && (
                      <div
                        className="absolute inset-x-0 z-20 flex items-center pointer-events-none"
                        style={{ top: currentTimeY }}
                      >
                        <div className="w-2 h-2 rounded-full bg-amber-500 -ml-1 flex-shrink-0" />
                        <div className="flex-1 border-t-2 border-amber-500" />
                      </div>
                    )}

                    {/* Routine blocks */}
                    {blocksForDay.map((block) => {
                      const { top, height } = blockStyle(block.start_time, block.end_time)
                      const isActive = activeBlock === block.id
                      return (
                        <div
                          key={block.id}
                          className="absolute inset-x-1 z-10 rounded-lg px-2 py-1 cursor-pointer select-none overflow-hidden group"
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
                            <p className="text-xs opacity-70 truncate" style={{ color: block.color }}>
                              {block.start_time?.slice(0, 5)} – {block.end_time?.slice(0, 5)}
                            </p>
                          )}

                          {/* Popover on click */}
                          {isActive && (
                            <div
                              className="absolute left-0 top-full mt-1 z-30 w-44 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl shadow-xl p-3 animate-fade-in"
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
                                  onClick={(e) => openEdit(block, e)}
                                  className="flex-1 py-1 rounded-lg text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={(e) => handleDelete(block.id, e)}
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
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      <RoutineBlockModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditBlock(null) }}
        editBlock={editBlock}
        defaultDay={defaultDay}
      />
    </div>
  )
}
