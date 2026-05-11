/**
 * localNotifications.js
 *
 * Permission + scheduling layer → @capacitor/local-notifications
 * (no FCM/Firebase dependency; handles POST_NOTIFICATIONS on Android 13+)
 */

import { Capacitor } from '@capacitor/core'

const IS_NATIVE  = Capacitor.isNativePlatform()
const IS_ANDROID = Capacitor.getPlatform() === 'android'
const TAG        = '[LocalNotif]'

// ── Prefs cache ───────────────────────────────────────────────────────────────

let _prefs = {
  task_reminders_1d:     true,
  task_reminders_1h:     true,
  assignment_alerts:     true,
  daily_summary_enabled: false,
  daily_summary_hour:    8,
}

export function updatePrefsCache(prefs) { _prefs = { ..._prefs, ...prefs } }
export function getPrefsCache()         { return { ..._prefs } }

// ── Timeout guard (bridge calls hang when plugin not registered) ──────────────

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Timed out — run: npx cap sync android (${label})`)), ms)
    ),
  ])
}

// ─────────────────────────────────────────────────────────────────────────────
// PERMISSION  — uses @capacitor/local-notifications directly
// Avoids FCM/Firebase dependency. LocalNotifications.checkPermissions()
// returns { display } and handles POST_NOTIFICATIONS on Android 13+.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns current permission state.
 * 'granted' | 'denied' | 'prompt' | 'error'
 */
export async function getPermissionStatus() {
  if (!IS_NATIVE) return 'prompt'
  try {
    const LN = await getLocalPlugin()
    const { display } = await withTimeout(LN.checkPermissions(), 5000, 'checkPermissions')
    console.log(TAG, 'Permission status:', display)
    if (display === 'granted') return 'granted'
    if (display === 'denied')  return 'denied'
    return 'prompt'
  } catch (err) {
    console.error(TAG, 'checkPermissions error:', err.message)
    return 'error'
  }
}

/**
 * Shows the OS permission dialog. Returns true if granted.
 */
export async function requestPermission() {
  if (!IS_NATIVE) return false
  try {
    const LN = await getLocalPlugin()
    const { display } = await withTimeout(LN.requestPermissions(), 60000, 'requestPermissions')
    console.log(TAG, 'requestPermissions result:', display)
    return display === 'granted'
  } catch (err) {
    console.error(TAG, 'requestPermissions error:', err.message)
    return false
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SCHEDULING — uses @capacitor/local-notifications
// Requires: npm install --legacy-peer-deps && npx cap sync android
// All calls are wrapped in timeouts and fail gracefully.
// ─────────────────────────────────────────────────────────────────────────────

let _localPlugin = null  // { plugin } | { error: Error }

async function getLocalPlugin() {
  if (_localPlugin) {
    if (_localPlugin.error) throw _localPlugin.error
    return _localPlugin.plugin
  }
  try {
    const mod = await import('@capacitor/local-notifications')
    _localPlugin = { plugin: mod.LocalNotifications }
    console.log(TAG, 'LocalNotifications plugin loaded')
    return _localPlugin.plugin
  } catch (err) {
    _localPlugin = { error: new Error(`@capacitor/local-notifications not installed — run: npm install --legacy-peer-deps && npx cap sync android`) }
    console.error(TAG, 'Plugin load failed:', err.message)
    throw _localPlugin.error
  }
}

export function resetPluginCache() { _localPlugin = null }

// Android notification channels
const CH_REMINDERS = 'blutask-reminders'
const CH_SUMMARY   = 'blutask-summary'

async function ensureChannels(LN) {
  if (!IS_ANDROID) return
  let existing
  try {
    existing = await withTimeout(LN.listChannels(), 4000, 'listChannels')
  } catch (err) {
    console.warn(TAG, 'listChannels failed — skipping channel setup:', err.message)
    return  // bail; createChannel would also hang
  }
  const ids = (existing.channels ?? []).map((c) => c.id)
  if (!ids.includes(CH_REMINDERS)) {
    await withTimeout(
      LN.createChannel({ id: CH_REMINDERS, name: 'Task Reminders',
        importance: 5, visibility: 1, sound: 'default', vibration: true }),
      4000, 'createChannel'
    ).catch((e) => console.warn(TAG, 'createChannel:', e.message))
  }
  if (!ids.includes(CH_SUMMARY)) {
    await withTimeout(
      LN.createChannel({ id: CH_SUMMARY, name: 'Daily Summary',
        importance: 3, visibility: 1, vibration: false }),
      4000, 'createChannel summary'
    ).catch((e) => console.warn(TAG, 'createChannel summary:', e.message))
  }
  console.log(TAG, 'Channels ready')
}

function notifId(uuid, suffix) {
  const s = uuid + suffix
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i)
  return (h & 0x7fffffff) || 1
}

const DAILY_ID = 2_000_000_000
const TEST_ID  = 1_999_999_999

// ── Test notification ─────────────────────────────────────────────────────────

/**
 * Schedules a notification 5 seconds from now.
 * Returns { ok, reason } — always resolves, never hangs past 12 s.
 */
export async function sendTestNotification() {
  if (!IS_NATIVE) return { ok: false, reason: 'Not running as a native app' }

  try {
    const LN = await getLocalPlugin()
    await ensureChannels(LN)

    const fireAt = new Date(Date.now() + 5_000)
    await withTimeout(
      LN.schedule({ notifications: [{
        id:        TEST_ID,
        title:     'BluTask notifications work! ✓',
        body:      'Your local notification setup is working correctly.',
        channelId: CH_REMINDERS,
        schedule:  { at: fireAt, allowWhileIdle: true },
      }] }),
      8000, 'schedule test'
    )
    console.log(TAG, 'Test notification scheduled — fires in 5 s')
    return { ok: true }
  } catch (err) {
    console.error(TAG, 'sendTestNotification failed:', err.message)
    return { ok: false, reason: err.message }
  }
}

// ── Task reminders ────────────────────────────────────────────────────────────

export async function scheduleTaskReminders(task) {
  if (!IS_NATIVE || !task?.id || !task?.due_date) return
  try {
    const LN    = await getLocalPlugin()
    const dueMs = new Date(task.due_date).getTime()
    const now   = Date.now()
    const notifs = []

    if (_prefs.task_reminders_1d) {
      const at = dueMs - 864e5
      if (at > now) notifs.push({ id: notifId(task.id, '1d'), title: 'Task due tomorrow',
        body: task.title ?? 'Upcoming task', channelId: CH_REMINDERS,
        schedule: { at: new Date(at), allowWhileIdle: true },
        extra: { type: 'task_reminder', taskId: task.id, dueIn: '1d' } })
    }
    if (_prefs.task_reminders_1h) {
      const at = dueMs - 36e5
      if (at > now) notifs.push({ id: notifId(task.id, '1h'), title: 'Task due in 1 hour',
        body: task.title ?? 'Upcoming task', channelId: CH_REMINDERS,
        schedule: { at: new Date(at), allowWhileIdle: true },
        extra: { type: 'task_reminder', taskId: task.id, dueIn: '1h' } })
    }

    if (!notifs.length) return
    await withTimeout(LN.schedule({ notifications: notifs }), 5000, 'schedule task')
    console.log(TAG, `Scheduled ${notifs.length} reminder(s) for "${task.title}"`)
  } catch (err) {
    console.warn(TAG, 'scheduleTaskReminders failed:', err.message)
  }
}

export async function cancelTaskReminders(taskId) {
  if (!IS_NATIVE) return
  try {
    const LN = await getLocalPlugin()
    await LN.cancel({ notifications: [{ id: notifId(taskId, '1d') }, { id: notifId(taskId, '1h') }] })
  } catch { /* no-op */ }
}

// ── Assignment reminders ──────────────────────────────────────────────────────

export async function scheduleAssignmentReminders(assignment) {
  if (!IS_NATIVE || !assignment?.id || !assignment?.due_date || !_prefs.assignment_alerts) return
  try {
    const LN    = await getLocalPlugin()
    const dueMs = new Date(assignment.due_date).getTime()
    const now   = Date.now()
    const notifs = []

    const at1d = dueMs - 864e5
    if (at1d > now) notifs.push({ id: notifId(assignment.id, 'a1d'), title: 'Assignment due tomorrow',
      body: assignment.title ?? 'Upcoming assignment', channelId: CH_REMINDERS,
      schedule: { at: new Date(at1d), allowWhileIdle: true } })

    const at1h = dueMs - 36e5
    if (at1h > now) notifs.push({ id: notifId(assignment.id, 'a1h'), title: 'Assignment due in 1 hour',
      body: assignment.title ?? 'Upcoming assignment', channelId: CH_REMINDERS,
      schedule: { at: new Date(at1h), allowWhileIdle: true } })

    if (!notifs.length) return
    await withTimeout(LN.schedule({ notifications: notifs }), 5000, 'schedule assignment')
    console.log(TAG, `Scheduled ${notifs.length} reminder(s) for "${assignment.title}"`)
  } catch (err) {
    console.warn(TAG, 'scheduleAssignmentReminders failed:', err.message)
  }
}

export async function cancelAssignmentReminders(assignmentId) {
  if (!IS_NATIVE) return
  try {
    const LN = await getLocalPlugin()
    await LN.cancel({ notifications: [{ id: notifId(assignmentId, 'a1d') }, { id: notifId(assignmentId, 'a1h') }] })
  } catch { /* no-op */ }
}

// ── Daily summary ─────────────────────────────────────────────────────────────

export async function scheduleDailySummary(hour = 8) {
  if (!IS_NATIVE) return
  try {
    const LN = await getLocalPlugin()
    await ensureChannels(LN)
    await LN.cancel({ notifications: [{ id: DAILY_ID }] }).catch(() => {})
    await withTimeout(
      LN.schedule({ notifications: [{ id: DAILY_ID, title: 'Good morning! Your BluTask summary',
        body: 'Tap to review your tasks for today.', channelId: CH_SUMMARY,
        schedule: { on: { hour, minute: 0 }, repeats: true, allowWhileIdle: true } }] }),
      5000, 'schedule daily'
    )
    console.log(TAG, `Daily summary set for ${hour}:00`)
  } catch (err) {
    console.warn(TAG, 'scheduleDailySummary failed:', err.message)
  }
}

export async function cancelDailySummary() {
  if (!IS_NATIVE) return
  try {
    const LN = await getLocalPlugin()
    await LN.cancel({ notifications: [{ id: DAILY_ID }] })
  } catch { /* no-op */ }
}

// ── Startup sync ──────────────────────────────────────────────────────────────

export async function rescheduleAll(tasks, assignments, prefs) {
  if (!IS_NATIVE) return
  if (prefs) updatePrefsCache(prefs)
  console.log(TAG, `rescheduleAll: ${tasks.length} tasks, ${assignments.length} assignments`)
  try {
    const LN = await getLocalPlugin()
    await ensureChannels(LN)
    const { notifications: pending } = await withTimeout(LN.getPending(), 4000, 'getPending').catch(() => ({ notifications: [] }))
    const toCancel = pending.filter((n) => n.id !== DAILY_ID)
    if (toCancel.length) await LN.cancel({ notifications: toCancel.map((n) => ({ id: n.id })) }).catch(() => {})
    for (const t of tasks)       if (!t.completed && t.due_date)  await scheduleTaskReminders(t)
    for (const a of assignments) if (!a.completed && a.due_date)  await scheduleAssignmentReminders(a)
    if (_prefs.daily_summary_enabled) await scheduleDailySummary(_prefs.daily_summary_hour)
    else await cancelDailySummary()
    console.log(TAG, 'rescheduleAll done')
  } catch (err) {
    console.warn(TAG, 'rescheduleAll skipped (plugin not ready):', err.message)
  }
}

// ── Foreground listener ───────────────────────────────────────────────────────

export async function addLocalNotificationListener(handler) {
  if (!IS_NATIVE) return () => {}
  try {
    const LN = await getLocalPlugin()
    const h = await LN.addListener('localNotificationReceived', handler)
    return () => h.remove()
  } catch {
    return () => {}
  }
}

// ── Exact alarm permission (Android 12+ / API 31+) ───────────────────────────
// Without SCHEDULE_EXACT_ALARM, the OS may delay notifications by hours.
// iOS always returns 'granted'.

export async function getExactAlarmStatus() {
  if (!IS_NATIVE || !IS_ANDROID) return 'granted'
  try {
    const LN = await getLocalPlugin()
    const { exact_alarm } = await withTimeout(
      LN.checkExactNotificationSetting(), 5000, 'checkExactNotificationSetting'
    )
    console.log(TAG, 'Exact alarm permission:', exact_alarm)
    return exact_alarm  // 'granted' | 'denied'
  } catch (err) {
    console.warn(TAG, 'checkExactNotificationSetting failed:', err.message)
    return 'unknown'
  }
}

/**
 * Opens the system "Alarms & reminders" settings screen for this app.
 * On Android < 12 or if the plugin is unavailable this is a no-op.
 */
export async function requestExactAlarmPermission() {
  if (!IS_NATIVE || !IS_ANDROID) return
  try {
    const LN = await getLocalPlugin()
    await withTimeout(LN.changeExactNotificationSetting(), 120000, 'changeExactNotificationSetting')
  } catch (err) {
    console.warn(TAG, 'changeExactNotificationSetting failed:', err.message)
  }
}

// Legacy aliases kept for App.jsx compatibility
export const requestWebPermission      = requestPermission
export const initLocalNotifications    = requestPermission
export const getWebPermission          = () => 'prompt'  // replaced by async getPermissionStatus()
export const sendWebTestNotification   = () => ({ ok: false, reason: 'Use sendTestNotification() instead' })
