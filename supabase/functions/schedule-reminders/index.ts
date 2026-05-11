/**
 * schedule-reminders — cron-triggered orchestrator
 *
 * Modes (pass in request body):
 *   { "mode": "reminders" }       — scan tasks/assignments/calendar for upcoming deadlines
 *   { "mode": "daily_summary" }   — send per-user productivity summary (run at 8 AM)
 *   (no body)                     — defaults to "reminders"
 *
 * Recommended pg_cron setup:
 *   every 30 min → { "mode": "reminders" }
 *   daily at 8am → { "mode": "daily_summary" }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

// ── send-push-notification caller ─────────────────────────────────────────────

async function notify(
  supabaseUrl: string,
  serviceRoleKey: string,
  userId: string,
  type: string,
  payload: Record<string, unknown>
): Promise<void> {
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
      method: 'POST',
      headers: {
        Authorization:   `Bearer ${serviceRoleKey}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({ type, userId, payload }),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => String(res.status))
      console.error(`send-push-notification failed (${type}) for ${userId.slice(0, 8)}...: ${res.status} ${text}`)
    } else {
      const json = await res.json().catch(() => ({}))
      if (json.sent > 0) {
        console.log(`Notified ${userId.slice(0, 8)}... type=${type} sent=${json.sent}`)
      }
    }
  } catch (e) {
    console.error(`notify() error for ${userId.slice(0, 8)}...:`, errMsg(e))
  }
}

// ── Preference cache ──────────────────────────────────────────────────────────

type Prefs = {
  task_reminders_1d: boolean
  task_reminders_1h: boolean
  assignment_alerts: boolean
  calendar_alerts: boolean
}

function makePrefsCache(supabase: ReturnType<typeof createClient>) {
  const cache: Record<string, Prefs> = {}
  return async (userId: string): Promise<Prefs> => {
    if (cache[userId]) return cache[userId]
    const { data } = await supabase
      .from('notification_preferences')
      .select('task_reminders_1d, task_reminders_1h, assignment_alerts, calendar_alerts')
      .eq('user_id', userId)
      .maybeSingle()
    const prefs: Prefs = {
      task_reminders_1d: data?.task_reminders_1d ?? true,
      task_reminders_1h: data?.task_reminders_1h ?? true,
      assignment_alerts: data?.assignment_alerts ?? true,
      calendar_alerts:   data?.calendar_alerts   ?? true,
    }
    cache[userId] = prefs
    return prefs
  }
}

// ── Mode: reminders ───────────────────────────────────────────────────────────

async function runReminders(
  supabase: ReturnType<typeof createClient>,
  supabaseUrl: string,
  serviceRoleKey: string
): Promise<Record<string, number>> {
  const now    = new Date()
  const p25h   = new Date(now.getTime() + 25 * 60 * 60 * 1000)  // ~1 day window
  const p65m   = new Date(now.getTime() + 65 * 60 * 1000)        // ~1 hour window

  const getPrefs = makePrefsCache(supabase)
  const counts = { tasks1d: 0, tasks1h: 0, assignments1d: 0, assignments1h: 0, calendar: 0 }

  // ── Task 1-day reminders ──────────────────────────────────────────────
  const { data: tasks1d, error: t1dErr } = await supabase
    .from('tasks')
    .select('id, user_id, title, due_date')
    .eq('completed', false)
    .not('due_date', 'is', null)
    .gte('due_date', now.toISOString())
    .lte('due_date', p25h.toISOString())

  if (t1dErr) console.error('tasks 1d error:', t1dErr.message)

  for (const task of tasks1d ?? []) {
    const prefs = await getPrefs(task.user_id)
    if (!prefs.task_reminders_1d) continue
    await notify(supabaseUrl, serviceRoleKey, task.user_id, 'task_reminder', {
      taskId: task.id, taskTitle: task.title, dueIn: '1d',
    })
    counts.tasks1d++
  }

  // ── Task 1-hour reminders ─────────────────────────────────────────────
  const { data: tasks1h, error: t1hErr } = await supabase
    .from('tasks')
    .select('id, user_id, title, due_date')
    .eq('completed', false)
    .not('due_date', 'is', null)
    .gte('due_date', now.toISOString())
    .lte('due_date', p65m.toISOString())

  if (t1hErr) console.error('tasks 1h error:', t1hErr.message)

  for (const task of tasks1h ?? []) {
    const prefs = await getPrefs(task.user_id)
    if (!prefs.task_reminders_1h) continue
    await notify(supabaseUrl, serviceRoleKey, task.user_id, 'task_reminder', {
      taskId: task.id, taskTitle: task.title, dueIn: '1h',
    })
    counts.tasks1h++
  }

  // ── Assignment 1-day alerts ───────────────────────────────────────────
  const { data: assign1d, error: a1dErr } = await supabase
    .from('assignments')
    .select('id, user_id, title, due_date')
    .not('due_date', 'is', null)
    .gte('due_date', now.toISOString())
    .lte('due_date', p25h.toISOString())

  if (a1dErr) console.error('assignments 1d error:', a1dErr.message)

  for (const a of assign1d ?? []) {
    const prefs = await getPrefs(a.user_id)
    if (!prefs.assignment_alerts) continue
    await notify(supabaseUrl, serviceRoleKey, a.user_id, 'assignment_alert', {
      assignmentId: a.id, assignmentTitle: a.title, dueIn: '1d',
    })
    counts.assignments1d++
  }

  // ── Assignment 1-hour alerts ──────────────────────────────────────────
  const { data: assign1h, error: a1hErr } = await supabase
    .from('assignments')
    .select('id, user_id, title, due_date')
    .not('due_date', 'is', null)
    .gte('due_date', now.toISOString())
    .lte('due_date', p65m.toISOString())

  if (a1hErr) console.error('assignments 1h error:', a1hErr.message)

  for (const a of assign1h ?? []) {
    const prefs = await getPrefs(a.user_id)
    if (!prefs.assignment_alerts) continue
    await notify(supabaseUrl, serviceRoleKey, a.user_id, 'assignment_alert', {
      assignmentId: a.id, assignmentTitle: a.title, dueIn: '1h',
    })
    counts.assignments1h++
  }

  // ── Calendar event reminders (15 min + 1 hour) ────────────────────────
  // Expects a `calendar_events` table with: user_id, title, start_time (timestamptz)
  const p75m  = new Date(now.getTime() + 75  * 60 * 1000)
  const p45m  = new Date(now.getTime() + 45  * 60 * 1000)
  const p20m  = new Date(now.getTime() + 20  * 60 * 1000)

  const { data: calEvents } = await supabase
    .from('calendar_events')
    .select('id, user_id, title, start_time')
    .not('start_time', 'is', null)
    .gte('start_time', now.toISOString())
    .lte('start_time', p75m.toISOString())

  for (const ev of calEvents ?? []) {
    const prefs = await getPrefs(ev.user_id)
    if (!prefs.calendar_alerts) continue
    const start = new Date(ev.start_time)
    const minsUntil = Math.round((start.getTime() - now.getTime()) / 60000)
    // Only fire at the ~1-hour or ~15-min marks (within the 30-min cron window)
    if (minsUntil > 45 && minsUntil <= 75) {
      await notify(supabaseUrl, serviceRoleKey, ev.user_id, 'calendar_reminder', {
        eventTitle: ev.title,
        eventTime: start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        minutesUntil: 60,
      })
      counts.calendar++
    } else if (minsUntil > 5 && minsUntil <= 20) {
      await notify(supabaseUrl, serviceRoleKey, ev.user_id, 'calendar_reminder', {
        eventTitle: ev.title,
        eventTime: start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        minutesUntil: 15,
      })
      counts.calendar++
    }
  }
  // Silence unused variable warnings for narrowing variables we only use inline
  void p45m; void p20m

  return counts
}

// ── Mode: daily_summary ───────────────────────────────────────────────────────

async function runDailySummary(
  supabase: ReturnType<typeof createClient>,
  supabaseUrl: string,
  serviceRoleKey: string
): Promise<{ usersNotified: number }> {
  const now = new Date()
  const startOfDay = new Date(now)
  startOfDay.setHours(0, 0, 0, 0)

  // Get all users who have push tokens (and therefore want notifications)
  const { data: tokenRows, error: tokErr } = await supabase
    .from('push_tokens')
    .select('user_id')

  if (tokErr) {
    console.error('push_tokens query error:', tokErr.message)
    return { usersNotified: 0 }
  }

  const userIds = [...new Set((tokenRows ?? []).map((r) => r.user_id))]
  let usersNotified = 0

  for (const userId of userIds) {
    try {
      // Tasks completed today
      const { count: completed } = await supabase
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('completed', true)
        .gte('updated_at', startOfDay.toISOString())

      // Tasks still pending (not completed, due today or earlier)
      const { count: pending } = await supabase
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('completed', false)

      // Overdue tasks (due before now, not completed)
      const { count: overdue } = await supabase
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('completed', false)
        .lt('due_date', now.toISOString())

      await notify(supabaseUrl, serviceRoleKey, userId, 'daily_summary', {
        completedCount: completed ?? 0,
        pendingCount:   (pending ?? 0) - (overdue ?? 0),
        overdueCount:   overdue ?? 0,
      })
      usersNotified++
    } catch (e) {
      console.error(`daily summary failed for ${userId.slice(0, 8)}...:`, errMsg(e))
    }
  }

  return { usersNotified }
}

// ── Handler ───────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin':  '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  const supabaseUrl    = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase       = createClient(supabaseUrl, serviceRoleKey)

  let mode = 'reminders'
  try {
    const body = await req.json().catch(() => ({}))
    if (body?.mode) mode = body.mode
  } catch { /* ignore */ }

  console.log(`[schedule-reminders] mode=${mode}`)

  try {
    if (mode === 'daily_summary') {
      const result = await runDailySummary(supabase, supabaseUrl, serviceRoleKey)
      return jsonResponse(result)
    }
    const counts = await runReminders(supabase, supabaseUrl, serviceRoleKey)
    return jsonResponse(counts)
  } catch (e) {
    console.error('schedule-reminders fatal:', errMsg(e))
    return jsonResponse({ error: errMsg(e) }, 500)
  }
})
