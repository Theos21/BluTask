/**
 * localNotifications.js
 *
 * Uses @capacitor/local-notifications for both iOS and Android.
 * iOS path: handled natively by CapacitorLocalNotifications SPM package.
 *           AppDelegate forwards foreground delivery via UNUserNotificationCenterDelegate.
 * Android path: same plugin + channel setup.
 * Web: no-op (browser notifications handled elsewhere).
 *
 * The custom NativeNotificationsPlugin.swift remains compiled in the app for
 * future use, but is no longer called from JS — the SPM plugin is more reliable.
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

// ── Plugin loader ─────────────────────────────────────────────────────────────

let _plugin = null

async function getPlugin() {
  if (_plugin) {
    if (_plugin.error) throw _plugin.error
    return _plugin.plugin
  }
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    _plugin = { plugin: LocalNotifications }
    return LocalNotifications
  } catch (err) {
    _plugin = { error: err }
    throw err
  }
}

// ── Timeout guard ─────────────────────────────────────────────────────────────

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Timed out after ${ms}ms (${label})`)), ms)
    ),
  ])
}

// ── Deterministic numeric ID ──────────────────────────────────────────────────

function notifId(uuid, suffix) {
  const s = uuid + suffix
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i)
  return (h & 0x7fffffff) || 1
}

const DAILY_ID = 2000000000
const TEST_ID  = 1999999999

// Android channel IDs
const CH_REMINDERS = 'blutask-reminders'
const CH_SUMMARY   = 'blutask-summary'

// ── Notification builders ─────────────────────────────────────────────────────

function oneShot(id, title, body, scheduledAt) {
  const n = { id, title, body, schedule: { at: new Date(scheduledAt), allowWhileIdle: true } }
  if (IS_ANDROID) n.channelId = CH_REMINDERS
  return n
}

function daily(id, title, body, hour) {
  const n = { id, title, body, schedule: { on: { hour, minute: 0 }, repeats: true, allowWhileIdle: true } }
  if (IS_ANDROID) n.channelId = CH_SUMMARY
  return n
}

// ── Android channel setup ─────────────────────────────────────────────────────

async function ensureAndroidChannels(LN) {
  if (!IS_ANDROID) return
  let existing
  try {
    existing = await withTimeout(LN.listChannels(), 4000, 'listChannels')
  } catch (err) {
    console.warn(TAG, 'listChannels failed — skipping:', err.message)
    return
  }
  const ids = (existing.channels ?? []).map((c) => c.id)
  if (!ids.includes(CH_REMINDERS)) {
    await withTimeout(
      LN.createChannel({ id: CH_REMINDERS, name: 'Task Reminders',
        importance: 5, visibility: 1, sound: 'default', vibration: true }),
      4000, 'createChannel reminders'
    ).catch((e) => console.warn(TAG, 'createChannel:', e.message))
  }
  if (!ids.includes(CH_SUMMARY)) {
    await withTimeout(
      LN.createChannel({ id: CH_SUMMARY, name: 'Daily Summary',
        importance: 3, visibility: 1, vibration: false }),
      4000, 'createChannel summary'
    ).catch((e) => console.warn(TAG, 'createChannel summary:', e.message))
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PERMISSION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns 'granted' | 'denied' | 'prompt' | 'error'
 */
export async function getPermissionStatus() {
  if (!IS_NATIVE) return 'prompt'
  try {
    const LN = await getPlugin()
    const { display } = await withTimeout(LN.checkPermissions(), 5000, 'checkPermissions')
    console.log(TAG, 'permission status:', display)
    return display === 'granted' ? 'granted' : display === 'denied' ? 'denied' : 'prompt'
  } catch (err) {
    console.error(TAG, 'getPermissionStatus error:', err.message)
    return 'error'
  }
}

/**
 * Shows the OS permission dialog.
 * Returns 'granted' | 'denied' | 'error'
 * 60-second timeout prevents hanging if the bridge stalls.
 */
export async function requestPermission() {
  if (!IS_NATIVE) return 'error'
  try {
    const LN = await getPlugin()
    const { display } = await withTimeout(LN.requestPermissions(), 60_000, 'requestPermissions')
    console.log(TAG, 'requestPermissions result:', display)
    return display === 'granted' ? 'granted' : 'denied'
  } catch (err) {
    console.error(TAG, 'requestPermission error:', err.message)
    return 'error'
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TEST NOTIFICATION
// ─────────────────────────────────────────────────────────────────────────────

export async function sendTestNotification() {
  if (!IS_NATIVE) return { ok: false, reason: 'Not running as a native app' }
  try {
    const LN = await getPlugin()
    await ensureAndroidChannels(LN)
    await withTimeout(
      LN.schedule({ notifications: [
        oneShot(TEST_ID, 'BluTask notifications work! ✓', 'Your notification setup is working correctly.', Date.now() + 5_000),
      ] }),
      8000, 'schedule test'
    )
    console.log(TAG, 'Test notification scheduled — fires in 5 s')
    return { ok: true }
  } catch (err) {
    console.error(TAG, 'sendTestNotification failed:', err.message)
    return { ok: false, reason: err.message }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TASK REMINDERS
// ─────────────────────────────────────────────────────────────────────────────

export async function scheduleTaskReminders(task) {
  if (!IS_NATIVE || !task?.id || !task?.due_date) return
  try {
    const dueMs  = new Date(task.due_date).getTime()
    const now    = Date.now()
    const notifs = []
    if (_prefs.task_reminders_1d) {
      const at = dueMs - 864e5
      if (at > now) notifs.push(oneShot(notifId(task.id, '1d'), 'Task due tomorrow', task.title ?? 'Upcoming task', at))
    }
    if (_prefs.task_reminders_1h) {
      const at = dueMs - 36e5
      if (at > now) notifs.push(oneShot(notifId(task.id, '1h'), 'Task due in 1 hour', task.title ?? 'Upcoming task', at))
    }
    if (!notifs.length) return
    const LN = await getPlugin()
    await ensureAndroidChannels(LN)
    await withTimeout(LN.schedule({ notifications: notifs }), 5000, 'schedule task')
    console.log(TAG, `Scheduled ${notifs.length} reminder(s) for "${task.title}"`)
  } catch (err) {
    console.warn(TAG, 'scheduleTaskReminders failed:', err.message)
  }
}

export async function cancelTaskReminders(taskId) {
  if (!IS_NATIVE) return
  try {
    const LN = await getPlugin()
    await LN.cancel({ notifications: [{ id: notifId(taskId, '1d') }, { id: notifId(taskId, '1h') }] })
  } catch { /* no-op */ }
}

// ─────────────────────────────────────────────────────────────────────────────
// ASSIGNMENT REMINDERS
// ─────────────────────────────────────────────────────────────────────────────

export async function scheduleAssignmentReminders(assignment) {
  if (!IS_NATIVE || !assignment?.id || !assignment?.due_date || !_prefs.assignment_alerts) return
  try {
    const dueMs  = new Date(assignment.due_date).getTime()
    const now    = Date.now()
    const notifs = []
    const at1d = dueMs - 864e5
    if (at1d > now) notifs.push(oneShot(notifId(assignment.id, 'a1d'), 'Assignment due tomorrow', assignment.title ?? 'Upcoming assignment', at1d))
    const at1h = dueMs - 36e5
    if (at1h > now) notifs.push(oneShot(notifId(assignment.id, 'a1h'), 'Assignment due in 1 hour', assignment.title ?? 'Upcoming assignment', at1h))
    if (!notifs.length) return
    const LN = await getPlugin()
    await ensureAndroidChannels(LN)
    await withTimeout(LN.schedule({ notifications: notifs }), 5000, 'schedule assignment')
    console.log(TAG, `Scheduled ${notifs.length} reminder(s) for "${assignment.title}"`)
  } catch (err) {
    console.warn(TAG, 'scheduleAssignmentReminders failed:', err.message)
  }
}

export async function cancelAssignmentReminders(assignmentId) {
  if (!IS_NATIVE) return
  try {
    const LN = await getPlugin()
    await LN.cancel({ notifications: [{ id: notifId(assignmentId, 'a1d') }, { id: notifId(assignmentId, 'a1h') }] })
  } catch { /* no-op */ }
}

// ─────────────────────────────────────────────────────────────────────────────
// DAILY SUMMARY
// ─────────────────────────────────────────────────────────────────────────────

export async function scheduleDailySummary(hour = 8) {
  if (!IS_NATIVE) return
  try {
    const LN = await getPlugin()
    await ensureAndroidChannels(LN)
    await LN.cancel({ notifications: [{ id: DAILY_ID }] }).catch(() => {})
    await withTimeout(
      LN.schedule({ notifications: [daily(DAILY_ID, 'Good morning! Your BluTask summary', 'Tap to review your tasks for today.', hour)] }),
      5000, 'schedule daily summary'
    )
    console.log(TAG, `Daily summary set for ${hour}:00`)
  } catch (err) {
    console.warn(TAG, 'scheduleDailySummary failed:', err.message)
  }
}

export async function cancelDailySummary() {
  if (!IS_NATIVE) return
  try {
    const LN = await getPlugin()
    await LN.cancel({ notifications: [{ id: DAILY_ID }] })
  } catch { /* no-op */ }
}

// ─────────────────────────────────────────────────────────────────────────────
// STARTUP SYNC
// ─────────────────────────────────────────────────────────────────────────────

export async function rescheduleAll(tasks, assignments, prefs) {
  if (!IS_NATIVE) return
  if (prefs) updatePrefsCache(prefs)
  console.log(TAG, `rescheduleAll: ${tasks.length} tasks, ${assignments.length} assignments`)
  try {
    const LN = await getPlugin()
    await ensureAndroidChannels(LN)
    const { notifications: pending } = await withTimeout(
      LN.getPending(), 4000, 'getPending'
    ).catch(() => ({ notifications: [] }))
    const toCancel = pending.filter((n) => n.id !== DAILY_ID)
    if (toCancel.length) await LN.cancel({ notifications: toCancel.map((n) => ({ id: n.id })) }).catch(() => {})
    for (const t of tasks)       if (!t.completed && t.due_date)  await scheduleTaskReminders(t)
    for (const a of assignments) if (!a.completed && a.due_date)  await scheduleAssignmentReminders(a)
    if (_prefs.daily_summary_enabled) await scheduleDailySummary(_prefs.daily_summary_hour)
    else await cancelDailySummary()
    console.log(TAG, 'rescheduleAll done')
  } catch (err) {
    console.warn(TAG, 'rescheduleAll skipped:', err.message)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// EXACT ALARM (Android only)
// ─────────────────────────────────────────────────────────────────────────────

export async function getExactAlarmStatus() {
  if (!IS_NATIVE || !IS_ANDROID) return 'granted'
  try {
    const LN = await getPlugin()
    const { exact_alarm } = await withTimeout(LN.checkExactNotificationSetting(), 5000, 'checkExactNotificationSetting')
    return exact_alarm
  } catch { return 'unknown' }
}

export async function requestExactAlarmPermission() {
  if (!IS_NATIVE || !IS_ANDROID) return
  try {
    const LN = await getPlugin()
    await withTimeout(LN.changeExactNotificationSetting(), 120_000, 'changeExactNotificationSetting')
  } catch (err) {
    console.warn(TAG, 'changeExactNotificationSetting failed:', err.message)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FOREGROUND LISTENER (Android only — iOS delivery is handled by AppDelegate)
// ─────────────────────────────────────────────────────────────────────────────

export async function addLocalNotificationListener(handler) {
  if (!IS_NATIVE || !IS_ANDROID) return () => {}
  try {
    const LN = await getPlugin()
    const h = await LN.addListener('localNotificationReceived', handler)
    return () => h.remove()
  } catch {
    return () => {}
  }
}

export function resetPluginCache() { _plugin = null }

// Legacy aliases
export const requestWebPermission    = requestPermission
export const initLocalNotifications  = requestPermission
export const getWebPermission        = () => 'prompt'
export const sendWebTestNotification = sendTestNotification
