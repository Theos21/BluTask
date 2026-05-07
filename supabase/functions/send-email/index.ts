import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-signature',
}

function errMsg(e: unknown): string {
  if (e instanceof Error) return e.message
  return String(e)
}

async function verifySignature(secret: string, body: string, sigHeader: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    )
    const hex = sigHeader.startsWith('sha256=') ? sigHeader.slice(7) : sigHeader
    const pairs = hex.match(/.{1,2}/g)
    if (!pairs) return false
    const sigBytes = new Uint8Array(pairs.map(b => parseInt(b, 16)))
    return await crypto.subtle.verify('HMAC', key, sigBytes, encoder.encode(body))
  } catch (e) {
    console.error('verifySignature error:', errMsg(e))
    return false
  }
}

serve(async (req) => {
  console.log('Function invoked, method:', req.method)

  // OPTIONS must return before any await to avoid body-stream issues
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Read body once, in its own try/catch
  let rawBody = ''
  try {
    rawBody = await req.text()
  } catch (e) {
    console.error('Failed to read body:', errMsg(e))
    return new Response(JSON.stringify({ error: 'Failed to read body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  console.log('Raw body:', rawBody)

  try {
    const payload = JSON.parse(rawBody)
    console.log('Parsed payload keys:', Object.keys(payload))

    const apiKey = Deno.env.get('RESEND_API_KEY')
    if (!apiKey) throw new Error('RESEND_API_KEY not set')

    // Signature verification — log and continue on failure during testing
    try {
      const hookSecret = Deno.env.get('SEND_EMAIL_HOOK_SECRET')
      const sigHeader = req.headers.get('x-supabase-signature')
      if (hookSecret && sigHeader) {
        const valid = await verifySignature(hookSecret, rawBody, sigHeader)
        console.log('Signature valid:', valid)
        if (!valid) {
          return new Response(JSON.stringify({ error: 'Invalid signature' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
      } else {
        console.log('Skipping signature check — hookSecret:', !!hookSecret, 'sigHeader:', !!sigHeader)
      }
    } catch (e) {
      console.error('Signature check threw, continuing anyway:', errMsg(e))
    }

    const user = payload.user
    const email_data = payload.email_data

    console.log('user.email:', user?.email)
    console.log('email_action_type:', email_data?.email_action_type)
    console.log('confirmation_url:', email_data?.confirmation_url)

    if (!user?.email) {
      return new Response(JSON.stringify({ error: 'No user email in payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const actionType: string = email_data?.email_action_type ?? ''
    const confirmationUrl: string = email_data?.confirmation_url ?? ''
    const firstName: string = user?.user_metadata?.full_name?.split(' ')[0] ?? 'there'

    const isConfirmation = actionType === 'signup'
    const isReset = actionType === 'recovery'
    const isEmailChange = actionType === 'email_change'

    if (!isConfirmation && !isReset && !isEmailChange) {
      console.log('Unhandled action type:', actionType)
      return new Response(JSON.stringify({ message: 'Email type not handled', type: actionType }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let subject = ''
    let html = ''

    if (isConfirmation) {
      subject = 'Confirm your BluTask account'
      html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background-color:#0d1117;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0d1117;padding:40px 20px;"><tr><td align="center"><table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#161b22;border-radius:12px;padding:40px;border:1px solid #21262d;"><tr><td align="center" style="padding-bottom:32px;"><span style="font-size:28px;font-weight:600;color:#ffffff;letter-spacing:-0.5px;"><span style="color:#3b82f6;">Blu</span>Task</span></td></tr><tr><td style="padding-bottom:12px;"><p style="margin:0;font-size:22px;font-weight:500;color:#ffffff;">Confirm your email</p></td></tr><tr><td style="padding-bottom:32px;"><p style="margin:0;font-size:15px;color:#8b949e;line-height:1.6;">Hey ${firstName}, click the button below to confirm your BluTask account. This link expires in 24 hours.</p></td></tr><tr><td align="center" style="padding-bottom:32px;"><a href="${confirmationUrl}" style="display:inline-block;background-color:#3b82f6;color:#ffffff;text-decoration:none;font-size:15px;font-weight:500;padding:14px 32px;border-radius:8px;">Confirm your account</a></td></tr><tr><td style="border-top:1px solid #21262d;padding-top:24px;"><p style="margin:0;font-size:13px;color:#6e7681;">You received this because you signed up for BluTask. If this was not you, ignore this email.</p></td></tr></table></td></tr></table></body></html>`
    } else if (isReset) {
      subject = 'Reset your BluTask password'
      html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background-color:#0d1117;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0d1117;padding:40px 20px;"><tr><td align="center"><table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#161b22;border-radius:12px;padding:40px;border:1px solid #21262d;"><tr><td align="center" style="padding-bottom:32px;"><span style="font-size:28px;font-weight:600;color:#ffffff;letter-spacing:-0.5px;"><span style="color:#3b82f6;">Blu</span>Task</span></td></tr><tr><td style="padding-bottom:12px;"><p style="margin:0;font-size:22px;font-weight:500;color:#ffffff;">Reset your password</p></td></tr><tr><td style="padding-bottom:32px;"><p style="margin:0;font-size:15px;color:#8b949e;line-height:1.6;">Hey ${firstName}, click the button below to reset your BluTask password. This link expires in 24 hours.</p></td></tr><tr><td align="center" style="padding-bottom:32px;"><a href="${confirmationUrl}" style="display:inline-block;background-color:#3b82f6;color:#ffffff;text-decoration:none;font-size:15px;font-weight:500;padding:14px 32px;border-radius:8px;">Reset my password</a></td></tr><tr><td style="border-top:1px solid #21262d;padding-top:24px;"><p style="margin:0;font-size:13px;color:#6e7681;">You received this because a password reset was requested for your BluTask account. If this was not you, ignore this email.</p></td></tr></table></td></tr></table></body></html>`
    } else {
      subject = 'Confirm your new BluTask email'
      html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background-color:#0d1117;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0d1117;padding:40px 20px;"><tr><td align="center"><table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#161b22;border-radius:12px;padding:40px;border:1px solid #21262d;"><tr><td align="center" style="padding-bottom:32px;"><span style="font-size:28px;font-weight:600;color:#ffffff;letter-spacing:-0.5px;"><span style="color:#3b82f6;">Blu</span>Task</span></td></tr><tr><td style="padding-bottom:12px;"><p style="margin:0;font-size:22px;font-weight:500;color:#ffffff;">Confirm your new email</p></td></tr><tr><td style="padding-bottom:32px;"><p style="margin:0;font-size:15px;color:#8b949e;line-height:1.6;">Hey ${firstName}, click below to confirm your new email address for BluTask.</p></td></tr><tr><td align="center" style="padding-bottom:32px;"><a href="${confirmationUrl}" style="display:inline-block;background-color:#3b82f6;color:#ffffff;text-decoration:none;font-size:15px;font-weight:500;padding:14px 32px;border-radius:8px;">Confirm new email</a></td></tr><tr><td style="border-top:1px solid #21262d;padding-top:24px;"><p style="margin:0;font-size:13px;color:#6e7681;">If you did not request an email change, ignore this email — your account is safe.</p></td></tr></table></td></tr></table></body></html>`
    }

    // Resend call with 8-second timeout
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 8000)

    let resendRes: Response
    try {
      resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'BluTask <noreply@blutask.app>',
          to: user.email,
          subject,
          html,
        }),
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timer)
    }

    const resendData = await resendRes.json()
    console.log('Resend status:', resendRes.status)
    console.log('Resend response:', JSON.stringify(resendData))

    if (!resendRes.ok) {
      throw new Error(`Resend error ${resendRes.status}: ${JSON.stringify(resendData)}`)
    }

    return new Response(JSON.stringify({ success: true, id: resendData.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    const message = errMsg(e)
    console.error('send-email fatal error:', message)
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
