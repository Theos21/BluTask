import { format, isToday, isTomorrow, isThisWeek, isPast, differenceInHours } from 'date-fns'

export function formatDueDate(dateStr) {
  if (!dateStr) return null
  const date = new Date(dateStr)
  if (isToday(date)) return `Today ${format(date, 'h:mm a')}`
  if (isTomorrow(date)) return `Tomorrow ${format(date, 'h:mm a')}`
  if (isThisWeek(date)) return format(date, 'EEE h:mm a')
  return format(date, 'MMM d, h:mm a')
}

export function isDueWithin24Hours(dateStr) {
  if (!dateStr) return false
  const date = new Date(dateStr)
  const hours = differenceInHours(date, new Date())
  return hours >= 0 && hours <= 24
}

export function isOverdue(dateStr) {
  if (!dateStr) return false
  return isPast(new Date(dateStr))
}

export function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export function capitalize(str) {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1)
}

import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}
