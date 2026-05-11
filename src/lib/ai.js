import { supabase } from './supabase'

export async function callAI(action, payload = {}) {
  const { data, error } = await supabase.functions.invoke('ai', {
    body: { action, payload },
  })
  if (error) {
    // FunctionsFetchError → network failure (function unreachable)
    const isNetworkError = error.name === 'FunctionsFetchError' || error.message?.toLowerCase().includes('fetch')
    if (isNetworkError) {
      throw new Error('Could not reach the AI service. Check your connection and try again.')
    }
    // FunctionsHttpError → function returned non-2xx; read the actual body for the real message
    let detail = error.message
    try {
      const body = await error.context?.json?.()
      if (body?.error) detail = typeof body.error === 'string' ? body.error : JSON.stringify(body.error)
      else if (body?.message) detail = body.message
    } catch { /* response already consumed or not JSON */ }
    throw new Error(detail || 'AI request failed')
  }
  if (data?.error) throw new Error(typeof data.error === 'string' ? data.error : JSON.stringify(data.error))
  return data
}
