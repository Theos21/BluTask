import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useRoutineStore = create((set) => ({
  routineBlocks: [],

  fetchRoutineBlocks: async (userId) => {
    const { data, error } = await supabase
      .from('routine_blocks')
      .select('*')
      .eq('user_id', userId)
      .order('start_time', { ascending: true })
    if (!error) set({ routineBlocks: data || [] })
  },

  addRoutineBlock: async (block) => {
    const { data, error } = await supabase
      .from('routine_blocks')
      .insert([block])
      .select()
      .single()
    if (!error) set((s) => ({ routineBlocks: [...s.routineBlocks, data] }))
    return { data, error }
  },

  updateRoutineBlock: async (id, updates) => {
    const { data, error } = await supabase
      .from('routine_blocks')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (!error)
      set((s) => ({
        routineBlocks: s.routineBlocks.map((b) => (b.id === id ? data : b)),
      }))
    return { data, error }
  },

  deleteRoutineBlock: async (id) => {
    const { error } = await supabase.from('routine_blocks').delete().eq('id', id)
    if (!error)
      set((s) => ({ routineBlocks: s.routineBlocks.filter((b) => b.id !== id) }))
    return { error }
  },
}))
