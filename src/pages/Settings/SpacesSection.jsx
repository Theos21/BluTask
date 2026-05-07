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

export default function SpacesSection() {
  const { profile, patchProfile, updateProfile } = useAuthStore()
  const [showSchool, setShowSchool] = useState(profile?.show_school ?? true)

  // Sync local state when profile loads or changes from outside
  useEffect(() => {
    if (profile != null) setShowSchool(profile.show_school ?? true)
  }, [profile?.show_school])

  async function toggleSchool() {
    const newValue = !showSchool
    // Optimistic update - toggle and sidebar update instantly
    setShowSchool(newValue)
    patchProfile({ show_school: newValue })
    const { error } = await updateProfile({ show_school: newValue })
    if (error) {
      // Revert on failure
      setShowSchool(!newValue)
      patchProfile({ show_school: !newValue })
      showToast({ message: 'Failed to save', variant: 'error' })
    } else {
      showToast({ message: 'Changes saved', variant: 'success' })
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">Spaces</h2>
        <p className="text-xs text-gray-400 dark:text-gray-500">Choose which spaces appear in your sidebar.</p>
      </div>

      <div className="space-y-0">
        {/* School */}
        <div className="flex items-center justify-between py-4 border-b border-gray-100 dark:border-gray-800">
          <div>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">School</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Track classes and assignments</p>
          </div>
          <Toggle enabled={showSchool} onToggle={toggleSchool} />
        </div>

        {/* Watch - coming soon */}
        <div className="flex items-center justify-between py-4 border-b border-gray-100 dark:border-gray-800 opacity-50">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Watch</p>
              <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded uppercase tracking-wide">
                Coming soon
              </span>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Routine blocks and time tracking</p>
          </div>
          <Toggle enabled={false} disabled />
        </div>
      </div>
    </div>
  )
}
