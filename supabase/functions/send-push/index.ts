import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const BUNDLE_ID = 'com.blutask.app'
const APNS_HOST = 'https://api.sandbox.push.apple.com'

function errMsg(e: unknown): string {
  if (e instanceof Error) return e.message
  return String(e)
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function textToBase64Url(text: string): string {
  return base64UrlEncode(new TextEncoder().encode(text))
}

async function importApnsKey(b64Content: string): Promise<CryptoKey> {
  // b64Content is the raw base64 of the .p8 file (the full file, base64-encoded)
  const pemContent = new TextDecoder().decode(
    Uint8Array.from(atob(b64Content), (c) => c.charCodeAt(0))
  )
  const cleaned = pemContent
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/-----BEGIN EC PRIVATE KEY-----/, '')
    .replace(/-----END EC PRIVATE KEY-----/, '')
    .replace(/\s+/g, '')

  const keyBytes = Uint8Array.from(atob(cleaned), (c) => c.charCodeAt(0))

  return crypto.subtle.importKey(
    'pkcs8',
    keyBytes.buffer,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  )
}

async function generateApnsJwt(teamId: string, keyId: string, privateKey: CryptoKey): Promise<string> {
  const header = textToBase64Url(JSON.stringify({ alg: 'ES256', kid: keyId }))
  const payload = textToBase64Url(JSON.stringify({ iss: teamId, iat: Math.floor(Date.now() / 1000) }))
  const signingInput = `${header}.${payload}`

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: { name: 'SHA-256' } },
    privateKey,
    new TextEncoder().encode(signingInput)
  )

  return `${signingInput}.${base64UrlEncode(new Uint8Array(signature))}`
}

async function sendApns(
  deviceToken: string,
  title: string,
  body: string,
  jwt: string
): Promise<{ ok: boolean; error?: string }> {
  const url = `${APNS_HOST}/3/device/${deviceToken}`
  const apnsPayload = {
    aps: {
      alert: { title, body },
      sound: 'default',
      badge: 1,
    },
  }

  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'apns-topic': BUNDLE_ID,
        'apns-push-type': 'alert',
        authorization: `bearer ${jwt}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(apnsPayload),
    })
  } catch (e) {
    return { ok: false, error: `APNs fetch failed: ${errMsg(e)}` }
  }

  if (res.ok) return { ok: true }

  let detail = ''
  try {
    const json = await res.json()
    detail = json.reason ?? JSON.stringify(json)
  } catch {
    detail = await res.text().catch(() => String(res.status))
  }
  return { ok: false, error: `APNs ${res.status}: ${detail}` }
}

function sendFcm(deviceToken: string, title: string, body: string): { ok: boolean; error?: string } {
  console.log('FCM stub — token:', deviceToken, 'title:', title, 'body:', body)
  return { ok: true }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    const { userId, title, body, data } = await req.json()
    if (!userId || !title || !body) {
      return new Response(JSON.stringify({ error: 'userId, title, and body are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: tokens, error: tokensError } = await supabase
      .from('push_tokens')
      .select('token, platform')
      .eq('user_id', userId)

    if (tokensError) {
      return new Response(JSON.stringify({ error: `DB error: ${tokensError.message}` }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (!tokens || tokens.length === 0) {
      return new Response(JSON.stringify({ sent: 0, errors: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const apnsKeyId = Deno.env.get('APNS_KEY_ID')
    const apnsKeyB64 = Deno.env.get('APNS_KEY_B64')
    const apnsTeamId = Deno.env.get('APNS_TEAM_ID')

    let apnsKey: CryptoKey | null = null
    let apnsJwt: string | null = null
    let apnsInitError: string | null = null

    const hasIos = tokens.some((t) => t.platform === 'ios')
    if (hasIos && apnsKeyId && apnsKeyB64 && apnsTeamId) {
      try {
        apnsKey = await importApnsKey(apnsKeyB64)
        apnsJwt = await generateApnsJwt(apnsTeamId, apnsKeyId, apnsKey)
      } catch (e) {
        apnsInitError = `APNs key init failed: ${errMsg(e)}`
        console.error(apnsInitError)
      }
    }

    let sent = 0
    const errors: string[] = []

    for (const { token, platform } of tokens) {
      if (platform === 'ios') {
        if (!apnsJwt) {
          errors.push(apnsInitError ?? 'APNs not configured')
          continue
        }
        const result = await sendApns(token, title, body, apnsJwt)
        if (result.ok) {
          sent++
        } else {
          errors.push(result.error!)
        }
      } else if (platform === 'android') {
        const result = sendFcm(token, title, body)
        if (result.ok) {
          sent++
        } else {
          errors.push(result.error!)
        }
      } else {
        errors.push(`Unknown platform: ${platform}`)
      }
    }

    return new Response(JSON.stringify({ sent, errors }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('send-push error:', errMsg(e))
    return new Response(JSON.stringify({ error: errMsg(e) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
