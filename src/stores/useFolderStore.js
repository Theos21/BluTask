import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useFolderStore = create((set) => ({
  folders: [],

  fetchFolders: async (userId) => {
    const { data, error } = await supabase
      .from('folders')
      .select('*')
      .eq('user_id', userId)
      .order('position', { ascending: true })
    if (!error) set({ folders: data || [] })
  },

  addFolder: async (folderData) => {
    const { data, error } = await supabase
      .from('folders')
      .insert([folderData])
      .select()
      .single()
    if (!error) set((s) => ({ folders: [...s.folders, data] }))
    return { data, error }
  },

  updateFolder: async (id, updates) => {
    const { data, error } = await supabase
      .from('folders')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (!error)
      set((s) => ({ folders: s.folders.map((f) => (f.id === id ? data : f)) }))
    return { data, error }
  },

  deleteFolder: async (id) => {
    const { error } = await supabase.from('folders').delete().eq('id', id)
    if (!error) set((s) => ({ folders: s.folders.filter((f) => f.id !== id) }))
    return { error }
  },
}))
