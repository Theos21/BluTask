import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useWatchStore = create((set) => ({
  shows: [],

  fetchShows: async (userId) => {
    const { data, error } = await supabase
      .from('shows')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
    if (!error) set({ shows: data || [] })
  },

  addShow: async (showData) => {
    const { data, error } = await supabase
      .from('shows')
      .insert([showData])
      .select()
      .single()
    if (!error) set((s) => ({ shows: [data, ...s.shows] }))
    return { data, error }
  },

  updateShow: async (id, updates) => {
    const { data, error } = await supabase
      .from('shows')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (!error)
      set((s) => ({ shows: s.shows.map((sh) => (sh.id === id ? data : sh)) }))
    return { data, error }
  },

  deleteShow: async (id) => {
    const { error } = await supabase.from('shows').delete().eq('id', id)
    if (!error) set((s) => ({ shows: s.shows.filter((sh) => sh.id !== id) }))
    return { error }
  },
}))
