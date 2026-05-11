import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useSportsStore = create((set) => ({
  sessions:  [],
  drills:    [],
  equipment: [],

  // ── Sessions ────────────────────────────────────────────────
  fetchSessions: async (userId) => {
    const { data } = await supabase
      .from('sports_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
    if (data) set({ sessions: data })
  },

  addSession: async (row) => {
    const { data, error } = await supabase.from('sports_sessions').insert([row]).select().single()
    if (!error) set((s) => ({ sessions: [data, ...s.sessions] }))
    return { data, error }
  },

  updateSession: async (id, updates) => {
    const { data, error } = await supabase
      .from('sports_sessions')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id).select().single()
    if (!error) set((s) => ({ sessions: s.sessions.map((x) => (x.id === id ? data : x)) }))
    return { data, error }
  },

  deleteSession: async (id) => {
    const { error } = await supabase.from('sports_sessions').delete().eq('id', id)
    if (!error) set((s) => ({ sessions: s.sessions.filter((x) => x.id !== id) }))
    return { error }
  },

  // ── Drills ──────────────────────────────────────────────────
  fetchDrills: async (userId) => {
    const { data } = await supabase
      .from('sports_drills')
      .select('*')
      .eq('user_id', userId)
      .order('position', { ascending: true })
    if (data) set({ drills: data })
  },

  addDrill: async (row) => {
    const { data, error } = await supabase.from('sports_drills').insert([row]).select().single()
    if (!error) set((s) => ({ drills: [...s.drills, data] }))
    return { data, error }
  },

  updateDrill: async (id, updates) => {
    const { data, error } = await supabase
      .from('sports_drills').update(updates).eq('id', id).select().single()
    if (!error) set((s) => ({ drills: s.drills.map((x) => (x.id === id ? data : x)) }))
    return { data, error }
  },

  deleteDrill: async (id) => {
    const { error } = await supabase.from('sports_drills').delete().eq('id', id)
    if (!error) set((s) => ({ drills: s.drills.filter((x) => x.id !== id) }))
    return { error }
  },

  // ── Equipment ───────────────────────────────────────────────
  fetchEquipment: async (userId) => {
    const { data } = await supabase
      .from('sports_equipment')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
    if (data) set({ equipment: data })
  },

  addEquipment: async (row) => {
    const { data, error } = await supabase.from('sports_equipment').insert([row]).select().single()
    if (!error) set((s) => ({ equipment: [...s.equipment, data] }))
    return { data, error }
  },

  updateEquipment: async (id, updates) => {
    const { data, error } = await supabase
      .from('sports_equipment').update(updates).eq('id', id).select().single()
    if (!error) set((s) => ({ equipment: s.equipment.map((x) => (x.id === id ? data : x)) }))
    return { data, error }
  },

  deleteEquipment: async (id) => {
    const { error } = await supabase.from('sports_equipment').delete().eq('id', id)
    if (!error) set((s) => ({ equipment: s.equipment.filter((x) => x.id !== id) }))
    return { error }
  },

  toggleEquipment: async (id, checked) => {
    const { data, error } = await supabase
      .from('sports_equipment').update({ checked }).eq('id', id).select().single()
    if (!error) set((s) => ({ equipment: s.equipment.map((x) => (x.id === id ? data : x)) }))
    return { error }
  },
}))
