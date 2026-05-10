import { useEffect, useState } from 'react'
import { Bell, BellOff, Mail, Calendar, BookOpen, Clock } from 'lucide-react'
import { useAppStore } from '../../stores/useAppStore'
import { useAuthStore } from '../../stores/useAuthStore'
import { supabase } from '../../lib/supabase'

const DEFAULT_PREFS = {
  task_reminders_1d: true,
  task_reminders_1h: true,
  calendar_alerts: true,
  assignment_alerts: true,
}

function Toggle({ enabled, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
        enabled ? 'bg-[color:var(--color-accent)]' : 'bg-gray-200 dark:bg-gray-700'
      }`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
        enabled ? 'translate-x-5' : 'translate-x-0'
      }`} />
    </button>
  )
}

function PrefRow({ icon: Icon, title, description, enabled, onToggle, borderTop }) {
  return (
    <div className={`flex items-center justify-between py-3 ${borderTop ? 'border-t' : 'border-b'} border-gray-100 dark:border-gray-800`}>
      <div className="flex items-center gap-3">
        <Icon size={16} className={enabled ? 'text-[color:var(--color-accent)]' : 'text-gray-400 dark:text-gray-500'} />
        <div>
          <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{title}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{description}</p>
        </div>
      </div>
      <Toggle enabled={enabled} onToggle={onToggle} />
    </div>
  )
}

export default function NotificationsSection() {
  const { notificationsEnabled, setNotificationsEnabled } = useAppStore()
  const { profile, updateProfile } = useAuthStore()
  const { user } = useAuthStore()
  const weeklyDigest = profile?.weekly_digest ?? false

  const [prefs, setPrefs] = useState(DEFAULT_PREFS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        if (data) setPrefs(data)
        setLoading(false)
      })
  }, [user])

  async function setPref(key, value) {
    setPrefs((prev) => ({ ...prev, [key]: value }))
    await supabase.from('notification_preferences').upsert(
      { user_id: user.id, ...prefs, [key]: value, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )
  }

  async function toggleBrowserNotifications() {
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
        <p className="text-xs text-gray-400 dark:text-gray-500">Control when BluTask reminds you about upcoming events and deadlines.</p>
      </div>

      {/* Browser / push master toggle */}
      <PrefRow
        icon={notificationsEnabled ? Bell : BellOff}
        title="Due date reminders"
        description="Browser notifications for upcoming deadlines"
        enabled={notificationsEnabled}
        onToggle={toggleBrowserNotifications}
      />

      {/* Push notification preferences */}
      <div className="rounded-xl bg-[#1e293b] dark:bg-[#1e293b] overflow-hidden">
        <div className="px-4 pt-4 pb-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Push Notifications</p>
        </div>

        {loading ? (
          <div className="px-4 pb-4">
            <div className="h-4 w-32 bg-gray-700 rounded animate-pulse" />
          </div>
        ) : (
          <div className="px-4 pb-2 space-y-0">
            <div className="flex items-center justify-between py-3 border-b border-gray-700/50">
              <div className="flex items-center gap-3">
                <Clock size={16} className={prefs.task_reminders_1d ? 'text-[color:var(--color-accent)]' : 'text-gray-500'} />
                <div>
                  <p className="text-sm font-medium text-gray-200">Task deadline — 1 day before</p>
                  <p className="text-xs text-gray-500 mt-0.5">Reminder the day before a task is due</p>
                </div>
              </div>
              <Toggle enabled={prefs.task_reminders_1d} onToggle={() => setPref('task_reminders_1d', !prefs.task_reminders_1d)} />
            </div>

            <div className="flex items-center justify-between py-3 border-b border-gray-700/50">
              <div className="flex items-center gap-3">
                <Bell size={16} className={prefs.task_reminders_1h ? 'text-[color:var(--color-accent)]' : 'text-gray-500'} />
                <div>
                  <p className="text-sm font-medium text-gray-200">Task deadline — 1 hour before</p>
                  <p className="text-xs text-gray-500 mt-0.5">Last-minute reminder when a task is nearly due</p>
                </div>
              </div>
              <Toggle enabled={prefs.task_reminders_1h} onToggle={() => setPref('task_reminders_1h', !prefs.task_reminders_1h)} />
            </div>

            <div className="flex items-center justify-between py-3 border-b border-gray-700/50">
              <div className="flex items-center gap-3">
                <Calendar size={16} className={prefs.calendar_alerts ? 'text-[color:var(--color-accent)]' : 'text-gray-500'} />
                <div>
                  <p className="text-sm font-medium text-gray-200">Calendar event alerts</p>
                  <p className="text-xs text-gray-500 mt-0.5">Notifications for upcoming calendar events</p>
                </div>
              </div>
              <Toggle enabled={prefs.calendar_alerts} onToggle={() => setPref('calendar_alerts', !prefs.calendar_alerts)} />
            </div>

            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <BookOpen size={16} className={prefs.assignment_alerts ? 'text-[color:var(--color-accent)]' : 'text-gray-500'} />
                <div>
                  <p className="text-sm font-medium text-gray-200">Assignment due dates</p>
                  <p className="text-xs text-gray-500 mt-0.5">Reminders for school assignment deadlines</p>
                </div>
              </div>
              <Toggle enabled={prefs.assignment_alerts} onToggle={() => setPref('assignment_alerts', !prefs.assignment_alerts)} />
            </div>
          </div>
        )}
      </div>

      {/* Weekly digest */}
      <PrefRow
        icon={Mail}
        title="Weekly email digest"
        description="A summary of your week every Monday morning"
        enabled={weeklyDigest}
        onToggle={() => updateProfile({ weekly_digest: !weeklyDigest })}
        borderTop
      />
    </div>
  )
}
