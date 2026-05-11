import * as React from "react"
import { createPortal } from "react-dom"
import { format } from "date-fns"
import { Calendar as CalendarIcon, Clock } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

function computeDateTime(date, hour, minute, ampm) {
  if (!date) return null
  const d = new Date(date)
  let h = parseInt(hour)
  if (ampm === "PM" && h < 12) h += 12
  if (ampm === "AM" && h === 12) h = 0
  d.setHours(h, parseInt(minute), 0, 0)
  return d
}

function initFromISO(iso) {
  if (!iso) return { date: undefined, hour: "12", minute: "00", ampm: "AM" }
  const d = new Date(iso)
  const rawHour = d.getHours()
  const h = rawHour % 12 || 12
  const m = Math.round(d.getMinutes() / 5) * 5 % 60
  return {
    date: d,
    hour: h.toString().padStart(2, "0"),
    minute: m.toString().padStart(2, "0"),
    ampm: rawHour >= 12 ? "PM" : "AM",
  }
}

export default function DateTimePicker({
  value,
  onChange,
  placeholder,
  className,
  dateOnly = false,
}) {
  const defaultPlaceholder = dateOnly ? "Pick a date" : "Pick a date & time"
  const resolvedPlaceholder = placeholder ?? defaultPlaceholder

  const init = React.useMemo(() => initFromISO(value), [])

  const [date, setDate] = React.useState(init.date)
  const [hour, setHour] = React.useState(init.hour)
  const [minute, setMinute] = React.useState(init.minute)
  const [ampm, setAmpm] = React.useState(init.ampm)
  const [open, setOpen] = React.useState(false)
  const [isMobile, setIsMobile] = React.useState(() => window.innerWidth < 640)

  React.useEffect(() => {
    function check() { setIsMobile(window.innerWidth < 640) }
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [])

  function notify(d, h, m, ap) {
    if (!d) { onChange?.(null); return }
    if (dateOnly) {
      const out = new Date(d)
      out.setHours(12, 0, 0, 0)
      onChange?.(out.toISOString())
      return
    }
    const dt = computeDateTime(d, h, m, ap)
    onChange?.(dt ? dt.toISOString() : null)
  }

  function handleDateSelect(newDate) {
    setDate(newDate)
    notify(newDate, hour, minute, ampm)
    if (newDate) setOpen(false)
  }

  function handleHour(h) { setHour(h); notify(date, h, minute, ampm) }
  function handleMinute(m) { setMinute(m); notify(date, hour, m, ampm) }
  function handleAmpm(ap) { setAmpm(ap); notify(date, hour, minute, ap) }

  function handleClear() { setDate(undefined); onChange?.(null) }

  const displayValue = date
    ? dateOnly
      ? format(date, "MMM d, yyyy")
      : `${format(date, "MMM d, yyyy")} at ${hour}:${minute} ${ampm}`
    : null

  const calendarNode = (
    <Calendar mode="single" selected={date} onSelect={handleDateSelect} initialFocus />
  )

  const triggerClassName = cn(
    "w-full justify-start text-left font-normal h-9 px-3 text-sm",
    "bg-gray-50 dark:bg-white/[0.05] border-gray-200 dark:border-white/[0.08]",
    "hover:bg-gray-100 dark:hover:bg-white/[0.08] text-gray-900 dark:text-gray-100",
    !date && "text-gray-400 dark:text-gray-600"
  )

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {/* Date picker: popover on desktop, centered modal on mobile */}
      {isMobile ? (
        <>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className={cn(triggerClassName, "flex items-center rounded-lg border")}
          >
            <CalendarIcon className="mr-2 h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
            {displayValue || <span>{resolvedPlaceholder}</span>}
          </button>
          {open && createPortal(
            <>
              <div
                className="fixed inset-0 z-[9990] bg-black/50 backdrop-blur-sm"
                onClick={() => setOpen(false)}
              />
              <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-[9991] bg-white dark:bg-[#131b24] rounded-2xl p-4 shadow-2xl flex justify-center">
                {calendarNode}
              </div>
            </>,
            document.body
          )}
        </>
      ) : (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className={triggerClassName}>
              <CalendarIcon className="mr-2 h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
              {displayValue || <span>{resolvedPlaceholder}</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="p-0 w-fit z-[9999]"
            align="start"
            side="top"
            sideOffset={6}
          >
            {calendarNode}
          </PopoverContent>
        </Popover>
      )}

      {/* Time picker - hidden for dateOnly */}
      {!dateOnly && (
        <div className="flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 text-gray-400 dark:text-gray-600 flex-shrink-0" />
          <Select value={hour} onValueChange={handleHour}>
            <SelectTrigger className="w-[62px] h-8 text-sm bg-gray-50 dark:bg-white/[0.05] border-gray-200 dark:border-white/[0.08]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => {
                const h = (i + 1).toString().padStart(2, "0")
                return <SelectItem key={h} value={h}>{h}</SelectItem>
              })}
            </SelectContent>
          </Select>
          <span className="text-gray-400 text-sm">:</span>
          <Select value={minute} onValueChange={handleMinute}>
            <SelectTrigger className="w-[64px] h-8 text-sm bg-gray-50 dark:bg-white/[0.05] border-gray-200 dark:border-white/[0.08]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"].map((m) => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={ampm} onValueChange={handleAmpm}>
            <SelectTrigger className="w-[64px] h-8 text-sm bg-gray-50 dark:bg-white/[0.05] border-gray-200 dark:border-white/[0.08]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="AM">AM</SelectItem>
              <SelectItem value="PM">PM</SelectItem>
            </SelectContent>
          </Select>
          {date && (
            <button
              type="button"
              onClick={handleClear}
              className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-400 transition-colors ml-1"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {dateOnly && date && (
        <button
          type="button"
          onClick={handleClear}
          className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-400 transition-colors self-start"
        >
          Clear
        </button>
      )}
    </div>
  )
}
