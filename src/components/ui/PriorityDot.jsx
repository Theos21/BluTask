import { getPriorityByValue } from '../../lib/constants'

export default function PriorityDot({ priority, showLabel = false }) {
  const p = getPriorityByValue(priority)
  if (priority === 'normal' && !showLabel) return null
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${p.color}`} />
      {showLabel && (
        <span className="text-xs text-gray-500 dark:text-gray-400">{p.label}</span>
      )}
    </span>
  )
}
