/**
 * localNotifications.js
 *
 * Schedules local notifications via BluTaskNotificationsPlugin — a minimal
 * custom Capacitor plugin in ios/App/App/BluTaskNotificationsPlugin.swift.
 * This bypasses @capacitor/local-notifications which was hanging on iOS.
 *
 * Android still uses @capacitor/local-notifications because our custom plugin
 * is iOS-only (no Android implementation registered).
 */

import { Capacitor, registerPlugin } from '@capacitor/core'

const IS_NATIVE  = Capacitor.isNativePlatform()
const IS_ANDROID = Capacitor.getPlatform() === 'android'
const IS_IOS     = Capacitor.getPlatform() === 'ios'
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

// Custom iOS plugin — registered explicitly in BluTaskBridgeViewController.
const _iosPlugin = IS_IOS
  ? registerPlugin('BluTaskNotifications', {
      web: () => ({
        checkPermissions:  async () => ({ display: 'prompt' }),
        requestPermissions: async () => ({ display: 'denied' }),
        schedule:          async () => ({ notifications: [] }),
        getPending:        async () => ({ notifications: [] }),
        cancel:            async () => {},
      }),
    })
  : null

let _androidPlugin = null

async function getAndroidPlugin() {
  if (_androidPlugin) {
    if (_androidPlugin.error) throw _androidPlugin.error
    return _androidPlugin.plugin
  }
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    _androidPlugin = { plugin: LocalNotifications }
    return LocalNotifications
  } catch (err) {
    _androidPlugin = { error: err }
    throw err
  }
}

async function getPlugin() {
  if (IS_IOS)     return _iosPlugin
  if (IS_ANDROID) return getAndroidPlugin()
  return null
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
  // Use ISO string, not a Date object. WebKit's postMessage serialises JS Date
  // objects as NSDate on the Swift side, but our plugin (and @capacitor/
  // local-notifications) expect a string. toISOString() is always a string.
  const at = new Date(scheduledAt).toISOString()
  const n = { id, title, body, schedule: { at } }
  if (IS_ANDROID) {
    n.schedule.allowWhileIdle = true
    n.channelId = CH_REMINDERS
  }
  return n
}

function daily(id, title, body, hour) {
  const n = { id, title, body, schedule: { on: { hour, minute: 0 }, repeats: true } }
  if (IS_ANDROID) {
    n.schedule.allowWhileIdle = true
    n.channelId = CH_SUMMARY
  }
  return n
}

// ── Core primitives ───────────────────────────────────────────────────────────

async function scheduleNotifs(notifications) {
  const LN = await getPlugin()
  if (!LN) return
  if (IS_ANDROID) await ensureAndroidChannels(LN)
  // iOS uses custom plugin — no timeout wrapper needed (DispatchGroup resolves promptly)
  // Android keeps the 8s timeout as before
  if (IS_ANDROID) {
    await withTimeout(LN.schedule({ notifications }), 8000, 'schedule')
  } else {
    await LN.schedule({ notifications })
  }
}

async function cancelByIds(ids) {
  if (!ids.length) return
  const LN = await getPlugin()
  if (!LN) return
  await LN.cancel({ notifications: ids.map((id) => ({ id })) })
}

async function getPendingIds() {
  try {
    const LN = await getPlugin()
    if (!LN) return []
    const { notifications: pending } = await withTimeout(LN.getPending(), 4000, 'getPending')
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

// ─────────────────────────────────────────────────────────────────────────────
// PERMISSION
// ─────────────────────────────────────────────────────────────────────────────

export async function getPermissionStatus() {
  if (!IS_NATIVE) return 'prompt'
  try {
    const LN = await getPlugin()
    if (!LN) return 'error'
    const { display } = await withTimeout(LN.checkPermissions(), 5000, 'checkPermissions')
    console.log(TAG, 'permission:', display)
    return display === 'granted' ? 'granted' : display === 'denied' ? 'denied' : 'prompt'
  } catch (err) {
    console.error(TAG, 'getPermissionStatus error:', err.message)
    return 'error'
  }
}

export async function requestPermission() {
  if (!IS_NATIVE) return 'error'
  try {
    const LN = await getPlugin()
    if (!LN) return 'error'
    const { display } = await withTimeout(LN.requestPermissions(), 60_000, 'requestPermissions')
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
  // BUILD 75 DIAGNOSTIC: bypasses scheduleNotifs and calls LN.schedule directly
  // so we can read its return value (expecting marker=BUILD-75-STRIPPED).
  // Always returns ok:false so the diagnostic surfaces in the UI's error path
  // — the success path hardcodes its own message and would hide the marker.
  if (!IS_NATIVE) return { ok: false, reason: 'Not running as a native app' }

  const platform   = Capacitor.getPlatform()
  const pluginKeys = Object.keys(Capacitor.Plugins || {}).join(',') || '(none)'
  const available  = Capacitor.isPluginAvailable('BluTaskNotifications')
  const diag       = `pf=${platform} avail=${available} keys=[${pluginKeys}]`

  try {
    const LN = await getPlugin()
    if (!LN) return { ok: false, reason: `DIAG: no plugin. ${diag}` }

    const t0 = Date.now()
    const result = await withTimeout(
      LN.schedule({
        notifications: [
          oneShot(TEST_ID, 'BluTask notifications work! ✓',
            'Your notification setup is working correctly.', Date.now() + 5_000),
        ],
      }),
      10_000,
      'schedule',
    )
    const elapsed = Date.now() - t0
    const marker  = result?.marker ?? `(no marker — raw=${JSON.stringify(result)})`
    return { ok: false, reason: `DIAG: schedule resolved in ${elapsed}ms marker=${marker} ${diag}` }
  } catch (err) {
    const isTimeout = err?.message?.includes('Timed out')
    return {
      ok: false,
      reason: isTimeout
        ? `DIAG: schedule hung >10s. ${diag}`
        : `DIAG: schedule threw: ${err?.message ?? String(err)} ${diag}`,
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TASK REMINDERS
// ─────────────────────────────────────────────────────────────────────────────

export async function scheduleTaskReminders(task) {
  if (!IS_NATIVE || !task?.id) return
  try {
    const now    = Date.now()
    const notifs = []
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
    const dueMs = new Date(assignment.due_date).getTime()
    const now   = Date.now()
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
    const LN = await getPlugin()
    const { exact_alarm } = await withTimeout(LN.checkExactNotificationSetting(), 5000, 'checkExactAlarm')
    return exact_alarm
  } catch { return 'unknown' }
}

export async function requestExactAlarmPermission() {
  if (!IS_NATIVE || !IS_ANDROID) return
  try {
    const LN = await getPlugin()
    await withTimeout(LN.changeExactNotificationSetting(), 120_000, 'changeExactAlarm')
  } catch (err) {
    console.warn(TAG, 'changeExactNotificationSetting failed:', err.message)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FOREGROUND LISTENER (Android only)
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

export function resetPluginCache() { _androidPlugin = null }

// Legacy aliases
export const requestWebPermission    = requestPermission
export const initLocalNotifications  = requestPermission
export const getWebPermission        = () => 'prompt'
export const sendWebTestNotification = sendTestNotification
