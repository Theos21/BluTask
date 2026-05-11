import { useEffect, useState } from 'react'
import { Bell, BellOff, Mail, Calendar, BookOpen, Clock, Sunrise, FlaskConical, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { useAppStore } from '../../stores/useAppStore'
import { useAuthStore } from '../../stores/useAuthStore'
import { supabase } from '../../lib/supabase'
import {
  updatePrefsCache,
  scheduleDailySummary,
  cancelDailySummary,
  rescheduleAll,
  getPermissionStatus,
  requestPermission,
  sendTestNotification,
  getExactAlarmStatus,
  requestExactAlarmPermission,
} from '../../services/localNotifications'
import { isCapacitor } from '../../hooks/useMobileApp'

const DEFAULT_PREFS = {
  task_reminders_1d:     true,
  task_reminders_1h:     true,
  calendar_alerts:       true,
  assignment_alerts:     true,
  daily_summary_enabled: false,
  daily_summary_hour:    8,
}

// Human-readable hour labels for the time picker (6 AM – 11 PM)
const HOUR_OPTIONS = Array.from({ length: 18 }, (_, i) => {
  const h = i + 6
  const label = h === 12 ? '12:00 PM'
    : h < 12 ? `${h}:00 AM`
    : `${h - 12}:00 PM`
  return { value: h, label }
})

function Toggle({ enabled, onToggle, disabled }) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
        disabled ? 'opacity-40 cursor-not-allowed' :
        enabled ? 'bg-[color:var(--color-accent)]' : 'bg-gray-200 dark:bg-gray-700'
      }`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
        enabled ? 'translate-x-5' : 'translate-x-0'
      }`} />
    </button>
  )
}

function PrefRow({ icon: Icon, title, description, enabled, onToggle, borderTop, disabled }) {
  return (
    <div className={`flex items-center justify-between py-3 ${borderTop ? 'border-t' : 'border-b'} border-gray-100 dark:border-gray-800`}>
      <div className="flex items-center gap-3">
        <Icon size={16} className={enabled && !disabled ? 'text-[color:var(--color-accent)]' : 'text-gray-400 dark:text-gray-500'} />
        <div>
          <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{title}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{description}</p>
        </div>
      </div>
      <Toggle enabled={enabled} onToggle={onToggle} disabled={disabled} />
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
  const [permStatus, setPermStatus] = useState(null)
  const [permLoading, setPermLoading] = useState(false)
  const [permError, setPermError] = useState(null)
  const [exactAlarmStatus, setExactAlarmStatus] = useState(null)
  const [testState, setTestState] = useState('idle')  // 'idle'|'sending'|'sent'|'error'
  const [testError, setTestError] = useState(null)

  useEffect(() => {
    if (!isCapacitor) return
    getPermissionStatus().then(setPermStatus).catch(() => setPermStatus('error'))
    getExactAlarmStatus().then(setExactAlarmStatus).catch(() => setExactAlarmStatus('unknown'))
  }, [])

  useEffect(() => {
    if (!user) return
    supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          const merged = { ...DEFAULT_PREFS, ...data }
          setPrefs(merged)
          updatePrefsCache(merged)
        }
        setLoading(false)
      })
  }, [user])

  async function handleRequestPermission() {
    setPermLoading(true)
    setPermError(null)
    const granted = await requestPermission()
    const status = await getPermissionStatus()
    setPermStatus(status)
    setPermLoading(false)
    if (!granted) {
      setPermError(
        status === 'denied'
          ? 'Blocked — go to device Settings → Apps → BluTask → Notifications and enable them.'
          : `Not granted (status: ${status}). Try manually in device Settings.`
      )
    }
  }

  async function handleRequestExactAlarm() {
    await requestExactAlarmPermission()
    // Re-check after returning from system settings
    const status = await getExactAlarmStatus()
    setExactAlarmStatus(status)
  }

  async function handleTestNotification() {
    setTestError(null)
    setTestState('sending')
    const result = await sendTestNotification()
    if (result.ok) {
      setTestState('sent')
      setTimeout(() => setTestState('idle'), 8000)
    } else {
      setTestState('error')
      setTestError(result.reason)
    }
  }

  const permGranted  = permStatus === 'granted'
  const permDenied   = permStatus === 'denied'
  const permNeedsAsk = permStatus === 'prompt' || permStatus === null || permStatus === 'error'

  async function setPref(key, value) {
    const next = { ...prefs, [key]: value }
    setPrefs(next)
    updatePrefsCache(next)

    await supabase.from('notification_preferences').upsert(
      { user_id: user.id, ...next, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )

    // Keep local notifications in sync with pref changes
    if (!isCapacitor) return
    if (key === 'daily_summary_enabled') {
      if (value) await scheduleDailySummary(next.daily_summary_hour).catch(() => {})
      else await cancelDailySummary().catch(() => {})
    } else if (key === 'daily_summary_hour' && next.daily_summary_enabled) {
      await scheduleDailySummary(value).catch(() => {})
    } else {
      // A reminder toggle changed — re-sync all scheduled notifications
      const [{ data: tasks }, { data: assignments }] = await Promise.all([
        supabase.from('tasks').select('id, title, due_date, completed').eq('user_id', user.id).eq('completed', false),
        supabase.from('assignments').select('id, title, due_date, completed').eq('user_id', user.id).eq('completed', false),
      ])
      await rescheduleAll(tasks ?? [], assignments ?? [], next).catch(() => {})
    }
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
          <div className="px-4 pb-4 space-y-3">
            {[1,2,3,4].map((i) => (
              <div key={i} className="h-4 w-40 bg-gray-700 rounded animate-pulse" />
            ))}
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

            <div className="flex items-center justify-between py-3 border-b border-gray-700/50">
              <div className="flex items-center gap-3">
                <BookOpen size={16} className={prefs.assignment_alerts ? 'text-[color:var(--color-accent)]' : 'text-gray-500'} />
                <div>
                  <p className="text-sm font-medium text-gray-200">Assignment due dates</p>
                  <p className="text-xs text-gray-500 mt-0.5">Reminders for school assignment deadlines</p>
                </div>
              </div>
              <Toggle enabled={prefs.assignment_alerts} onToggle={() => setPref('assignment_alerts', !prefs.assignment_alerts)} />
            </div>

            {/* Daily summary — only shown on native (local notifications only) */}
            {isCapacitor && (
              <div className="pt-1 pb-1">
                <div className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <Sunrise size={16} className={prefs.daily_summary_enabled ? 'text-[color:var(--color-accent)]' : 'text-gray-500'} />
                    <div>
                      <p className="text-sm font-medium text-gray-200">Daily summary</p>
                      <p className="text-xs text-gray-500 mt-0.5">Morning nudge to review your tasks</p>
                    </div>
                  </div>
                  <Toggle enabled={prefs.daily_summary_enabled} onToggle={() => setPref('daily_summary_enabled', !prefs.daily_summary_enabled)} />
                </div>

                {prefs.daily_summary_enabled && (
                  <div className="flex items-center justify-between pb-3 pl-7">
                    <p className="text-xs text-gray-400">Remind me at</p>
                    <select
                      value={prefs.daily_summary_hour}
                      onChange={(e) => setPref('daily_summary_hour', Number(e.target.value))}
                      className="text-xs bg-gray-700 text-gray-200 border border-gray-600 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[color:var(--color-accent)]"
                    >
                      {HOUR_OPTIONS.map(({ value, label }) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Debug panel — native only */}
      {isCapacitor && (
        <div className="rounded-xl bg-[#1e293b] overflow-hidden">
          <div className="px-4 pt-4 pb-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Notification Debug</p>
          </div>
          <div className="px-4 pb-4 space-y-3">

            {/* Permission status */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">Permission</span>
              <span className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full ${
                permGranted  ? 'bg-green-500/20 text-green-400' :
                permDenied   ? 'bg-red-500/20 text-red-400' :
                               'bg-yellow-500/20 text-yellow-400'
              }`}>
                {permGranted  ? <CheckCircle size={11} /> : permDenied ? <XCircle size={11} /> : <AlertCircle size={11} />}
                {permStatus ?? 'unknown'}
              </span>
            </div>

            {/* Grant permission */}
            {permNeedsAsk && (
              <button
                onClick={handleRequestPermission}
                disabled={permLoading}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Bell size={14} />
                {permLoading ? 'Requesting…' : 'Grant notification permission'}
              </button>
            )}

            {permError && (
              <p className="text-xs text-red-400 leading-relaxed bg-red-500/10 rounded-lg px-3 py-2">
                {permError}
              </p>
            )}

            {/* Denied instructions */}
            {permDenied && (
              <p className="text-xs text-red-400 leading-relaxed">
                Blocked by device. Open <strong>Settings → Apps → BluTask → Notifications</strong> and turn them on.
              </p>
            )}

            {/* Exact alarm permission — Android 12+ only */}
            {exactAlarmStatus !== null && exactAlarmStatus !== 'granted' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">Exact alarms</span>
                  <span className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400">
                    <AlertCircle size={11} />
                    {exactAlarmStatus ?? 'checking…'}
                  </span>
                </div>
                <button
                  onClick={handleRequestExactAlarm}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30 transition-colors"
                >
                  <Clock size={14} />
                  Enable precise timing (Alarms &amp; reminders)
                </button>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Without this, Android may delay reminders by minutes or hours to save battery.
                </p>
              </div>
            )}

            {/* Test notification — immediate, no plugin needed */}
            <button
              onClick={handleTestNotification}
              disabled={!permGranted || testState === 'sending'}
              className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                !permGranted              ? 'opacity-40 cursor-not-allowed bg-gray-700 text-gray-400' :
                testState === 'sending'  ? 'opacity-60 cursor-not-allowed bg-gray-700 text-gray-300' :
                testState === 'sent'     ? 'bg-green-600/30 text-green-300' :
                testState === 'error'    ? 'bg-red-600/30 text-red-300' :
                'bg-[color:var(--color-accent)]/20 text-[color:var(--color-accent)] hover:bg-[color:var(--color-accent)]/30'
              }`}
            >
              <FlaskConical size={14} />
              {testState === 'sending' ? 'Scheduling…' :
               testState === 'sent'    ? '✓ Notification sent!' :
               testState === 'error'   ? 'Failed — see below' :
               !permGranted            ? 'Grant permission first' :
               'Send test notification'}
            </button>

            {testState === 'error' && testError && (
              <p className="text-xs text-red-400 font-mono break-all bg-red-500/10 rounded-lg px-3 py-2">
                {testError}
              </p>
            )}

          </div>
        </div>
      )}

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
