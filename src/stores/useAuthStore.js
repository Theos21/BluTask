import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useAuthStore = create((set, get) => ({
  user: null,
  session: null,
  profile: null,
  loading: true,

  init: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    set({ session, user: session?.user ?? null, loading: false })
    if (session?.user) get().fetchProfile(session.user.id)

    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, user: session?.user ?? null })
      if (session?.user) get().fetchProfile(session.user.id)
      else set({ profile: null })
    })
  },

  fetchProfile: async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (data) {
      // Auto-skip onboarding for existing users who already have data
      if (!data.onboarding_complete) {
        const { count } = await supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
        if ((count ?? 0) > 0) {
          await supabase.from('profiles').update({ onboarding_complete: true }).eq('id', userId)
          set({ profile: { ...data, onboarding_complete: true } })
          return
        }
      }
      set({ profile: data })
      return
    }

    // No row yet (user signed up before trigger existed) - create one
    if (error?.code === 'PGRST116') {
      const { data: created } = await supabase
        .from('profiles')
        .insert([{ id: userId }])
        .select()
        .single()
      if (created) set({ profile: created })
    }
  },

  patchProfile: (updates) => {
    set((s) => ({ profile: s.profile ? { ...s.profile, ...updates } : null }))
  },

  updateProfile: async (updates) => {
    const { user } = get()
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single()
    if (!error && data) set({ profile: data })
    return { data, error }
  },

  updateEmail: async (email) => {
    const { data, error } = await supabase.auth.updateUser({ email })
    return { data, error }
  },

  updatePassword: async (password) => {
    const { data, error } = await supabase.auth.updateUser({ password })
    return { data, error }
  },

  deleteAccount: async () => {
    const { user } = get()
    const uid = user.id

    // Delete all public data client-side first (RLS allows users to delete their own rows)
    const { data: taskRows } = await supabase.from('tasks').select('id').eq('user_id', uid)
    const taskIds = taskRows?.map((t) => t.id) ?? []
    if (taskIds.length > 0) {
      await supabase.from('checklist_items').delete().in('task_id', taskIds)
    }
    await supabase.from('assignments').delete().eq('user_id', uid)
    await supabase.from('tasks').delete().eq('user_id', uid)
    await supabase.from('classes').delete().eq('user_id', uid)
    await supabase.from('lists').delete().eq('user_id', uid)
    await supabase.from('routine_blocks').delete().eq('user_id', uid)
    await supabase.from('profiles').delete().eq('id', uid)

    // Delete the auth user via RPC - ignore any error (deleting auth.users invalidates
    // the JWT mid-request, so the response always looks like an error even when it worked)
    await supabase.rpc('delete_user').catch(() => {})

    await supabase.auth.signOut()
    set({ user: null, session: null, profile: null })
    return { error: null }
  },

  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    return { data, error }
  },

  signUp: async (email, password, fullName) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })
    return { data, error }
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, session: null, profile: null })
  },
}))
