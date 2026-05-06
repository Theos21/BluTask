import { CLASS_COLORS } from '../../lib/constants'

export default function ColorPicker({ value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {CLASS_COLORS.map((color) => (
        <button
          key={color.value}
          type="button"
          onClick={() => onChange(color.value)}
          className={`w-7 h-7 rounded-full transition-all ${
            value === color.value
              ? 'ring-2 ring-offset-2 ring-gray-400 dark:ring-gray-500 scale-110'
              : 'hover:scale-105'
          }`}
          style={{ backgroundColor: color.value }}
          title={color.name}
        />
      ))}
    </div>
  )
}
