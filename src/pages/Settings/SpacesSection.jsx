import { useEffect, useState } from 'react'
import { useAuthStore } from '../../stores/useAuthStore'
import { showToast } from '../../lib/toast'

function Toggle({ enabled, onToggle, disabled }) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onToggle}
      disabled={disabled}
      className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none disabled:cursor-not-allowed ${
        enabled ? 'bg-indigo-500' : 'bg-gray-200 dark:bg-gray-700'
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200 ${
          enabled ? 'translate-x-4' : 'translate-x-0.5'
        }`}
      />
    </button>
  )
}

function useToggle(profile, key, defaultVal) {
  const { patchProfile, updateProfile } = useAuthStore()
  const [value, setValue] = useState(profile?.[key] ?? defaultVal)

  useEffect(() => {
    if (profile != null) setValue(profile[key] ?? defaultVal)
  }, [profile?.[key]])

  async function toggle() {
    const next = !value
    setValue(next)
    patchProfile({ [key]: next })
    const { error } = await updateProfile({ [key]: next })
    if (error) {
      setValue(!next)
      patchProfile({ [key]: !next })
      showToast({ message: 'Failed to save', variant: 'error' })
    } else {
      showToast({ message: 'Changes saved', variant: 'success' })
    }
  }

  return [value, toggle]
}

export default function SpacesSection() {
  const { profile } = useAuthStore()
  const [showSchool, toggleSchool] = useToggle(profile, 'show_school', true)
  const [showWatch,  toggleWatch]  = useToggle(profile, 'show_watch',  true)
  const [showSports, toggleSports] = useToggle(profile, 'show_sports', false)
  const [showGym,    toggleGym]    = useToggle(profile, 'show_gym',    false)
  const [showBooks,  toggleBooks]  = useToggle(profile, 'show_books',  false)

  const rows = [
    { key: 'school', label: 'School', desc: 'Track classes and assignments',  value: showSchool, toggle: toggleSchool },
    { key: 'watch',  label: 'Watch',  desc: 'Track shows and movies',          value: showWatch,  toggle: toggleWatch },
    { key: 'sports', label: 'Sports', desc: 'Log sessions, drills and gear',   value: showSports, toggle: toggleSports },
    { key: 'gym',    label: 'Gym',    desc: 'Workouts, sets and PR tracking',  value: showGym,    toggle: toggleGym },
    { key: 'books',  label: 'Books',  desc: 'Reading tracker and book notes',  value: showBooks,  toggle: toggleBooks },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">Spaces</h2>
        <p className="text-xs text-gray-400 dark:text-gray-500">Choose which spaces appear in your sidebar.</p>
      </div>

      <div className="space-y-0">
        {rows.map(({ key, label, desc, value, toggle }, i) => (
          <div key={key} className={`flex items-center justify-between py-4 ${i < rows.length - 1 ? 'border-b border-gray-100 dark:border-gray-800' : ''}`}>
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{label}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{desc}</p>
            </div>
            <Toggle enabled={value} onToggle={toggle} />
          </div>
        ))}
      </div>
    </div>
  )
}
