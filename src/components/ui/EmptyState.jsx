export default function EmptyState({ title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <p className="text-sm italic text-gray-400 dark:text-gray-600 mb-1">{title}</p>
      {description && (
        <p className="text-xs text-gray-400 dark:text-gray-600 max-w-xs mt-1 mb-4">{description}</p>
      )}
      {action}
    </div>
  )
}
