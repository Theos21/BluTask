import { Bell, BellOff, Mail } from 'lucide-react'
import { useAppStore } from '../../stores/useAppStore'
import { useAuthStore } from '../../stores/useAuthStore'

const ADVANCE_OPTIONS = [
  { value: '1hour', label: '1 hour before' },
  { value: '1day',  label: '1 day before' },
  { value: '2days', label: '2 days before' },
]

export default function NotificationsSection() {
  const { notificationsEnabled, setNotificationsEnabled, reminderAdvance, setReminderAdvance } = useAppStore()
  const { profile, updateProfile } = useAuthStore()
  const weeklyDigest = profile?.weekly_digest ?? false

  async function toggle() {
    if (!notificationsEnabled) {
      if ('Notification' in window) {
        const perm = await Notification.requestPermission()
        if (perm !== 'granted') return
      }
    }
    setNotificationsEnabled(!notificationsEnabled)
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">Notifications</h2>
        <p className="text-xs text-gray-400 dark:text-gray-500">Control when BluTask reminds you about upcoming due dates.</p>
      </div>

      {/* Toggle */}
      <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3">
          {notificationsEnabled
            ? <Bell size={16} className="text-[color:var(--color-accent)]" />
            : <BellOff size={16} className="text-gray-400 dark:text-gray-500" />
          }
          <div>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Due date reminders</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Browser notifications for upcoming deadlines</p>
          </div>
        </div>
        <button
          onClick={toggle}
          className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
            notificationsEnabled ? 'bg-[color:var(--color-accent)]' : 'bg-gray-200 dark:bg-gray-700'
          }`}
        >
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
            notificationsEnabled ? 'translate-x-5' : 'translate-x-0'
          }`} />
        </button>
      </div>

      {/* Advance time */}
      {notificationsEnabled && (
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-3">Remind me</label>
          <div className="flex gap-2">
            {ADVANCE_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setReminderAdvance(value)}
                className={`flex-1 py-2.5 rounded-xl text-xs font-medium border-2 transition-all ${
                  reminderAdvance === value
                    ? 'border-[color:var(--color-accent)] text-[color:var(--color-accent)] bg-[color:var(--color-accent)]/5'
                    : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {!notificationsEnabled && (
        <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50 px-4 py-4">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Enable reminders to get browser notifications before your assignments and tasks are due.
            Your browser will ask for permission the first time.
          </p>
        </div>
      )}

      {/* Weekly digest */}
      <div className="flex items-center justify-between py-3 border-t border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <Mail size={16} className={weeklyDigest ? 'text-[color:var(--color-accent)]' : 'text-gray-400 dark:text-gray-500'} />
          <div>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Weekly email digest</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">A summary of your week every Monday morning</p>
          </div>
        </div>
        <button
          onClick={() => updateProfile({ weekly_digest: !weeklyDigest })}
          className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
            weeklyDigest ? 'bg-[color:var(--color-accent)]' : 'bg-gray-200 dark:bg-gray-700'
          }`}
        >
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
            weeklyDigest ? 'translate-x-5' : 'translate-x-0'
          }`} />
        </button>
      </div>
    </div>
  )
}
