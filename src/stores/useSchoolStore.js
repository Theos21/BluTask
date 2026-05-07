import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useSchoolStore = create((set, get) => ({
  classes: [],
  assignments: [],
  loading: false,
  error: null,

  fetchClasses: async (userId) => {
    const { data, error } = await supabase
      .from('classes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
    if (!error) set({ classes: data || [] })
  },

  fetchAssignments: async (userId) => {
    const { data, error } = await supabase
      .from('assignments')
      .select('*')
      .eq('user_id', userId)
      .order('due_date', { ascending: true })
    if (!error) set({ assignments: data || [] })
  },

  addClass: async (classData) => {
    const { data, error } = await supabase
      .from('classes')
      .insert([classData])
      .select()
      .single()
    if (!error) set((s) => ({ classes: [...s.classes, data] }))
    return { data, error }
  },

  updateClass: async (id, updates) => {
    const { data, error } = await supabase
      .from('classes')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (!error)
      set((s) => ({ classes: s.classes.map((c) => (c.id === id ? data : c)) }))
    return { data, error }
  },

  deleteClass: async (id) => {
    const { error } = await supabase.from('classes').delete().eq('id', id)
    if (!error)
      set((s) => ({
        classes: s.classes.filter((c) => c.id !== id),
        assignments: s.assignments.filter((a) => a.class_id !== id),
      }))
    return { error }
  },

  addAssignment: async (assignmentData) => {
    const { data, error } = await supabase
      .from('assignments')
      .insert([assignmentData])
      .select()
      .single()
    if (!error) set((s) => ({ assignments: [...s.assignments, data] }))
    return { data, error }
  },

  updateAssignment: async (id, updates) => {
    const { data, error } = await supabase
      .from('assignments')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (!error)
      set((s) => ({
        assignments: s.assignments.map((a) => (a.id === id ? data : a)),
      }))
    return { data, error }
  },

  deleteAssignment: async (id) => {
    const { error } = await supabase.from('assignments').delete().eq('id', id)
    if (!error)
      set((s) => ({ assignments: s.assignments.filter((a) => a.id !== id) }))
    return { error }
  },

  // DB call only - does NOT touch local state. Caller decides when to commit to store.
  completeAssignmentInDB: async (id) => {
    console.log('[completeAssignment] firing DB update for id:', id)
    const updates = {
      completed: true,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    const { data, error } = await supabase
      .from('assignments')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    console.log('[completeAssignment] DB result - error:', error, 'data:', data)
    return { data, error }
  },

  // Store update only - call after animation + DB both confirm success.
  markAssignmentCompleted: (id, data) => {
    set((s) => ({
      assignments: s.assignments.map((a) => (a.id === id ? { ...a, ...data } : a)),
    }))
  },

  uncompleteAssignment: async (id) => {
    const updates = {
      completed: false,
      completed_at: null,
      updated_at: new Date().toISOString(),
    }
    const { data, error } = await supabase
      .from('assignments')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (!error)
      set((s) => ({ assignments: s.assignments.map((a) => (a.id === id ? data : a)) }))
    return { data, error }
  },
}))
