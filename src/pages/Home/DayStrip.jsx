import { getDay } from 'date-fns'

const STRIP_START = 7    // 7am
const STRIP_END   = 22   // 10pm
const HOUR_PX     = 52
const STRIP_HEIGHT = (STRIP_END - STRIP_START) * HOUR_PX

const HOURS = Array.from({ length: STRIP_END - STRIP_START + 1 }, (_, i) => i + STRIP_START)

function parseTimeStr(str) {
  const [h, m] = str.split(':').map(Number)
  return h + m / 60
}

function dateToDecimalHours(dateStr) {
  const d = new Date(dateStr)
  return d.getHours() + d.getMinutes() / 60
}

function formatH(h) {
  if (h === 0 || h === 24) return '12am'
  if (h === 12) return '12pm'
  return h < 12 ? `${h}am` : `${h - 12}pm`
}

export default function DayStrip({ routineBlocks, tasks, assignments, classes }) {
  const now = new Date()
  const todayDow = getDay(now)
  const currentDecimal = now.getHours() + now.getMinutes() / 60
  const currentY = (currentDecimal - STRIP_START) * HOUR_PX

  const todayBlocks = routineBlocks.filter((b) => b.days_of_week?.includes(todayDow))

  const events = [
    ...tasks
      .filter((t) => t.due_date && !t.completed)
      .map((t) => ({
        id: t.id,
        title: t.title,
        hours: dateToDecimalHours(t.due_date),
        color: '#14b8a6',
      })),
    ...assignments
      .filter((a) => a.due_date)
      .map((a) => {
        const cls = classes.find((c) => c.id === a.class_id)
        return {
          id: a.id,
          title: a.title,
          hours: dateToDecimalHours(a.due_date),
          color: cls?.color || '#6366f1',
          className: cls?.name,
        }
      }),
  ].filter((e) => e.hours >= STRIP_START && e.hours <= STRIP_END)

  return (
    <div className="flex flex-col h-full">
      <p className="section-label mb-5">Today's schedule</p>

      <div className="flex-1 overflow-y-auto">
        <div className="relative flex" style={{ height: STRIP_HEIGHT }}>
          {/* Time labels */}
          <div className="w-8 flex-shrink-0 relative select-none">
            {HOURS.filter((h) => h % 2 === 0).map((h) => (
              <div
                key={h}
                className="absolute right-1 text-[10px] text-gray-400 dark:text-gray-700 leading-none"
                style={{ top: (h - STRIP_START) * HOUR_PX - 5 }}
              >
                {formatH(h)}
              </div>
            ))}
          </div>

          {/* Time column */}
          <div className="flex-1 relative ml-2">
            {/* Hour lines */}
            {HOURS.map((h) => (
              <div
                key={h}
                className="absolute inset-x-0 border-t border-gray-100 dark:border-white/[0.05]"
                style={{ top: (h - STRIP_START) * HOUR_PX }}
              />
            ))}

            {/* Current time - red line */}
            {currentY >= 0 && currentY <= STRIP_HEIGHT && (
              <div
                className="absolute inset-x-0 z-20 flex items-center pointer-events-none"
                style={{ top: currentY }}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 -ml-[3px] flex-shrink-0" />
                <div className="flex-1 border-t border-red-500 opacity-70" />
              </div>
            )}

            {/* Routine blocks */}
            {todayBlocks.map((block) => {
              const startH = parseTimeStr(block.start_time)
              const endH   = parseTimeStr(block.end_time)
              const top    = Math.max(0, (startH - STRIP_START) * HOUR_PX)
              const height = Math.max(16, (endH - startH) * HOUR_PX - 2)
              return (
                <div
                  key={block.id}
                  className="absolute inset-x-0 rounded-md px-2 py-1 overflow-hidden"
                  style={{
                    top,
                    height,
                    backgroundColor: block.color + '18',
                    borderLeft: `2px solid ${block.color}`,
                  }}
                >
                  <p
                    className="text-[11px] font-medium truncate leading-tight"
                    style={{ color: block.color }}
                  >
                    {block.name}
                  </p>
                  {height >= 34 && (
                    <p className="text-[10px] truncate opacity-60" style={{ color: block.color }}>
                      {block.start_time?.slice(0, 5)} – {block.end_time?.slice(0, 5)}
                    </p>
                  )}
                </div>
              )
            })}

            {/* Due events */}
            {events.map((ev) => {
              const top = (ev.hours - STRIP_START) * HOUR_PX
              return (
                <div
                  key={ev.id}
                  className="absolute inset-x-0 z-10 flex items-center gap-1.5 px-2 py-1 rounded-md"
                  style={{
                    top: top - 12,
                    backgroundColor: ev.color + '14',
                    borderLeft: `2px solid ${ev.color}`,
                    minHeight: 22,
                  }}
                >
                  <p className="text-[11px] font-medium truncate" style={{ color: ev.color }}>
                    {ev.title}
                    {ev.className && (
                      <span className="opacity-50 ml-1">· {ev.className}</span>
                    )}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
