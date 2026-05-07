export const CLASS_COLORS = [
  { name: 'Indigo', value: '#6366f1', bg: 'bg-indigo-500', text: 'text-indigo-600', light: 'bg-indigo-50 text-indigo-700', dark: 'dark:bg-indigo-900/40 dark:text-indigo-300' },
  { name: 'Rose', value: '#f43f5e', bg: 'bg-rose-500', text: 'text-rose-600', light: 'bg-rose-50 text-rose-700', dark: 'dark:bg-rose-900/40 dark:text-rose-300' },
  { name: 'Amber', value: '#f59e0b', bg: 'bg-amber-500', text: 'text-amber-700', light: 'bg-amber-50 text-amber-700', dark: 'dark:bg-amber-900/40 dark:text-amber-300' },
  { name: 'Teal', value: '#14b8a6', bg: 'bg-teal-500', text: 'text-teal-600', light: 'bg-teal-50 text-teal-700', dark: 'dark:bg-teal-900/40 dark:text-teal-300' },
  { name: 'Violet', value: '#8b5cf6', bg: 'bg-violet-500', text: 'text-violet-600', light: 'bg-violet-50 text-violet-700', dark: 'dark:bg-violet-900/40 dark:text-violet-300' },
  { name: 'Sky', value: '#0ea5e9', bg: 'bg-sky-500', text: 'text-sky-600', light: 'bg-sky-50 text-sky-700', dark: 'dark:bg-sky-900/40 dark:text-sky-300' },
  { name: 'Green', value: '#22c55e', bg: 'bg-green-500', text: 'text-green-600', light: 'bg-green-50 text-green-700', dark: 'dark:bg-green-900/40 dark:text-green-300' },
  { name: 'Orange', value: '#f97316', bg: 'bg-orange-500', text: 'text-orange-600', light: 'bg-orange-50 text-orange-700', dark: 'dark:bg-orange-900/40 dark:text-orange-300' },
  { name: 'Pink', value: '#ec4899', bg: 'bg-pink-500', text: 'text-pink-600', light: 'bg-pink-50 text-pink-700', dark: 'dark:bg-pink-900/40 dark:text-pink-300' },
  { name: 'Lime', value: '#84cc16', bg: 'bg-lime-500', text: 'text-lime-600', light: 'bg-lime-50 text-lime-700', dark: 'dark:bg-lime-900/40 dark:text-lime-300' },
]

export const ASSIGNMENT_TYPES = [
  { value: 'homework',     label: 'Homework',     category: 'general' },
  { value: 'assignment',   label: 'Assignment',   category: 'general' },
  { value: 'essay',        label: 'Essay',        category: 'writing' },
  { value: 'lab_report',   label: 'Lab Report',   category: 'lab' },
  { value: 'project',      label: 'Project',      category: 'longterm' },
  { value: 'reading',      label: 'Reading',      category: 'longterm' },
  { value: 'quiz',         label: 'Quiz',         category: 'assessment' },
  { value: 'test',         label: 'Test',         category: 'assessment' },
  { value: 'presentation', label: 'Presentation', category: 'writing' },
  { value: 'worksheet',    label: 'Worksheet',    category: 'general' },
  { value: 'problem_set',  label: 'Problem Set',  category: 'general' },
  { value: 'classwork',    label: 'Classwork',    category: 'general' },
  { value: 'research',     label: 'Research',     category: 'writing' },
]

export const TYPE_CATEGORIES = [
  { id: 'all',        label: 'All' },
  { id: 'assessment', label: 'Assessments' },
  { id: 'writing',    label: 'Writing' },
  { id: 'lab',        label: 'Lab' },
  { id: 'general',    label: 'General' },
  { id: 'longterm',   label: 'Long term' },
]

export const TYPE_PILL_STYLES = {
  assessment: 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400',
  writing:    'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
  lab:        'bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400',
  general:    'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400',
  longterm:   'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
}

export function getTypeByValue(value) {
  // Graceful fallback: handle legacy values (lab → lab_report, etc.)
  return ASSIGNMENT_TYPES.find((t) => t.value === value)
    || ASSIGNMENT_TYPES.find((t) => t.value === 'homework')
}

export const ASSIGNMENT_STATUSES = [
  { value: 'todo', label: 'To Do' },
  { value: 'inprogress', label: 'In Progress' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'graded', label: 'Graded' },
]

export const PRIORITIES = [
  { value: 'normal', label: 'Normal', color: 'bg-gray-400' },
  { value: 'important', label: 'Important', color: 'bg-amber-400' },
  { value: 'urgent', label: 'Urgent', color: 'bg-rose-500' },
]

export const REPEAT_RULES = [
  { value: '', label: 'No repeat' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekdays', label: 'Weekdays' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'monthly', label: 'Monthly' },
]

export const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export const ACCENT_COLORS = [
  { name: 'Indigo',  hex: '#6366f1' },
  { name: 'Violet',  hex: '#8b5cf6' },
  { name: 'Blue',    hex: '#3b82f6' },
  { name: 'Teal',    hex: '#14b8a6' },
  { name: 'Rose',    hex: '#f43f5e' },
  { name: 'Orange',  hex: '#f97316' },
]

export const AVATAR_COLORS = [
  '#6366f1', '#8b5cf6', '#3b82f6', '#0ea5e9',
  '#14b8a6', '#22c55e', '#f59e0b', '#f97316',
  '#f43f5e', '#ec4899',
]

export function getColorByValue(value) {
  return CLASS_COLORS.find((c) => c.value === value) || CLASS_COLORS[0]
}

export function getPriorityByValue(value) {
  return PRIORITIES.find((p) => p.value === value) || PRIORITIES[0]
}
