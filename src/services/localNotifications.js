/**
 * localNotifications.js
 *
 * iOS: uses NativeNotificationsPlugin compiled directly into the app binary.
 *      Registered via BluTaskBridgeViewController.capacitorDidLoad().
 *      No SPM bridge overhead — direct UNUserNotificationCenter wrapper.
 * Android: uses @capacitor/local-notifications (SPM plugin + channel setup).
 * Web: no-op (browser notifications handled elsewhere).
 */

import { Capacitor, registerPlugin } from '@capacitor/core'

const IS_NATIVE  = Capacitor.isNativePlatform()
const IS_ANDROID = Capacitor.getPlatform() === 'android'
const IS_IOS     = Capacitor.getPlatform() === 'ios'
const TAG        = '[LocalNotif]'

// iOS: compiled-in plugin, registered by BluTaskBridgeViewController.capacitorDidLoad()
const NativeNotif = registerPlugin('NativeNotifications')

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

// ── Android plugin loader ─────────────────────────────────────────────────────

let _lnPlugin = null

async function getLNPlugin() {
  if (_lnPlugin) {
    if (_lnPlugin.error) throw _lnPlugin.error
    return _lnPlugin.plugin
  }
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    _lnPlugin = { plugin: LocalNotifications }
    return LocalNotifications
  } catch (err) {
    _lnPlugin = { error: err }
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

// ── Platform-aware notification builders ──────────────────────────────────────

function oneShot(id, title, body, scheduledAt) {
  if (IS_IOS) return { id, title, body, scheduledAt }
  const n = { id, title, body, schedule: { at: new Date(scheduledAt), allowWhileIdle: true } }
  if (IS_ANDROID) n.channelId = CH_REMINDERS
  return n
}

function daily(id, title, body, hour) {
  if (IS_IOS) return { id, title, body, repeating: true, hour, minute: 0 }
  const n = { id, title, body, schedule: { on: { hour, minute: 0 }, repeats: true, allowWhileIdle: true } }
  if (IS_ANDROID) n.channelId = CH_SUMMARY
  return n
}

// ── Platform-specific primitives ──────────────────────────────────────────────

async function scheduleNotifs(notifications) {
  if (IS_IOS) {
    await withTimeout(NativeNotif.schedule({ notifications }), 8000, 'iOS schedule')
    return
  }
  const LN = await getLNPlugin()
  await ensureAndroidChannels(LN)
  await withTimeout(LN.schedule({ notifications }), 8000, 'Android schedule')
}

async function cancelByIds(ids) {
  if (!ids.length) return
  if (IS_IOS) {
    await NativeNotif.cancel({ ids: ids.map(String) })
    return
  }
  const LN = await getLNPlugin()
  await LN.cancel({ notifications: ids.map((id) => ({ id })) })
}

async function getPendingIds() {
  if (IS_IOS) {
    try {
      const { ids } = await withTimeout(NativeNotif.getPending(), 4000, 'iOS getPending')
      return (ids ?? []).map(Number)
    } catch { return [] }
  }
  try {
    const LN = await getLNPlugin()
    const { notifications: pending } = await withTimeout(LN.getPending(), 4000, 'Android getPending')
    return (pending ?? []).map((n) => n.id)
  } catch { return [] }
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
    if (IS_IOS) {
      const { status } = await withTimeout(
        NativeNotif.checkPermission(), 5000, 'iOS checkPermission'
      )
      console.log(TAG, 'iOS permission status:', status)
      return status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'prompt'
    }
    const LN = await getLNPlugin()
    const { display } = await withTimeout(LN.checkPermissions(), 5000, 'Android checkPermissions')
    console.log(TAG, 'Android permission status:', display)
    return display === 'granted' ? 'granted' : display === 'denied' ? 'denied' : 'prompt'
  } catch (err) {
    console.error(TAG, 'getPermissionStatus error:', err.message)
    return 'error'
  }
}

/**
 * Shows the OS permission dialog.
 * On iOS, permission is normally requested by AppDelegate at launch.
 * Returns 'granted' | 'denied' | 'error'
 */
export async function requestPermission() {
  if (!IS_NATIVE) return 'error'
  try {
    if (IS_IOS) {
      const { granted } = await withTimeout(
        NativeNotif.requestPermission(), 60_000, 'iOS requestPermission'
      )
      return granted ? 'granted' : 'denied'
    }
    const LN = await getLNPlugin()
    const { display } = await withTimeout(LN.requestPermissions(), 60_000, 'Android requestPermissions')
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
    await scheduleNotifs([
      oneShot(TEST_ID, 'BluTask notifications work! ✓',
        'Your notification setup is working correctly.', Date.now() + 5_000),
    ])
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
    await scheduleNotifs(notifs)
    console.log(TAG, `Scheduled ${notifs.length} reminder(s) for "${task.title}"`)
  } catch (err) {
    console.warn(TAG, 'scheduleTaskReminders failed:', err.message)
  }
}

export async function cancelTaskReminders(taskId) {
  if (!IS_NATIVE) return
  try {
    await cancelByIds([notifId(taskId, '1d'), notifId(taskId, '1h')])
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
    await scheduleNotifs(notifs)
    console.log(TAG, `Scheduled ${notifs.length} reminder(s) for "${assignment.title}"`)
  } catch (err) {
    console.warn(TAG, 'scheduleAssignmentReminders failed:', err.message)
  }
}

export async function cancelAssignmentReminders(assignmentId) {
  if (!IS_NATIVE) return
  try {
    await cancelByIds([notifId(assignmentId, 'a1d'), notifId(assignmentId, 'a1h')])
  } catch { /* no-op */ }
}

// ─────────────────────────────────────────────────────────────────────────────
// DAILY SUMMARY
// ─────────────────────────────────────────────────────────────────────────────

export async function scheduleDailySummary(hour = 8) {
  if (!IS_NATIVE) return
  try {
    await cancelByIds([DAILY_ID]).catch(() => {})
    await scheduleNotifs([
      daily(DAILY_ID, 'Good morning! Your BluTask summary',
        'Tap to review your tasks for today.', hour),
    ])
    console.log(TAG, `Daily summary set for ${hour}:00`)
  } catch (err) {
    console.warn(TAG, 'scheduleDailySummary failed:', err.message)
  }
}

export async function cancelDailySummary() {
  if (!IS_NATIVE) return
  try {
    await cancelByIds([DAILY_ID])
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
    const pendingIds = await getPendingIds()
    const toCancel = pendingIds.filter((id) => id !== DAILY_ID)
    if (toCancel.length) await cancelByIds(toCancel).catch(() => {})
    for (const t of tasks)       if (!t.completed && t.due_date) await scheduleTaskReminders(t)
    for (const a of assignments) if (!a.completed && a.due_date) await scheduleAssignmentReminders(a)
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
    const LN = await getLNPlugin()
    const { exact_alarm } = await withTimeout(LN.checkExactNotificationSetting(), 5000, 'checkExactNotificationSetting')
    return exact_alarm
  } catch { return 'unknown' }
}

export async function requestExactAlarmPermission() {
  if (!IS_NATIVE || !IS_ANDROID) return
  try {
    const LN = await getLNPlugin()
    await withTimeout(LN.changeExactNotificationSetting(), 120_000, 'changeExactNotificationSetting')
  } catch (err) {
    console.warn(TAG, 'changeExactNotificationSetting failed:', err.message)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FOREGROUND LISTENER (Android only — iOS delivery handled by AppDelegate)
// ─────────────────────────────────────────────────────────────────────────────

export async function addLocalNotificationListener(handler) {
  if (!IS_NATIVE || !IS_ANDROID) return () => {}
  try {
    const LN = await getLNPlugin()
    const h = await LN.addListener('localNotificationReceived', handler)
    return () => h.remove()
  } catch {
    return () => {}
  }
}

export function resetPluginCache() { _lnPlugin = null }

// Legacy aliases
export const requestWebPermission    = requestPermission
export const initLocalNotifications  = requestPermission
export const getWebPermission        = () => 'prompt'
export const sendWebTestNotification = sendTestNotification
