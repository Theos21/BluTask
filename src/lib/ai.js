import { supabase } from './supabase'

export async function callAI(action, payload = {}) {
  const { data, error } = await supabase.functions.invoke('ai', {
    body: { action, payload },
  })
  if (error) throw new Error(error.message || 'AI request failed')
  if (data?.error) throw new Error(data.error)
  return data
}
