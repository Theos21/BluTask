const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const url = new URL(req.url)
    const token = url.searchParams.get('token')?.trim()
    if (!token) return json({ error: 'Missing token' }, 400)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const headers = {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    }

    // Lookup profile by share_token using service role key (bypasses RLS)
    const profileRes = await fetch(
      `${supabaseUrl}/rest/v1/profiles?share_token=eq.${encodeURIComponent(token)}&select=id,full_name,display_name&limit=1`,
      { headers },
    )
    const profiles = await profileRes.json()
    if (!Array.isArray(profiles) || profiles.length === 0) {
      return json({ error: 'Not found' }, 404)
    }
    const profile = profiles[0]

    // Fetch shows for this user
    const showsRes = await fetch(
      `${supabaseUrl}/rest/v1/shows?user_id=eq.${profile.id}&order=updated_at.desc`,
      { headers },
    )
    const shows = await showsRes.json()

    return json({
      ownerName: profile.display_name || profile.full_name?.split(' ')[0] || 'Someone',
      shows: Array.isArray(shows) ? shows : [],
    })
  } catch (err) {
    console.error('[shared-watchlist] Error:', err)
    return json({ error: 'Internal error' }, 500)
  }
})
