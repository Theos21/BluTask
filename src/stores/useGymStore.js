import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useGymStore = create((set) => ({
  workouts:         [],
  workoutExercises: {}, // keyed by workout_id
  logs:             [],
  logSets:          {}, // keyed by log_id
  customExercises:  [],

  // ── Workouts (templates) ─────────────────────────────────────
  fetchWorkouts: async (userId) => {
    const { data } = await supabase
      .from('gym_workouts')
      .select('*')
      .eq('user_id', userId)
      .order('position', { ascending: true })
    if (data) set({ workouts: data })
  },

  addWorkout: async (row) => {
    const { data, error } = await supabase.from('gym_workouts').insert([row]).select().single()
    if (!error) set((s) => ({ workouts: [...s.workouts, data] }))
    return { data, error }
  },

  updateWorkout: async (id, updates) => {
    const { data, error } = await supabase
      .from('gym_workouts').update(updates).eq('id', id).select().single()
    if (!error) set((s) => ({ workouts: s.workouts.map((w) => (w.id === id ? data : w)) }))
    return { data, error }
  },

  deleteWorkout: async (id) => {
    const { error } = await supabase.from('gym_workouts').delete().eq('id', id)
    if (!error) set((s) => ({
      workouts: s.workouts.filter((w) => w.id !== id),
      workoutExercises: Object.fromEntries(
        Object.entries(s.workoutExercises).filter(([k]) => k !== id)
      ),
    }))
    return { error }
  },

  // ── Workout exercises ────────────────────────────────────────
  fetchWorkoutExercises: async (workoutId) => {
    const { data } = await supabase
      .from('gym_workout_exercises')
      .select('*')
      .eq('workout_id', workoutId)
      .order('position', { ascending: true })
    if (data) set((s) => ({ workoutExercises: { ...s.workoutExercises, [workoutId]: data } }))
    return data ?? []
  },

  addWorkoutExercise: async (row) => {
    const { data, error } = await supabase.from('gym_workout_exercises').insert([row]).select().single()
    if (!error) set((s) => ({
      workoutExercises: {
        ...s.workoutExercises,
        [row.workout_id]: [...(s.workoutExercises[row.workout_id] ?? []), data],
      },
    }))
    return { data, error }
  },

  updateWorkoutExercise: async (id, workoutId, updates) => {
    const { data, error } = await supabase
      .from('gym_workout_exercises').update(updates).eq('id', id).select().single()
    if (!error) set((s) => ({
      workoutExercises: {
        ...s.workoutExercises,
        [workoutId]: (s.workoutExercises[workoutId] ?? []).map((e) => (e.id === id ? data : e)),
      },
    }))
    return { data, error }
  },

  deleteWorkoutExercise: async (id, workoutId) => {
    const { error } = await supabase.from('gym_workout_exercises').delete().eq('id', id)
    if (!error) set((s) => ({
      workoutExercises: {
        ...s.workoutExercises,
        [workoutId]: (s.workoutExercises[workoutId] ?? []).filter((e) => e.id !== id),
      },
    }))
    return { error }
  },

  // ── Logs ─────────────────────────────────────────────────────
  fetchLogs: async (userId) => {
    const { data } = await supabase
      .from('gym_logs')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(30)
    if (data) set({ logs: data })
  },

  addLog: async (row) => {
    const { data, error } = await supabase.from('gym_logs').insert([row]).select().single()
    if (!error) set((s) => ({ logs: [data, ...s.logs] }))
    return { data, error }
  },

  updateLog: async (id, updates) => {
    const { data, error } = await supabase
      .from('gym_logs').update(updates).eq('id', id).select().single()
    if (!error) set((s) => ({ logs: s.logs.map((l) => (l.id === id ? data : l)) }))
    return { data, error }
  },

  deleteLog: async (id) => {
    const { error } = await supabase.from('gym_logs').delete().eq('id', id)
    if (!error) set((s) => ({
      logs: s.logs.filter((l) => l.id !== id),
      logSets: Object.fromEntries(Object.entries(s.logSets).filter(([k]) => k !== id)),
    }))
    return { error }
  },

  // ── Log sets ─────────────────────────────────────────────────
  fetchLogSets: async (logId) => {
    const { data } = await supabase
      .from('gym_log_sets')
      .select('*')
      .eq('log_id', logId)
      .order('created_at', { ascending: true })
    if (data) set((s) => ({ logSets: { ...s.logSets, [logId]: data } }))
    return data ?? []
  },

  addLogSet: async (row) => {
    const { data, error } = await supabase.from('gym_log_sets').insert([row]).select().single()
    if (!error) set((s) => ({
      logSets: {
        ...s.logSets,
        [row.log_id]: [...(s.logSets[row.log_id] ?? []), data],
      },
    }))
    return { data, error }
  },

  updateLogSet: async (id, logId, updates) => {
    const { data, error } = await supabase
      .from('gym_log_sets').update(updates).eq('id', id).select().single()
    if (!error) set((s) => ({
      logSets: {
        ...s.logSets,
        [logId]: (s.logSets[logId] ?? []).map((s) => (s.id === id ? data : s)),
      },
    }))
    return { data, error }
  },

  deleteLogSet: async (id, logId) => {
    const { error } = await supabase.from('gym_log_sets').delete().eq('id', id)
    if (!error) set((s) => ({
      logSets: {
        ...s.logSets,
        [logId]: (s.logSets[logId] ?? []).filter((x) => x.id !== id),
      },
    }))
    return { error }
  },

  // ── Custom exercises ─────────────────────────────────────────
  fetchCustomExercises: async (userId) => {
    const { data } = await supabase
      .from('gym_exercises')
      .select('*')
      .eq('user_id', userId)
      .order('name', { ascending: true })
    if (data) set({ customExercises: data })
  },

  addCustomExercise: async (row) => {
    const { data, error } = await supabase.from('gym_exercises').insert([row]).select().single()
    if (!error) set((s) => ({ customExercises: [...s.customExercises, data] }))
    return { data, error }
  },

  deleteCustomExercise: async (id) => {
    const { error } = await supabase.from('gym_exercises').delete().eq('id', id)
    if (!error) set((s) => ({ customExercises: s.customExercises.filter((e) => e.id !== id) }))
    return { error }
  },
}))
