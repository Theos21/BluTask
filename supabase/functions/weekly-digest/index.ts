// Supabase Edge Function: weekly-digest
// Schedule: every Monday at 8 AM UTC
// Deploy: supabase functions deploy weekly-digest
// Cron:   supabase functions deploy weekly-digest --schedule "0 8 * * 1"
//
// Required env vars (set in Supabase dashboard → Edge Functions → Secrets):
//   RESEND_API_KEY  — your Resend API key
//   SUPABASE_URL    — auto-injected
//   SUPABASE_SERVICE_ROLE_KEY — auto-injected

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

async function sendDigest(userId: string, email: string, name: string) {
  const now = new Date()
  const weekEnd = new Date(now)
  weekEnd.setDate(weekEnd.getDate() + 7)

  // Fetch upcoming tasks due this week
  const { data: tasks } = await supabase
    .from('tasks')
    .select('title, due_date, priority, list_id')
    .eq('user_id', userId)
    .eq('completed', false)
    .gte('due_date', now.toISOString())
    .lte('due_date', weekEnd.toISOString())
    .order('due_date', { ascending: true })
    .limit(10)

  // Fetch overdue tasks
  const { data: overdueTasks } = await supabase
    .from('tasks')
    .select('title, due_date, priority')
    .eq('user_id', userId)
    .eq('completed', false)
    .lt('due_date', now.toISOString())
    .order('due_date', { ascending: true })
    .limit(5)

  // Fetch upcoming assignments
  const { data: assignments } = await supabase
    .from('assignments')
    .select('title, due_date, type, class_id')
    .eq('user_id', userId)
    .eq('submitted', false)
    .gte('due_date', now.toISOString())
    .lte('due_date', weekEnd.toISOString())
    .order('due_date', { ascending: true })
    .limit(10)

  const overdueBlock = (overdueTasks?.length ?? 0) > 0
    ? `<h2 style="color:#ef4444;font-size:14px;margin:20px 0 8px">⚠️ Overdue (${overdueTasks!.length})</h2>
       <ul style="padding:0;list-style:none;margin:0 0 20px">
         ${overdueTasks!.map(t => `<li style="padding:6px 0;border-bottom:1px solid #f3f4f6;font-size:13px;color:#374151">
           ${t.title} <span style="color:#9ca3af;font-size:11px">· ${formatDate(t.due_date!)}</span>
         </li>`).join('')}
       </ul>`
    : ''

  const tasksBlock = (tasks?.length ?? 0) > 0
    ? `<h2 style="color:#374151;font-size:14px;margin:20px 0 8px">📋 Tasks this week</h2>
       <ul style="padding:0;list-style:none;margin:0 0 20px">
         ${tasks!.map(t => `<li style="padding:6px 0;border-bottom:1px solid #f3f4f6;font-size:13px;color:#374151">
           ${t.title} <span style="color:#9ca3af;font-size:11px">· ${t.due_date ? formatDate(t.due_date) : 'No date'}</span>
         </li>`).join('')}
       </ul>`
    : '<p style="color:#9ca3af;font-size:13px;margin:0 0 20px">No tasks due this week. 🎉</p>'

  const assignmentsBlock = (assignments?.length ?? 0) > 0
    ? `<h2 style="color:#374151;font-size:14px;margin:20px 0 8px">🎓 Assignments this week</h2>
       <ul style="padding:0;list-style:none;margin:0 0 20px">
         ${assignments!.map(a => `<li style="padding:6px 0;border-bottom:1px solid #f3f4f6;font-size:13px;color:#374151">
           ${a.title} <span style="color:#9ca3af;font-size:11px">· ${a.due_date ? formatDate(a.due_date) : 'No date'}</span>
         </li>`).join('')}
       </ul>`
    : ''

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;padding:32px 20px;color:#111827;background:#fff">
  <div style="margin-bottom:28px">
    <span style="font-size:20px;font-weight:700;color:#1a56db">Blu</span><span style="font-size:20px;font-weight:400;color:#374151">Task</span>
  </div>
  <h1 style="font-size:18px;font-weight:600;color:#111827;margin:0 0 4px">Your week ahead, ${name}</h1>
  <p style="font-size:13px;color:#6b7280;margin:0 0 28px">
    ${now.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} – ${weekEnd.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
  </p>

  ${overdueBlock}
  ${tasksBlock}
  ${assignmentsBlock}

  <div style="margin-top:32px;padding-top:20px;border-top:1px solid #f3f4f6">
    <a href="${SUPABASE_URL.replace('supabase.co', 'vercel.app')}" style="color:#1a56db;font-size:12px;text-decoration:none">Open BluTask →</a>
    <p style="font-size:11px;color:#d1d5db;margin:8px 0 0">You're receiving this because weekly digests are enabled in your BluTask settings.</p>
  </div>
</body>
</html>`

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'BluTask <digest@yourdomain.com>',
      to: email,
      subject: `Your week ahead — ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
      html,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error(`Failed to send to ${email}:`, err)
  }
}

serve(async (_req) => {
  try {
    // Fetch all users with weekly digest enabled
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, full_name, display_name')
      .eq('weekly_digest', true)

    if (error) throw error

    // Get emails for each profile from auth.users
    const results = await Promise.allSettled(
      (profiles ?? []).map(async (profile) => {
        const { data: authUser } = await supabase.auth.admin.getUserById(profile.id)
        if (!authUser?.user?.email) return
        const name = profile.display_name || profile.full_name?.split(' ')[0] || 'there'
        await sendDigest(profile.id, authUser.user.email, name)
      })
    )

    const sent = results.filter(r => r.status === 'fulfilled').length
    return new Response(JSON.stringify({ sent }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
