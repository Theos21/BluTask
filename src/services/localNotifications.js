/**
 * localNotifications.js
 *
 * iOS  → NativeNotificationsPlugin (custom Swift plugin wrapping UNUserNotificationCenter)
 * Android → @capacitor/local-notifications (unchanged, works fine on Android)
 * Web  → no-op (browser notifications handled separately)
 */

import { Capacitor, registerPlugin } from '@capacitor/core'

const IS_NATIVE  = Capacitor.isNativePlatform()
const IS_ANDROID = Capacitor.getPlatform() === 'android'
const IS_IOS     = Capacitor.getPlatform() === 'ios'
const TAG        = '[NativeNotif]'

// ── Native plugin registration ────────────────────────────────────────────────
// registerPlugin creates a JS proxy that routes calls through the Capacitor
// bridge to NativeNotificationsPlugin.swift (registered in BluTaskBridgeViewController).
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

// ── Android path (unchanged) ──────────────────────────────────────────────────

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

// ── Timeout guard ─────────────────────────────────────────────────────────────

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Timed out after ${ms}ms (${label})`)), ms)
    ),
  ])
}

// ── Deterministic numeric ID → string (for UNNotificationRequest identifier) ──

function notifId(uuid, suffix) {
  const s = uuid + suffix
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i)
  return String((h & 0x7fffffff) || 1)
}

const DAILY_STR_ID = '2000000000'
const TEST_STR_ID  = '1999999999'

// Android channel IDs
const CH_REMINDERS = 'blutask-reminders'
const CH_SUMMARY   = 'blutask-summary'

// ── Android channel setup (unchanged) ────────────────────────────────────────

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
        NativeNotif.checkPermission(),
        5000,
        'iOS checkPermission'
      )
      console.log(TAG, 'iOS permission status:', status)
      return status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'prompt'
    }

    // Android
    const LN = await getAndroidPlugin()
    const { display } = await withTimeout(LN.checkPermissions(), 5000, 'Android checkPermissions')
    return display === 'granted' ? 'granted' : display === 'denied' ? 'denied' : 'prompt'
  } catch (err) {
    console.error(TAG, 'getPermissionStatus error:', err.message)
    return 'error'
  }
}

/**
 * Shows the OS permission dialog.
 * Returns 'granted' | 'denied' | 'error'
 * 60-second timeout prevents hanging forever if the bridge stalls.
 */
export async function requestPermission() {
  if (!IS_NATIVE) return 'error'

  try {
    if (IS_IOS) {
      const { granted } = await withTimeout(
        NativeNotif.requestPermission(),
        60_000,
        'iOS requestPermission'
      )
      console.log(TAG, 'iOS requestPermission granted:', granted)
      return granted ? 'granted' : 'denied'
    }

    // Android
    const LN = await getAndroidPlugin()
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
    const fireAt = Date.now() + 5_000

    if (IS_IOS) {
      await withTimeout(
        NativeNotif.schedule({ notifications: [{
          id:          Number(TEST_STR_ID),
          title:       'BluTask notifications work! ✓',
          body:        'Your notification setup is working correctly.',
          scheduledAt: fireAt,
        }] }),
        8000, 'iOS schedule test'
      )
    } else {
      const LN = await getAndroidPlugin()
      await ensureAndroidChannels(LN)
      await withTimeout(
        LN.schedule({ notifications: [{
          id:        Number(TEST_STR_ID),
          title:     'BluTask notifications work! ✓',
          body:      'Your notification setup is working correctly.',
          channelId: CH_REMINDERS,
          schedule:  { at: new Date(fireAt), allowWhileIdle: true },
        }] }),
        8000, 'Android schedule test'
      )
    }

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
    const dueMs = new Date(task.due_date).getTime()
    const now   = Date.now()
    const notifs = []

    if (_prefs.task_reminders_1d) {
      const at = dueMs - 864e5
      if (at > now) notifs.push({ id: Number(notifId(task.id, '1d')), title: 'Task due tomorrow',
        body: task.title ?? 'Upcoming task', scheduledAt: at })
    }
    if (_prefs.task_reminders_1h) {
      const at = dueMs - 36e5
      if (at > now) notifs.push({ id: Number(notifId(task.id, '1h')), title: 'Task due in 1 hour',
        body: task.title ?? 'Upcoming task', scheduledAt: at })
    }
    if (!notifs.length) return

    if (IS_IOS) {
      await withTimeout(NativeNotif.schedule({ notifications: notifs }), 5000, 'iOS schedule task')
    } else {
      const LN = await getAndroidPlugin()
      const androidNotifs = notifs.map((n) => ({
        id: n.id, title: n.title, body: n.body, channelId: CH_REMINDERS,
        schedule: { at: new Date(n.scheduledAt), allowWhileIdle: true },
      }))
      await withTimeout(LN.schedule({ notifications: androidNotifs }), 5000, 'Android schedule task')
    }
    console.log(TAG, `Scheduled ${notifs.length} reminder(s) for "${task.title}"`)
  } catch (err) {
    console.warn(TAG, 'scheduleTaskReminders failed:', err.message)
  }
}

export async function cancelTaskReminders(taskId) {
  if (!IS_NATIVE) return
  try {
    const ids = [notifId(taskId, '1d'), notifId(taskId, '1h')]
    if (IS_IOS) {
      await NativeNotif.cancel({ ids })
    } else {
      const LN = await getAndroidPlugin()
      await LN.cancel({ notifications: ids.map((id) => ({ id: Number(id) })) })
    }
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
    if (at1d > now) notifs.push({ id: Number(notifId(assignment.id, 'a1d')), title: 'Assignment due tomorrow',
      body: assignment.title ?? 'Upcoming assignment', scheduledAt: at1d })

    const at1h = dueMs - 36e5
    if (at1h > now) notifs.push({ id: Number(notifId(assignment.id, 'a1h')), title: 'Assignment due in 1 hour',
      body: assignment.title ?? 'Upcoming assignment', scheduledAt: at1h })

    if (!notifs.length) return

    if (IS_IOS) {
      await withTimeout(NativeNotif.schedule({ notifications: notifs }), 5000, 'iOS schedule assignment')
    } else {
      const LN = await getAndroidPlugin()
      const androidNotifs = notifs.map((n) => ({
        id: n.id, title: n.title, body: n.body, channelId: CH_REMINDERS,
        schedule: { at: new Date(n.scheduledAt), allowWhileIdle: true },
      }))
      await withTimeout(LN.schedule({ notifications: androidNotifs }), 5000, 'Android schedule assignment')
    }
    console.log(TAG, `Scheduled ${notifs.length} reminder(s) for "${assignment.title}"`)
  } catch (err) {
    console.warn(TAG, 'scheduleAssignmentReminders failed:', err.message)
  }
}

export async function cancelAssignmentReminders(assignmentId) {
  if (!IS_NATIVE) return
  try {
    const ids = [notifId(assignmentId, 'a1d'), notifId(assignmentId, 'a1h')]
    if (IS_IOS) {
      await NativeNotif.cancel({ ids })
    } else {
      const LN = await getAndroidPlugin()
      await LN.cancel({ notifications: ids.map((id) => ({ id: Number(id) })) })
    }
  } catch { /* no-op */ }
}

// ─────────────────────────────────────────────────────────────────────────────
// DAILY SUMMARY
// ─────────────────────────────────────────────────────────────────────────────

export async function scheduleDailySummary(hour = 8) {
  if (!IS_NATIVE) return
  try {
    if (IS_IOS) {
      await NativeNotif.cancel({ ids: [DAILY_STR_ID] }).catch(() => {})
      await withTimeout(
        NativeNotif.schedule({ notifications: [{
          id:       Number(DAILY_STR_ID),
          title:    'Good morning! Your BluTask summary',
          body:     'Tap to review your tasks for today.',
          repeating: true,
          hour,
          minute:   0,
        }] }),
        5000, 'iOS schedule daily summary'
      )
    } else {
      const LN = await getAndroidPlugin()
      await ensureAndroidChannels(LN)
      await LN.cancel({ notifications: [{ id: Number(DAILY_STR_ID) }] }).catch(() => {})
      await withTimeout(
        LN.schedule({ notifications: [{
          id: Number(DAILY_STR_ID), title: 'Good morning! Your BluTask summary',
          body: 'Tap to review your tasks for today.', channelId: CH_SUMMARY,
          schedule: { on: { hour, minute: 0 }, repeats: true, allowWhileIdle: true },
        }] }),
        5000, 'Android schedule daily summary'
      )
    }
    console.log(TAG, `Daily summary set for ${hour}:00`)
  } catch (err) {
    console.warn(TAG, 'scheduleDailySummary failed:', err.message)
  }
}

export async function cancelDailySummary() {
  if (!IS_NATIVE) return
  try {
    if (IS_IOS) {
      await NativeNotif.cancel({ ids: [DAILY_STR_ID] })
    } else {
      const LN = await getAndroidPlugin()
      await LN.cancel({ notifications: [{ id: Number(DAILY_STR_ID) }] })
    }
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
    // Cancel all existing non-daily notifications
    if (IS_IOS) {
      const { ids: pending } = await withTimeout(
        NativeNotif.getPending(), 4000, 'iOS getPending'
      ).catch(() => ({ ids: [] }))
      const toCancel = pending.filter((id) => id !== DAILY_STR_ID)
      if (toCancel.length) await NativeNotif.cancel({ ids: toCancel }).catch(() => {})
    } else {
      const LN = await getAndroidPlugin()
      await ensureAndroidChannels(LN)
      const { notifications: pending } = await withTimeout(
        LN.getPending(), 4000, 'Android getPending'
      ).catch(() => ({ notifications: [] }))
      const toCancel = pending.filter((n) => n.id !== Number(DAILY_STR_ID))
      if (toCancel.length) await LN.cancel({ notifications: toCancel.map((n) => ({ id: n.id })) }).catch(() => {})
    }

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
// EXACT ALARM (Android only) — kept for compatibility
// ─────────────────────────────────────────────────────────────────────────────

export async function getExactAlarmStatus() {
  if (!IS_NATIVE || !IS_ANDROID) return 'granted'
  try {
    const LN = await getAndroidPlugin()
    const { exact_alarm } = await withTimeout(
      LN.checkExactNotificationSetting(), 5000, 'checkExactNotificationSetting'
    )
    return exact_alarm
  } catch { return 'unknown' }
}

export async function requestExactAlarmPermission() {
  if (!IS_NATIVE || !IS_ANDROID) return
  try {
    const LN = await getAndroidPlugin()
    await withTimeout(LN.changeExactNotificationSetting(), 120_000, 'changeExactNotificationSetting')
  } catch (err) {
    console.warn(TAG, 'changeExactNotificationSetting failed:', err.message)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FOREGROUND LISTENER (Android only — iOS foreground delivery is handled natively)
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
