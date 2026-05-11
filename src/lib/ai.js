import { supabase } from './supabase'

export async function callAI(action, payload = {}) {
  const { data, error } = await supabase.functions.invoke('ai', {
    body: { action, payload },
  })
  if (error) {
    // FunctionsFetchError → network failure (function unreachable)
    // FunctionsHttpError → function returned non-2xx
    const isNetworkError = error.name === 'FunctionsFetchError' || error.message?.toLowerCase().includes('fetch')
    throw new Error(
      isNetworkError
        ? 'Could not reach the AI service. Check your connection and try again.'
        : (error.message || 'AI request failed')
    )
  }
  if (data?.error) throw new Error(data.error)
  return data
}
