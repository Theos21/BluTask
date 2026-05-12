import { useEffect, useState } from 'react'
import {
  Bell, BellOff, Calendar, BookOpen, Clock, Sunrise,
  CheckCircle, XCircle, AlertTriangle, Send, RefreshCw,
} from 'lucide-react'
import { useAppStore } from '../../stores/useAppStore'
import { useAuthStore } from '../../stores/useAuthStore'
import { supabase } from '../../lib/supabase'
import {
  updatePrefsCache,
  scheduleDailySummary,
  cancelDailySummary,
  rescheduleAll,
  getPermissionStatus,
  sendTestNotification,
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

const HOUR_OPTIONS = Array.from({ length: 18 }, (_, i) => {
  const h = i + 6
  const label = h === 12 ? '12:00 PM' : h < 12 ? `${h}:00 AM` : `${h - 12}:00 PM`
  return { value: h, label }
})

function Toggle({ enabled, onToggle, disabled }) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
        disabled ? 'opacity-40 cursor-not-allowed'
        : enabled ? 'bg-[color:var(--color-accent)]' : 'bg-gray-200 dark:bg-gray-700'
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

// ── Permission status banner ──────────────────────────────────────────────────

function PermissionBanner({ status, onRefresh }) {
  if (!isCapacitor) return null

  if (status === 'granted') {
    return (
      <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
        <CheckCircle size={15} className="text-emerald-400 flex-shrink-0" />
        <p className="text-xs text-emerald-300 flex-1">Notifications enabled</p>
        <button onClick={onRefresh} className="text-emerald-400/60 hover:text-emerald-400 transition-colors">
          <RefreshCw size={13} />
        </button>
      </div>
    )
  }

  if (status === 'denied') {
    return (
      <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 px-3 py-3 space-y-2">
        <div className="flex items-start gap-2">
          <XCircle size={15} className="text-rose-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-rose-300">Notifications blocked</p>
            <p className="text-xs text-rose-400/80 mt-0.5">
              Enable "Allow Notifications" in iOS Settings to receive reminders.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { window.open('app-settings:', '_system') }}
            className="flex-1 text-xs text-rose-300 bg-rose-500/15 rounded-lg py-2 flex items-center justify-center gap-1.5 hover:bg-rose-500/25 transition-colors font-medium"
          >
            Open Settings
          </button>
          <button
            onClick={onRefresh}
            className="text-xs text-rose-400/60 bg-rose-500/10 rounded-lg py-2 px-3 flex items-center justify-center gap-1 hover:bg-rose-500/20 transition-colors"
          >
            <RefreshCw size={12} />
          </button>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-3 py-3 space-y-2">
        <div className="flex items-start gap-2">
          <AlertTriangle size={15} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-300">
            Could not read notification status. Try reopening the app.
          </p>
        </div>
        <button
          onClick={onRefresh}
          className="w-full text-xs text-amber-300 bg-amber-500/10 rounded-lg py-2 flex items-center justify-center gap-1.5 hover:bg-amber-500/20 transition-colors"
        >
          <RefreshCw size={12} /> Retry
        </button>
      </div>
    )
  }

  // 'prompt' — iOS permission dialog appears automatically at app launch.
  // If the user is seeing this, the dialog may still be pending or was dismissed.
  return (
    <div className="rounded-xl bg-[#1e293b] border border-gray-700/50 px-3 py-3 space-y-2">
      <p className="text-xs text-gray-400 leading-relaxed">
        BluTask requests notification permission when the app launches. Look for the iOS permission dialog, or go to <strong className="text-gray-300">Settings → BluTask → Notifications</strong> to enable manually.
      </p>
      <button
        onClick={onRefresh}
        className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium bg-gray-700/50 text-gray-300 hover:bg-gray-700 transition-colors"
      >
        <RefreshCw size={13} /> Check again
      </button>
    </div>
  )
}

// ── Test notification ─────────────────────────────────────────────────────────

function TestNotificationRow({ permStatus }) {
  const [state, setState] = useState('idle') // 'idle' | 'sending' | 'sent' | 'error'
  const [msg, setMsg] = useState('')

  if (!isCapacitor || permStatus !== 'granted') return null

  async function handleTest() {
    setState('sending')
    setMsg('')
    const { ok, reason } = await sendTestNotification()
    if (ok) {
      setState('sent')
      setMsg('A test notification will arrive in ~5 seconds. Make sure BluTask is in the background.')
      setTimeout(() => setState('idle'), 8000)
    } else {
      setState('error')
      setMsg(reason || 'Could not schedule test notification.')
      setTimeout(() => setState('idle'), 6000)
    }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleTest}
        disabled={state === 'sending'}
        className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium bg-[color:var(--color-accent)]/10 text-[color:var(--color-accent)] border border-[color:var(--color-accent)]/20 hover:bg-[color:var(--color-accent)]/20 transition-colors disabled:opacity-50"
      >
        <Send size={13} />
        {state === 'sending' ? 'Scheduling…' : state === 'sent' ? 'Sent! Check your notifications' : 'Send test notification'}
      </button>
      {msg && (
        <p className={`text-[11px] leading-relaxed px-1 ${state === 'error' ? 'text-rose-400' : 'text-emerald-400'}`}>
          {msg}
        </p>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function NotificationsSection() {
  const { notificationsEnabled, setNotificationsEnabled } = useAppStore()
  const { user } = useAuthStore()

  const [prefs, setPrefs] = useState(DEFAULT_PREFS)
  const [loading, setLoading] = useState(true)
  const [permStatus, setPermStatus] = useState(null) // null | 'granted' | 'denied' | 'prompt' | 'error'

  // Load permission status once on mount
  useEffect(() => {
    if (!isCapacitor) return
    getPermissionStatus().then(setPermStatus).catch(() => setPermStatus('error'))
  }, [])

  // Re-check permission when app returns to foreground — covers the case where
  // the user opened iOS Settings, granted permission, then came back to the app
  useEffect(() => {
    if (!isCapacitor) return
    let handle
    import('@capacitor/app').then(({ App: CapApp }) =>
      CapApp.addListener('appStateChange', ({ isActive }) => {
        if (isActive) getPermissionStatus().then(setPermStatus).catch(() => setPermStatus('error'))
      }).then((h) => { handle = h })
    ).catch(() => {})
    return () => { handle?.remove() }
  }, [])

  // Load notification prefs from DB
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

  async function handleRefreshStatus() {
    const status = await getPermissionStatus().catch(() => 'error')
    setPermStatus(status)
  }

  async function setPref(key, value) {
    const next = { ...prefs, [key]: value }
    setPrefs(next)
    updatePrefsCache(next)

    await supabase.from('notification_preferences').upsert(
      { user_id: user.id, ...next, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )

    if (!isCapacitor) return
    if (key === 'daily_summary_enabled') {
      if (value) await scheduleDailySummary(next.daily_summary_hour).catch(() => {})
      else await cancelDailySummary().catch(() => {})
    } else if (key === 'daily_summary_hour' && next.daily_summary_enabled) {
      await scheduleDailySummary(value).catch(() => {})
    } else {
      const [{ data: tasks }, { data: assignments }] = await Promise.all([
        supabase.from('tasks').select('id, title, due_date, completed').eq('user_id', user.id).eq('completed', false),
        supabase.from('assignments').select('id, title, due_date, completed').eq('user_id', user.id).eq('completed', false),
      ])
      await rescheduleAll(tasks ?? [], assignments ?? [], next).catch(() => {})
    }
  }

  async function toggleBrowserNotifications() {
    if (!notificationsEnabled && 'Notification' in window) {
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') return
    }
    setNotificationsEnabled(!notificationsEnabled)
  }

  const prefsDisabled = isCapacitor && permStatus !== 'granted'

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">Notifications</h2>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Control when BluTask reminds you about upcoming events and deadlines.
        </p>
      </div>

      {/* Native permission banner */}
      {isCapacitor && (
        <PermissionBanner
          status={permStatus}
          onRefresh={handleRefreshStatus}
        />
      )}

      {/* Test notification — only shown when granted */}
      <TestNotificationRow permStatus={permStatus} />

      {/* Browser / web master toggle (non-native only) */}
      {!isCapacitor && (
        <PrefRow
          icon={notificationsEnabled ? Bell : BellOff}
          title="Due date reminders"
          description="Browser notifications for upcoming deadlines"
          enabled={notificationsEnabled}
          onToggle={toggleBrowserNotifications}
        />
      )}

      {/* Notification preference toggles */}
      <div className="rounded-xl bg-[#1e293b] dark:bg-[#1e293b] overflow-hidden">
        <div className="px-4 pt-4 pb-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Reminder Settings</p>
          {prefsDisabled && (
            <p className="text-[11px] text-gray-500 mt-1">Enable notifications above to activate reminders</p>
          )}
        </div>

        {loading ? (
          <div className="px-4 pb-4 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-4 w-40 bg-gray-700 rounded animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="px-4 pb-2 space-y-0">
            <div className="flex items-center justify-between py-3 border-b border-gray-700/50">
              <div className="flex items-center gap-3">
                <Clock size={16} className={!prefsDisabled && prefs.task_reminders_1d ? 'text-[color:var(--color-accent)]' : 'text-gray-500'} />
                <div>
                  <p className={`text-sm font-medium ${prefsDisabled ? 'text-gray-500' : 'text-gray-200'}`}>Task deadline — 1 day before</p>
                  <p className="text-xs text-gray-500 mt-0.5">Reminder the day before a task is due</p>
                </div>
              </div>
              <Toggle enabled={prefs.task_reminders_1d} disabled={prefsDisabled} onToggle={() => setPref('task_reminders_1d', !prefs.task_reminders_1d)} />
            </div>

            <div className="flex items-center justify-between py-3 border-b border-gray-700/50">
              <div className="flex items-center gap-3">
                <Bell size={16} className={!prefsDisabled && prefs.task_reminders_1h ? 'text-[color:var(--color-accent)]' : 'text-gray-500'} />
                <div>
                  <p className={`text-sm font-medium ${prefsDisabled ? 'text-gray-500' : 'text-gray-200'}`}>Task deadline — 1 hour before</p>
                  <p className="text-xs text-gray-500 mt-0.5">Last-minute reminder when a task is nearly due</p>
                </div>
              </div>
              <Toggle enabled={prefs.task_reminders_1h} disabled={prefsDisabled} onToggle={() => setPref('task_reminders_1h', !prefs.task_reminders_1h)} />
            </div>

            <div className="flex items-center justify-between py-3 border-b border-gray-700/50">
              <div className="flex items-center gap-3">
                <Calendar size={16} className={!prefsDisabled && prefs.calendar_alerts ? 'text-[color:var(--color-accent)]' : 'text-gray-500'} />
                <div>
                  <p className={`text-sm font-medium ${prefsDisabled ? 'text-gray-500' : 'text-gray-200'}`}>Calendar event alerts</p>
                  <p className="text-xs text-gray-500 mt-0.5">Notifications for upcoming calendar events</p>
                </div>
              </div>
              <Toggle enabled={prefs.calendar_alerts} disabled={prefsDisabled} onToggle={() => setPref('calendar_alerts', !prefs.calendar_alerts)} />
            </div>

            <div className="flex items-center justify-between py-3 border-b border-gray-700/50">
              <div className="flex items-center gap-3">
                <BookOpen size={16} className={!prefsDisabled && prefs.assignment_alerts ? 'text-[color:var(--color-accent)]' : 'text-gray-500'} />
                <div>
                  <p className={`text-sm font-medium ${prefsDisabled ? 'text-gray-500' : 'text-gray-200'}`}>Assignment due dates</p>
                  <p className="text-xs text-gray-500 mt-0.5">Reminders for school assignment deadlines</p>
                </div>
              </div>
              <Toggle enabled={prefs.assignment_alerts} disabled={prefsDisabled} onToggle={() => setPref('assignment_alerts', !prefs.assignment_alerts)} />
            </div>

            {/* Daily summary — native only */}
            {isCapacitor && (
              <div className="pt-1 pb-1">
                <div className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <Sunrise size={16} className={!prefsDisabled && prefs.daily_summary_enabled ? 'text-[color:var(--color-accent)]' : 'text-gray-500'} />
                    <div>
                      <p className={`text-sm font-medium ${prefsDisabled ? 'text-gray-500' : 'text-gray-200'}`}>Daily summary</p>
                      <p className="text-xs text-gray-500 mt-0.5">Morning nudge to review your tasks</p>
                    </div>
                  </div>
                  <Toggle enabled={prefs.daily_summary_enabled} disabled={prefsDisabled} onToggle={() => setPref('daily_summary_enabled', !prefs.daily_summary_enabled)} />
                </div>
                {prefs.daily_summary_enabled && !prefsDisabled && (
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

    </div>
  )
}
