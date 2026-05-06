import { Monitor, Sun, Moon, Check } from 'lucide-react'
import { useAppStore } from '../../stores/useAppStore'
import { ACCENT_COLORS } from '../../lib/constants'

const THEMES = [
  { value: 'light',  label: 'Light',  icon: Sun },
  { value: 'dark',   label: 'Dark',   icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
]

export default function AppearanceSection() {
  const { theme, setTheme, accentColor, setAccentColor } = useAppStore()

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">Appearance</h2>
        <p className="text-xs text-gray-400 dark:text-gray-500">Theme and accent color.</p>
      </div>

      {/* Theme */}
      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-3">Theme</label>
        <div className="flex gap-2">
          {THEMES.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setTheme(value)}
              className={`flex-1 flex flex-col items-center gap-2 py-4 rounded-xl border-2 transition-all ${
                theme === value
                  ? 'border-[color:var(--color-accent)] bg-[color:var(--color-accent)]/5'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <Icon
                size={20}
                className={theme === value ? 'text-[color:var(--color-accent)]' : 'text-gray-400 dark:text-gray-500'}
              />
              <span className={`text-xs font-medium ${
                theme === value
                  ? 'text-[color:var(--color-accent)]'
                  : 'text-gray-500 dark:text-gray-400'
              }`}>
                {label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Accent color */}
      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-3">Accent color</label>
        <div className="flex gap-3">
          {ACCENT_COLORS.map(({ name, hex }) => (
            <button
              key={hex}
              onClick={() => setAccentColor(hex)}
              title={name}
              className="relative w-9 h-9 rounded-full transition-transform hover:scale-110"
              style={{ backgroundColor: hex }}
            >
              {accentColor === hex && (
                <Check size={14} className="absolute inset-0 m-auto text-white" strokeWidth={3} />
              )}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
          Affects buttons and interactive highlights throughout the app.
        </p>
      </div>
    </div>
  )
}
