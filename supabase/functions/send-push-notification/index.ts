import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const BUNDLE_ID = 'com.blutask.app'
const APNS_SANDBOX = 'https://api.sandbox.push.apple.com'
const APNS_PROD    = 'https://api.push.apple.com'

// ── Types ─────────────────────────────────────────────────────────────────────

type NotificationType =
  | 'task_reminder'
  | 'assignment_alert'
  | 'calendar_reminder'
  | 'daily_summary'
  | 'test'

interface NotificationPayload {
  // task_reminder
  taskId?: string
  taskTitle?: string
  dueIn?: '1h' | '1d'
  // assignment_alert
  assignmentId?: string
  assignmentTitle?: string
  // calendar_reminder
  eventTitle?: string
  eventTime?: string    // human-readable, e.g. "3:00 PM"
  minutesUntil?: number // 15 | 60
  // daily_summary
  completedCount?: number
  pendingCount?: number
  overdueCount?: number
}

interface SendRequest {
  type: NotificationType
  userId: string
  payload?: NotificationPayload
  /** true → APNs production endpoint; false/omit → sandbox */
  production?: boolean
}

interface DeliveryResult {
  type: NotificationType
  sent: number
  skipped: number
  errors: Array<{ token: string; platform: string; error: string }>
  durationMs: number
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

function b64url(bytes: Uint8Array): string {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function textB64url(t: string): string {
  return b64url(new TextEncoder().encode(t))
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

// ── APNs auth ─────────────────────────────────────────────────────────────────

/**
 * Imports the APNs .p8 key from APNS_KEY_B64 (base64 of the whole .p8 file).
 * The .p8 file is itself a PEM-wrapped PKCS#8 private key, so we decode the
 * outer base64 to get the PEM text, strip the headers, then decode the inner
 * base64 to get the raw DER bytes for importKey.
 */
async function loadApnsKey(b64File: string): Promise<CryptoKey> {
  const pem = new TextDecoder().decode(
    Uint8Array.from(atob(b64File), (c) => c.charCodeAt(0))
  )
  const inner = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/-----BEGIN EC PRIVATE KEY-----/, '')
    .replace(/-----END EC PRIVATE KEY-----/, '')
    .replace(/\s+/g, '')
  const der = Uint8Array.from(atob(inner), (c) => c.charCodeAt(0))
  return crypto.subtle.importKey(
    'pkcs8',
    der.buffer,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  )
}

async function makeApnsJwt(teamId: string, keyId: string, key: CryptoKey): Promise<string> {
  const header  = textB64url(JSON.stringify({ alg: 'ES256', kid: keyId }))
  const payload = textB64url(JSON.stringify({ iss: teamId, iat: Math.floor(Date.now() / 1000) }))
  const input   = `${header}.${payload}`
  const sig     = await crypto.subtle.sign(
    { name: 'ECDSA', hash: { name: 'SHA-256' } },
    key,
    new TextEncoder().encode(input)
  )
  return `${input}.${b64url(new Uint8Array(sig))}`
}

// ── Message templates ─────────────────────────────────────────────────────────

interface Message {
  title: string
  body: string
  data: Record<string, string>
}

// Productivity tips rotated by day-of-week so daily summaries feel fresh
const TIPS = [
  'Small steps every day lead to big results.',
  'Focus on progress, not perfection.',
  'Your future self will thank you.',
  'One task at a time keeps the stress away.',
  'Consistency beats intensity.',
  'Done is better than perfect.',
  'You\'re doing great — keep going!',
]

function buildMessage(type: NotificationType, p: NotificationPayload): Message {
  switch (type) {
    case 'task_reminder': {
      const when = p.dueIn === '1h' ? 'in 1 hour' : 'tomorrow'
      return {
        title: `Task due ${when}`,
        body:  p.taskTitle ?? 'You have a task coming up',
        data:  { type, ...(p.taskId ? { taskId: p.taskId } : {}) },
      }
    }

    case 'assignment_alert': {
      const when = p.dueIn === '1h' ? 'in 1 hour' : 'tomorrow'
      return {
        title: `Assignment due ${when}`,
        body:  p.assignmentTitle ?? 'You have an assignment due soon',
        data:  { type, ...(p.assignmentId ? { assignmentId: p.assignmentId } : {}) },
      }
    }

    case 'calendar_reminder': {
      const when = p.minutesUntil === 15 ? 'in 15 min'
                 : p.minutesUntil === 60 ? 'in 1 hour'
                 : 'soon'
      return {
        title: 'Upcoming event',
        body:  p.eventTitle
          ? `${p.eventTitle} starts ${when}${p.eventTime ? ` at ${p.eventTime}` : ''}`
          : `You have an event ${when}`,
        data: { type },
      }
    }

    case 'daily_summary': {
      const done    = p.completedCount ?? 0
      const pending = p.pendingCount   ?? 0
      const overdue = p.overdueCount   ?? 0
      const tip     = TIPS[new Date().getDay()]
      const statsLine = overdue > 0
        ? `${done} completed · ${pending} pending · ⚠️ ${overdue} overdue`
        : `${done} completed · ${pending} pending`
      return {
        title: 'Good morning! Your BluTask summary',
        body:  `${statsLine} — ${tip}`,
        data:  { type },
      }
    }

    case 'test':
    default:
      return {
        title: 'BluTask is working!',
        body:  'Push notifications are set up correctly. 🎉',
        data:  { type: 'test' },
      }
  }
}

// ── APNs send ─────────────────────────────────────────────────────────────────

async function sendToApns(
  token:   string,
  message: Message,
  jwt:     string,
  host:    string,
): Promise<{ ok: boolean; status?: number; error?: string }> {
  const apnsBody = {
    aps: {
      alert: { title: message.title, body: message.body },
      sound: 'default',
      badge: 1,
    },
    ...message.data,
  }

  try {
    const res = await fetch(`${host}/3/device/${token}`, {
      method: 'POST',
      headers: {
        authorization:      `bearer ${jwt}`,
        'apns-topic':       BUNDLE_ID,
        'apns-push-type':   'alert',
        'apns-priority':    '10',
        'content-type':     'application/json',
      },
      body: JSON.stringify(apnsBody),
    })

    if (res.ok) return { ok: true, status: res.status }

    let reason = ''
    try {
      const j = await res.json()
      reason = j.reason ?? JSON.stringify(j)
    } catch {
      reason = await res.text().catch(() => `HTTP ${res.status}`)
    }
    return { ok: false, status: res.status, error: `APNs ${res.status}: ${reason}` }
  } catch (e) {
    return { ok: false, error: `APNs network error: ${errMsg(e)}` }
  }
}

// FCM stub — replace with Firebase Admin / HTTP v1 API when Android ships
function sendToFcm(token: string, message: Message): { ok: boolean; error?: string } {
  console.log('[FCM stub]', token.slice(0, 12) + '...', '|', message.title)
  return { ok: true }
}

// ── Main handler ──────────────────────────────────────────────────────────────

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin':  '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  const t0 = Date.now()

  // ── Parse & validate body ─────────────────────────────────────────────
  let body: SendRequest
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400)
  }

  const { type, userId, payload = {}, production = false } = body

  if (!userId) return jsonResponse({ error: 'userId is required' }, 400)

  const VALID_TYPES: NotificationType[] = [
    'task_reminder', 'assignment_alert', 'calendar_reminder', 'daily_summary', 'test',
  ]
  if (!VALID_TYPES.includes(type)) {
    return jsonResponse({ error: `type must be one of: ${VALID_TYPES.join(', ')}` }, 400)
  }

  // ── Supabase client ───────────────────────────────────────────────────
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // ── Fetch push tokens ─────────────────────────────────────────────────
  const { data: tokens, error: tokensErr } = await supabase
    .from('push_tokens')
    .select('token, platform')
    .eq('user_id', userId)

  if (tokensErr) {
    console.error('push_tokens error:', tokensErr.message)
    return jsonResponse({ error: `DB error: ${tokensErr.message}` }, 500)
  }

  if (!tokens?.length) {
    console.log(`No tokens for user ${userId}`)
    return jsonResponse({ type, sent: 0, skipped: 0, errors: [], durationMs: Date.now() - t0 })
  }

  // ── Build message ─────────────────────────────────────────────────────
  const message = buildMessage(type, payload)
  console.log(`[send-push-notification] type=${type} user=${userId.slice(0, 8)}... title="${message.title}"`)

  // ── APNs credential init (lazy — only if iOS token exists) ────────────
  const apnsKeyId  = Deno.env.get('APNS_KEY_ID')
  const apnsKeyB64 = Deno.env.get('APNS_KEY_B64')
  const apnsTeamId = Deno.env.get('APNS_TEAM_ID')
  const apnsHost   = production ? APNS_PROD : APNS_SANDBOX

  let apnsJwt: string | null = null
  let apnsInitError: string | null = null

  if (tokens.some((t) => t.platform === 'ios')) {
    if (apnsKeyId && apnsKeyB64 && apnsTeamId) {
      try {
        const key = await loadApnsKey(apnsKeyB64)
        apnsJwt   = await makeApnsJwt(apnsTeamId, apnsKeyId, key)
        console.log('[APNs] JWT ready')
      } catch (e) {
        apnsInitError = `APNs key init: ${errMsg(e)}`
        console.error(apnsInitError)
      }
    } else {
      apnsInitError = 'APNs env vars missing (APNS_KEY_B64 / APNS_KEY_ID / APNS_TEAM_ID)'
      console.warn(apnsInitError)
    }
  }

  // ── Deliver to each device ────────────────────────────────────────────
  let sent = 0
  let skipped = 0
  const errors: DeliveryResult['errors'] = []

  for (const { token, platform } of tokens) {
    const shortToken = token.slice(0, 8) + '...'

    if (platform === 'ios') {
      if (!apnsJwt) {
        errors.push({ token: shortToken, platform, error: apnsInitError ?? 'APNs not ready' })
        skipped++
        continue
      }
      const r = await sendToApns(token, message, apnsJwt, apnsHost)
      if (r.ok) {
        sent++
        console.log(`[APNs] ✓ ${shortToken} (HTTP ${r.status})`)
      } else {
        errors.push({ token: shortToken, platform, error: r.error! })
        console.error(`[APNs] ✗ ${shortToken}: ${r.error}`)
      }
    } else if (platform === 'android') {
      const r = sendToFcm(token, message)
      if (r.ok) sent++
      else errors.push({ token: shortToken, platform, error: r.error! })
    } else {
      errors.push({ token: shortToken, platform, error: `Unknown platform: ${platform}` })
      skipped++
    }
  }

  const durationMs = Date.now() - t0
  console.log(`[send-push-notification] sent=${sent} skipped=${skipped} errors=${errors.length} (${durationMs}ms)`)

  return jsonResponse({ type, sent, skipped, errors, durationMs } satisfies DeliveryResult)
})
