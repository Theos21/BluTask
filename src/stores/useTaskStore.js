import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import {
  scheduleTaskReminders,
  cancelTaskReminders,
} from '../services/localNotifications'

export const useTaskStore = create((set) => ({
  lists: [],
  tasks: [],
  headers: [],
  checklistItems: {},

  fetchLists: async (userId) => {
    const { data, error } = await supabase
      .from('lists')
      .select('*')
      .eq('user_id', userId)
      .order('position', { ascending: true })
    if (!error) set({ lists: data || [] })
  },

  fetchTasks: async (userId) => {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .order('position', { ascending: true })
      .order('created_at', { ascending: false })
    if (!error) set({ tasks: data || [] })
  },

  fetchHeaders: async (userId) => {
    const { data, error } = await supabase
      .from('headers')
      .select('*')
      .eq('user_id', userId)
      .order('position', { ascending: true })
    if (!error) set({ headers: data || [] })
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
        headers: s.headers.filter((h) => h.list_id !== id),
      }))
    return { error }
  },

  addHeader: async (headerData) => {
    const { data, error } = await supabase
      .from('headers')
      .insert([headerData])
      .select()
      .single()
    if (!error) set((s) => ({ headers: [...s.headers, data] }))
    return { data, error }
  },

  updateHeader: async (id, updates) => {
    const { data, error } = await supabase
      .from('headers')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (!error)
      set((s) => ({ headers: s.headers.map((h) => (h.id === id ? data : h)) }))
    return { data, error }
  },

  deleteHeader: async (id) => {
    const { error } = await supabase.from('headers').delete().eq('id', id)
    if (!error)
      set((s) => ({
        headers: s.headers.filter((h) => h.id !== id),
        tasks: s.tasks.map((t) => (t.header_id === id ? { ...t, header_id: null } : t)),
      }))
    return { error }
  },

  addTask: async (taskData) => {
    const { data, error } = await supabase
      .from('tasks')
      .insert([taskData])
      .select()
      .single()
    if (!error) {
      set((s) => ({ tasks: [data, ...s.tasks] }))
      if (data.due_date || data.reminders?.length > 0) scheduleTaskReminders(data).catch(() => {})
    }
    return { data, error }
  },

  updateTask: async (id, updates) => {
    const { data, error } = await supabase
      .from('tasks')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (!error) {
      set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? data : t)) }))
      if ('due_date' in updates || 'reminders' in updates) {
        cancelTaskReminders(id).catch(() => {})
        if (!data.completed && (data.due_date || data.reminders?.length > 0)) {
          scheduleTaskReminders(data).catch(() => {})
        }
      }
    }
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
    if (!error) {
      set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? data : t)) }))
      if (completed) cancelTaskReminders(id).catch(() => {})
      else if (data.due_date) scheduleTaskReminders(data).catch(() => {})
    }
    return { data, error }
  },

  deleteTask: async (id) => {
    const { error } = await supabase.from('tasks').delete().eq('id', id)
    if (!error) {
      set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }))
      cancelTaskReminders(id).catch(() => {})
    }
    return { error }
  },

  deleteCompletedTasks: async (userId) => {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('user_id', userId)
      .eq('completed', true)
    if (!error) set((s) => ({ tasks: s.tasks.filter((t) => !t.completed) }))
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
