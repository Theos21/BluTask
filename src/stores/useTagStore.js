import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useTagStore = create((set) => ({
  tags: [],
  taskTags: {}, // { [taskId]: tagId[] }

  fetchTags: async (userId) => {
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .eq('user_id', userId)
      .order('name', { ascending: true })
    if (!error) set({ tags: data || [] })
  },

  fetchTaskTags: async (userId) => {
    const { data, error } = await supabase
      .from('task_tags')
      .select('task_id, tag_id')
      .eq('user_id', userId)
    if (!error) {
      const map = {}
      for (const row of data || []) {
        if (!map[row.task_id]) map[row.task_id] = []
        map[row.task_id].push(row.tag_id)
      }
      set({ taskTags: map })
    }
  },

  addTag: async (tagData) => {
    const { data, error } = await supabase
      .from('tags')
      .insert([tagData])
      .select()
      .single()
    if (!error)
      set((s) => ({
        tags: [...s.tags, data].sort((a, b) => a.name.localeCompare(b.name)),
      }))
    return { data, error }
  },

  updateTag: async (id, updates) => {
    const { data, error } = await supabase
      .from('tags')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (!error)
      set((s) => ({ tags: s.tags.map((t) => (t.id === id ? data : t)) }))
    return { data, error }
  },

  deleteTag: async (id) => {
    const { error } = await supabase.from('tags').delete().eq('id', id)
    if (!error) {
      set((s) => {
        const taskTags = {}
        for (const [taskId, tagIds] of Object.entries(s.taskTags)) {
          const filtered = tagIds.filter((tid) => tid !== id)
          if (filtered.length > 0) taskTags[taskId] = filtered
        }
        return { tags: s.tags.filter((t) => t.id !== id), taskTags }
      })
    }
    return { error }
  },

  addTagToTask: async (taskId, tagId, userId) => {
    const { error } = await supabase
      .from('task_tags')
      .insert([{ task_id: taskId, tag_id: tagId, user_id: userId }])
    if (!error) {
      set((s) => ({
        taskTags: {
          ...s.taskTags,
          [taskId]: [...new Set([...(s.taskTags[taskId] || []), tagId])],
        },
      }))
    }
    return { error }
  },

  removeTagFromTask: async (taskId, tagId) => {
    const { error } = await supabase
      .from('task_tags')
      .delete()
      .eq('task_id', taskId)
      .eq('tag_id', tagId)
    if (!error) {
      set((s) => ({
        taskTags: {
          ...s.taskTags,
          [taskId]: (s.taskTags[taskId] || []).filter((tid) => tid !== tagId),
        },
      }))
    }
    return { error }
  },
}))
