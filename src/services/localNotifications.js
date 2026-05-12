/**
 * localNotifications.js
 *
 * iOS: routes through NativeNotificationsPlugin (Swift, registered by
 *   BluTaskBridgeViewController.capacitorDidLoad), which calls Apple's
 *   UNUserNotificationCenter / UNTimeIntervalNotificationTrigger directly.
 *
 * Android: falls back to @capacitor/local-notifications (SPM auto-registered).
 *
 * Web: all exports are no-ops.
 */

import { Capacitor, registerPlugin } from '@capacitor/core'

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

// ── Plugin handles ────────────────────────────────────────────────────────────

// iOS: synchronous proxy created once — registerPlugin is always safe to call
// (returns a no-op object on web/Android so no guards needed here)
const NativeNotif = registerPlugin('NativeNotifications')

// Android: lazily loaded @capacitor/local-notifications
let _androidPlugin = null
async function getAndroidPlugin() {
  if (_androidPlugin) return _androidPlugin
  const { LocalNotifications } = await import('@capacitor/local-notifications')
  _androidPlugin = LocalNotifications
  return LocalNotifications
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
// iOS format: { id, title, body, scheduledAt: ms }
// Android format (translated below): @capacitor/local-notifications shape

function oneShot(id, title, body, scheduledAt) {
  return { id, title, body, scheduledAt }
}

function daily(id, title, body, hour) {
  return { id, title, body, repeating: true, hour, minute: 0 }
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
    ).catch((e) => console.warn(TAG, 'createChannel reminders:', e.message))
  }
  if (!ids.includes(CH_SUMMARY)) {
    await withTimeout(
      LN.createChannel({ id: CH_SUMMARY, name: 'Daily Summary',
        importance: 3, visibility: 1, vibration: false }),
      4000, 'createChannel summary'
    ).catch((e) => console.warn(TAG, 'createChannel summary:', e.message))
  }
}

// ── Core primitives ───────────────────────────────────────────────────────────

async function scheduleNotifs(notifications) {
  if (IS_ANDROID) {
    const LN = await getAndroidPlugin()
    await ensureAndroidChannels(LN)
    // Translate to @capacitor/local-notifications format
    const converted = notifications.map((n) => {
      const base = { id: n.id, title: n.title, body: n.body }
      if (n.repeating) {
        const ch = { id: n.id, title: n.title, body: n.body,
          schedule: { on: { hour: n.hour, minute: n.minute }, repeats: true, allowWhileIdle: true },
          channelId: CH_SUMMARY }
        return ch
      }
      return { ...base,
        schedule: { at: new Date(n.scheduledAt), allowWhileIdle: true },
        channelId: CH_REMINDERS }
    })
    await withTimeout(LN.schedule({ notifications: converted }), 8000, 'schedule-android')
    return
  }
  // iOS: call NativeNotificationsPlugin directly
  console.log(TAG, 'scheduleNotifs: sending', notifications.length, 'notification(s) to NativeNotif')
  await withTimeout(NativeNotif.schedule({ notifications }), 8000, 'schedule-ios')
}

async function cancelByIds(ids) {
  if (!ids.length) return
  if (IS_ANDROID) {
    const LN = await getAndroidPlugin()
    await LN.cancel({ notifications: ids.map((id) => ({ id })) })
    return
  }
  // iOS: plugin expects { ids: [String] }
  await NativeNotif.cancel({ ids: ids.map(String) })
}

async function getPendingIds() {
  try {
    if (IS_ANDROID) {
      const LN = await getAndroidPlugin()
      const { notifications: pending } = await withTimeout(LN.getPending(), 4000, 'getPending-android')
      return (pending ?? []).map((n) => n.id)
    }
    // iOS: plugin returns { ids: [String] }
    const { ids } = await withTimeout(NativeNotif.getPending(), 4000, 'getPending-ios')
    return (ids ?? []).map(Number)
  } catch { return [] }
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
    if (IS_ANDROID) {
      const LN = await getAndroidPlugin()
      const { display } = await withTimeout(LN.checkPermissions(), 5000, 'checkPermissions-android')
      console.log(TAG, 'permission (android):', display)
      return display === 'granted' ? 'granted' : display === 'denied' ? 'denied' : 'prompt'
    }
    // iOS: NativeNotificationsPlugin.checkPermission() → { display }
    const { display } = await withTimeout(NativeNotif.checkPermission(), 5000, 'checkPermission-ios')
    console.log(TAG, 'permission (ios):', display)
    return display === 'granted' ? 'granted' : display === 'denied' ? 'denied' : 'prompt'
  } catch (err) {
    console.error(TAG, 'getPermissionStatus error:', err.message)
    return 'error'
  }
}

/**
 * Shows the OS permission dialog.
 * On iOS, permission is requested by AppDelegate at launch — this is a fallback.
 * Returns 'granted' | 'denied' | 'error'
 */
export async function requestPermission() {
  if (!IS_NATIVE) return 'error'
  try {
    if (IS_ANDROID) {
      const LN = await getAndroidPlugin()
      const { display } = await withTimeout(LN.requestPermissions(), 60_000, 'requestPermissions-android')
      return display === 'granted' ? 'granted' : 'denied'
    }
    // iOS: NativeNotificationsPlugin.requestPermission() → { display }
    const { display } = await withTimeout(NativeNotif.requestPermission(), 60_000, 'requestPermission-ios')
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

  async function _attempt() {
    const status = await getPermissionStatus()
    if (status === 'denied') {
      return { ok: false, reason: 'Notifications are blocked. Go to iOS Settings → BluTask → Notifications and enable them.' }
    }
    if (status === 'error') {
      return { ok: false, reason: 'Could not check notification permission. Try restarting the app.' }
    }
    await scheduleNotifs([
      oneShot(TEST_ID, 'BluTask notifications work! ✓',
        'Your notification setup is working correctly.', Date.now() + 5_000),
    ])
    console.log(TAG, 'Test notification scheduled — fires in 5 s')
    return { ok: true }
  }

  try {
    return await withTimeout(_attempt(), 12_000, 'sendTestNotification')
  } catch (err) {
    console.error(TAG, 'sendTestNotification failed:', err.message)
    const isTimeout = err.message?.includes('Timed out')
    return {
      ok: false,
      reason: isTimeout
        ? 'Request timed out. Make sure notifications are enabled in iOS Settings → BluTask.'
        : err.message,
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TASK REMINDERS
// ─────────────────────────────────────────────────────────────────────────────

export async function scheduleTaskReminders(task) {
  if (!IS_NATIVE || !task?.id) return
  try {
    const now     = Date.now()
    const notifs  = []
    const explicit = Array.isArray(task.reminders) ? task.reminders : []

    if (explicit.length > 0) {
      explicit.slice(0, 5).forEach((isoTime, i) => {
        const at = new Date(isoTime).getTime()
        if (at > now) {
          notifs.push(oneShot(
            notifId(task.id, `r${i}`),
            task.title ?? 'Reminder',
            'Tap to view your task',
            at,
          ))
        }
      })
    } else if (task.due_date) {
      const dueMs = new Date(task.due_date).getTime()
      if (_prefs.task_reminders_1d) {
        const at = dueMs - 864e5
        if (at > now) notifs.push(oneShot(notifId(task.id, '1d'), 'Task due tomorrow', task.title ?? 'Upcoming task', at))
      }
      if (_prefs.task_reminders_1h) {
        const at = dueMs - 36e5
        if (at > now) notifs.push(oneShot(notifId(task.id, '1h'), 'Task due in 1 hour', task.title ?? 'Upcoming task', at))
      }
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
    await cancelByIds([
      notifId(taskId, '1d'),
      notifId(taskId, '1h'),
      ...Array.from({ length: 5 }, (_, i) => notifId(taskId, `r${i}`)),
    ])
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
    const at1d   = dueMs - 864e5
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
    await scheduleNotifs([daily(DAILY_ID, 'Good morning! Your BluTask summary', 'Tap to review your tasks for today.', hour)])
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
    const toCancel   = pendingIds.filter((id) => id !== DAILY_ID)
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
    const LN = await getAndroidPlugin()
    const { exact_alarm } = await withTimeout(LN.checkExactNotificationSetting(), 5000, 'checkExactAlarm')
    return exact_alarm
  } catch { return 'unknown' }
}

export async function requestExactAlarmPermission() {
  if (!IS_NATIVE || !IS_ANDROID) return
  try {
    const LN = await getAndroidPlugin()
    await withTimeout(LN.changeExactNotificationSetting(), 120_000, 'changeExactAlarm')
  } catch (err) {
    console.warn(TAG, 'changeExactNotificationSetting failed:', err.message)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FOREGROUND LISTENER (Android only — iOS handled by AppDelegate willPresent)
// ─────────────────────────────────────────────────────────────────────────────

export async function addLocalNotificationListener(handler) {
  if (!IS_NATIVE || !IS_ANDROID) return () => {}
  try {
    const LN = await getAndroidPlugin()
    const h = await LN.addListener('localNotificationReceived', handler)
    return () => h.remove()
  } catch {
    return () => {}
  }
}

export function resetPluginCache() { _androidPlugin = null }

// Legacy aliases
export const requestWebPermission    = requestPermission
export const initLocalNotifications  = requestPermission
export const getWebPermission        = () => 'prompt'
export const sendWebTestNotification = sendTestNotification
