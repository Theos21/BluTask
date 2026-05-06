import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useTaskStore = create((set) => ({
  lists: [],
  tasks: [],
  checklistItems: {},

  fetchLists: async (userId) => {
    const { data, error } = await supabase
      .from('lists')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
    if (!error) set({ lists: data || [] })
  },

  fetchTasks: async (userId) => {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (!error) set({ tasks: data || [] })
  },

  fetchChecklistItems: async (taskId) => {
    const { data, error } = await supabase
      .from('checklist_items')
      .select('*')
      .eq('task_id', taskId)
      .order('position', { ascending: true })
    if (!error)
      set((s) => ({ checklistItems: { ...s.checklistItems, [taskId]: data || [] } }))
  },

  addList: async (listData) => {
    const { data, error } = await supabase
      .from('lists')
      .insert([listData])
      .select()
      .single()
    if (!error) set((s) => ({ lists: [...s.lists, data] }))
    return { data, error }
  },

  updateList: async (id, updates) => {
    const { data, error } = await supabase
      .from('lists')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (!error)
      set((s) => ({ lists: s.lists.map((l) => (l.id === id ? data : l)) }))
    return { data, error }
  },

  deleteList: async (id) => {
    const { error } = await supabase.from('lists').delete().eq('id', id)
    if (!error)
      set((s) => ({
        lists: s.lists.filter((l) => l.id !== id),
        tasks: s.tasks.filter((t) => t.list_id !== id),
      }))
    return { error }
  },

  addTask: async (taskData) => {
    const { data, error } = await supabase
      .from('tasks')
      .insert([taskData])
      .select()
      .single()
    if (!error) set((s) => ({ tasks: [data, ...s.tasks] }))
    return { data, error }
  },

  updateTask: async (id, updates) => {
    const { data, error } = await supabase
      .from('tasks')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (!error)
      set((s) => ({
        tasks: s.tasks.map((t) => (t.id === id ? data : t)),
      }))
    return { data, error }
  },

  toggleTask: async (id, completed) => {
    const updates = {
      completed,
      completed_at: completed ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    }
    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (!error)
      set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? data : t)) }))
    return { data, error }
  },

  deleteTask: async (id) => {
    const { error } = await supabase.from('tasks').delete().eq('id', id)
    if (!error)
      set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }))
    return { error }
  },

  addChecklistItem: async (item) => {
    const { data, error } = await supabase
      .from('checklist_items')
      .insert([item])
      .select()
      .single()
    if (!error)
      set((s) => ({
        checklistItems: {
          ...s.checklistItems,
          [item.task_id]: [...(s.checklistItems[item.task_id] || []), data],
        },
      }))
    return { data, error }
  },

  toggleChecklistItem: async (taskId, itemId, completed) => {
    const { data, error } = await supabase
      .from('checklist_items')
      .update({ completed })
      .eq('id', itemId)
      .select()
      .single()
    if (!error)
      set((s) => ({
        checklistItems: {
          ...s.checklistItems,
          [taskId]: (s.checklistItems[taskId] || []).map((i) =>
            i.id === itemId ? data : i
          ),
        },
      }))
    return { data, error }
  },

  deleteChecklistItem: async (taskId, itemId) => {
    const { error } = await supabase
      .from('checklist_items')
      .delete()
      .eq('id', itemId)
    if (!error)
      set((s) => ({
        checklistItems: {
          ...s.checklistItems,
          [taskId]: (s.checklistItems[taskId] || []).filter((i) => i.id !== itemId),
        },
      }))
    return { error }
  },
}))
