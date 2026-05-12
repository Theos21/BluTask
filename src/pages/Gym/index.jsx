import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { format, parseISO } from 'date-fns'
import {
  Dumbbell, Plus, X, Trash2, Edit2, Check, ChevronDown,
  ChevronUp, Flame, Star, Search, RotateCcw, CheckCircle,
  Clock, BarChart2, Award,
} from 'lucide-react'
import { useGymStore } from '../../stores/useGymStore'
import { useAuthStore } from '../../stores/useAuthStore'
import { DEFAULT_EXERCISES, MUSCLE_GROUPS, SPLIT_TYPES } from '../../lib/exercises'
import { showToast } from '../../lib/toast'
import ConfirmDeleteModal from '../../components/ui/ConfirmDeleteModal'

// ─── Exercise picker sheet ────────────────────────────────────────────────────
function ExercisePicker({ onSelect, onClose, customExercises }) {
  const [search, setSearch] = useState('')
  const [mg, setMg] = useState('All')
  const all = [...DEFAULT_EXERCISES, ...customExercises.map((e) => ({ ...e, custom: true }))]
  const groups = ['All', ...MUSCLE_GROUPS]
  const filtered = all.filter((e) =>
    (mg === 'All' || e.muscle_group === mg) &&
    (!search || e.name.toLowerCase().includes(search.toLowerCase()))
  )

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-end" style={{ zIndex: 600 }} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full bg-white dark:bg-gray-900 rounded-t-2xl shadow-2xl flex flex-col max-h-[75vh]" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="flex items-center justify-between px-4 pt-4 pb-2 flex-shrink-0">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>Pick exercise</h3>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400"><X size={16} /></button>
        </div>
        <div className="px-4 pb-2 flex-shrink-0">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'var(--bg-3)' }}>
            <Search size={13} style={{ color: 'var(--fg-3)' }} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search exercises…"
              className="flex-1 bg-transparent text-sm outline-none" style={{ color: 'var(--fg)' }} autoFocus />
          </div>
        </div>
        <div className="px-4 pb-2 flex gap-1.5 overflow-x-auto scrollbar-none flex-shrink-0">
          {groups.map((g) => (
            <button key={g} onClick={() => setMg(g)}
              className="flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-medium transition-colors"
              style={mg === g
                ? { background: 'oklch(0.72 0.14 30 / 0.2)', color: 'oklch(0.72 0.14 30)' }
                : { background: 'var(--bg-3)', color: 'var(--fg-3)' }
              }
            >{g}</button>
          ))}
        </div>
        <div className="overflow-y-auto flex-1 px-4 pb-4">
          {filtered.map((e, i) => (
            <button key={e.name + i} onClick={() => { onSelect(e); onClose() }}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg mb-1 text-left transition-colors"
              style={{ background: 'var(--bg-3)' }}
            >
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>{e.name}</p>
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--fg-3)' }}>{e.muscle_group}</p>
              </div>
              {e.custom && <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-4)', color: 'var(--fg-3)' }}>Custom</span>}
            </button>
          ))}
          {filtered.length === 0 && <p className="text-center text-sm py-8" style={{ color: 'var(--fg-3)' }}>No exercises found.</p>}
        </div>
      </div>
    </div>,
    document.body
  )
}

// ─── Workout Builder Modal ────────────────────────────────────────────────────
function WorkoutModal({ workout, onClose, userId }) {
  const { addWorkout, updateWorkout, fetchWorkoutExercises, addWorkoutExercise, updateWorkoutExercise, deleteWorkoutExercise, workoutExercises, workouts, customExercises } = useGymStore()
  const [name, setName] = useState(workout?.name ?? '')
  const [splitType, setSplitType] = useState(workout?.split_type ?? 'custom')
  const [exercises, setExercises] = useState([])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [workoutId, setWorkoutId] = useState(workout?.id ?? null)

  useEffect(() => {
    if (workout?.id) {
      fetchWorkoutExercises(workout.id).then((exs) => setExercises(exs))
    }
  }, [workout?.id])

  async function ensureWorkout() {
    if (workoutId) return workoutId
    const row = { user_id: userId, name: name.trim() || 'My Workout', split_type: splitType, position: workouts.length }
    const { data, error } = await addWorkout(row)
    if (error || !data) throw new Error('Failed to create workout')
    setWorkoutId(data.id)
    return data.id
  }

  async function handleAddExercise(ex) {
    const wid = await ensureWorkout().catch(() => null)
    if (!wid) return
    const row = { workout_id: wid, exercise_name: ex.name, sets: 3, reps_target: '8-12', position: exercises.length }
    const { data, error } = await addWorkoutExercise(row)
    if (!error && data) setExercises((prev) => [...prev, data])
  }

  async function handleUpdateExercise(id, field, value) {
    setExercises((prev) => prev.map((e) => (e.id === id ? { ...e, [field]: value } : e)))
  }

  async function handleSaveExercise(ex) {
    if (!ex.id) return
    await updateWorkoutExercise(ex.id, workoutId, { sets: ex.sets, reps_target: ex.reps_target, weight_target: ex.weight_target })
  }

  async function handleDeleteExercise(id) {
    await deleteWorkoutExercise(id, workoutId)
    setExercises((prev) => prev.filter((e) => e.id !== id))
  }

  async function save() {
    if (!name.trim()) return
    setSaving(true)
    try {
      const wid = await ensureWorkout()
      if (workout?.id) {
        await updateWorkout(workout.id, { name: name.trim(), split_type: splitType })
      }
      for (const ex of exercises) await handleSaveExercise(ex)
      showToast({ message: workout ? 'Workout updated' : 'Workout created', variant: 'success' })
      onClose()
    } catch {
      showToast({ message: 'Save failed', variant: 'error' })
    }
    setSaving(false)
  }

  const splitInfo = SPLIT_TYPES.find((s) => s.value === splitType)

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center" style={{ zIndex: 500 }} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full sm:max-w-lg bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90vh]" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
          <h3 className="text-base font-semibold" style={{ color: 'var(--fg)' }}>{workout ? 'Edit Workout' : 'New Workout'}</h3>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400"><X size={16} /></button>
        </div>

        <div className="px-5 space-y-3 flex-shrink-0">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Workout name (e.g. Push Day)"
            className="w-full px-3 py-2 rounded-lg text-sm border outline-none focus:ring-2 focus:ring-[color:var(--accent)]/30"
            style={{ background: 'var(--bg-3)', borderColor: 'var(--border)', color: 'var(--fg)' }}
          />
          <div className="flex gap-1.5 flex-wrap">
            {SPLIT_TYPES.map((s) => (
              <button key={s.value} onClick={() => setSplitType(s.value)}
                className="px-2.5 py-1 rounded-full text-xs font-medium transition-colors"
                style={splitType === s.value
                  ? { background: 'oklch(0.72 0.14 30 / 0.2)', color: 'oklch(0.72 0.14 30)' }
                  : { background: 'var(--bg-3)', color: 'var(--fg-3)' }
                }
              >{s.label}</button>
            ))}
          </div>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-3 space-y-2">
          {exercises.map((ex) => (
            <div key={ex.id} className="rounded-xl p-3 space-y-2" style={{ background: 'var(--bg-3)' }}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>{ex.exercise_name}</p>
                <button onClick={() => handleDeleteExercise(ex.id)} className="p-1 rounded hover:text-rose-500" style={{ color: 'var(--fg-4)' }}><X size={13} /></button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Sets', field: 'sets', type: 'number', placeholder: '3' },
                  { label: 'Reps', field: 'reps_target', type: 'text', placeholder: '8-12' },
                  { label: 'Weight', field: 'weight_target', type: 'number', placeholder: '—' },
                ].map(({ label, field, type, placeholder }) => (
                  <div key={field}>
                    <label className="block text-[10px] mb-0.5" style={{ color: 'var(--fg-4)' }}>{label}</label>
                    <input type={type} value={ex[field] ?? ''} placeholder={placeholder}
                      onChange={(e) => handleUpdateExercise(ex.id, field, e.target.value)}
                      onBlur={() => handleSaveExercise(ex)}
                      className="w-full px-2 py-1.5 rounded-lg text-xs border text-center outline-none"
                      style={{ background: 'var(--bg-4)', borderColor: 'var(--border)', color: 'var(--fg)' }}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}

          <button onClick={() => setPickerOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed text-sm transition-colors"
            style={{ borderColor: 'var(--border-2)', color: 'var(--fg-3)' }}
          >
            <Plus size={14} /> Add exercise
          </button>
        </div>

        <div className="px-5 pb-5 flex gap-2 flex-shrink-0">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg text-sm font-medium" style={{ background: 'var(--bg-3)', color: 'var(--fg-2)' }}>Cancel</button>
          <button onClick={save} disabled={!name.trim() || saving}
            className="flex-1 py-2 rounded-lg text-sm font-medium disabled:opacity-40"
            style={{ background: 'oklch(0.72 0.14 30)', color: '#fff' }}
          >{saving ? 'Saving…' : 'Save workout'}</button>
        </div>
      </div>
      {pickerOpen && <ExercisePicker customExercises={customExercises} onSelect={handleAddExercise} onClose={() => setPickerOpen(false)} />}
    </div>,
    document.body
  )
}

// ─── Active Session ───────────────────────────────────────────────────────────
function ActiveSession({ workout, workoutExs, onFinish, userId, customExercises }) {
  const { addLog, addLogSet, updateLogSet, updateLog } = useGymStore()
  const [logId, setLogId] = useState(null)
  const [sets, setSets] = useState({}) // keyed by exercise_name → [{weight, reps, done, id}]
  const [pickerOpen, setPickerOpen] = useState(false)
  const [extraExercises, setExtraExercises] = useState([])
  const [startTime] = useState(Date.now())
  const [elapsed, setElapsed] = useState(0)

  const allExercises = [...(workoutExs || []), ...extraExercises]

  useEffect(() => {
    // Create the log on mount
    addLog({ user_id: userId, workout_id: workout?.id ?? null, workout_name: workout?.name ?? 'Quick Workout', date: format(new Date(), 'yyyy-MM-dd') })
      .then(({ data }) => { if (data) setLogId(data.id) })
  }, [])

  useEffect(() => {
    const iv = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000)
    return () => clearInterval(iv)
  }, [startTime])

  function initSets(exName, count = 3) {
    setSets((prev) => ({
      ...prev,
      [exName]: prev[exName] ?? Array.from({ length: count }, (_, i) => ({ set: i + 1, weight: '', reps: '', done: false, id: null })),
    }))
  }

  useEffect(() => {
    allExercises.forEach((ex) => initSets(ex.exercise_name, ex.sets || 3))
  }, [allExercises.length])

  async function toggleSet(exName, idx) {
    if (!logId) return
    const exSets = sets[exName] || []
    const s = exSets[idx]
    if (!s.done) {
      const { data } = await addLogSet({
        log_id: logId,
        exercise_name: exName,
        set_number: s.set,
        weight: s.weight ? Number(s.weight) : null,
        reps: s.reps ? Number(s.reps) : null,
        completed: true,
      })
      setSets((prev) => ({
        ...prev,
        [exName]: prev[exName].map((x, i) => i === idx ? { ...x, done: true, id: data?.id } : x),
      }))
    } else if (s.id) {
      await updateLogSet(s.id, logId, { completed: false })
      setSets((prev) => ({
        ...prev,
        [exName]: prev[exName].map((x, i) => i === idx ? { ...x, done: false, id: null } : x),
      }))
    }
  }

  function updateSetField(exName, idx, field, value) {
    setSets((prev) => ({
      ...prev,
      [exName]: prev[exName].map((x, i) => i === idx ? { ...x, [field]: value } : x),
    }))
  }

  function addSet(exName) {
    setSets((prev) => ({
      ...prev,
      [exName]: [...(prev[exName] || []), { set: (prev[exName]?.length ?? 0) + 1, weight: '', reps: '', done: false, id: null }],
    }))
  }

  async function finish() {
    const durationMin = Math.floor((Date.now() - startTime) / 60000)
    if (logId) await updateLog(logId, { duration_minutes: durationMin })
    showToast({ message: 'Workout completed! 💪', variant: 'success' })
    onFinish()
  }

  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0')
  const ss = String(elapsed % 60).padStart(2, '0')
  const totalDone = Object.values(sets).flat().filter((s) => s.done).length
  const totalSets = Object.values(sets).flat().length

  return (
    <div className="fixed inset-0 flex flex-col" style={{ zIndex: 300, background: 'var(--bg)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)', paddingTop: 'max(16px, env(safe-area-inset-top))' }}>
        <div>
          <h2 className="text-base font-bold" style={{ color: 'var(--fg)' }}>{workout?.name ?? 'Quick Workout'}</h2>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-xs font-mono" style={{ color: 'var(--fg-3)' }}>{mm}:{ss}</span>
            <span className="text-xs" style={{ color: 'var(--fg-3)' }}>{totalDone}/{totalSets} sets done</span>
          </div>
        </div>
        <button onClick={finish}
          className="px-4 py-2 rounded-xl text-sm font-semibold"
          style={{ background: 'oklch(0.72 0.14 30)', color: '#fff' }}
        >Finish</button>
      </div>

      {/* Exercise list */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {allExercises.map((ex) => {
          const exSets = sets[ex.exercise_name] || []
          const doneSets = exSets.filter((s) => s.done).length
          return (
            <div key={ex.exercise_name + ex.id} className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-3)', border: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>{ex.exercise_name}</p>
                  {ex.reps_target && <p className="text-[10px] mt-0.5" style={{ color: 'var(--fg-3)' }}>{ex.sets ?? 3} × {ex.reps_target} reps{ex.weight_target ? ` @ ${ex.weight_target}lbs` : ''}</p>}
                </div>
                <span className="text-xs font-mono font-semibold" style={{ color: doneSets === exSets.length && exSets.length > 0 ? 'oklch(0.72 0.14 150)' : 'var(--fg-3)' }}>
                  {doneSets}/{exSets.length}
                </span>
              </div>

              <div className="px-3 py-2 space-y-1.5">
                {/* Column headers */}
                <div className="grid grid-cols-[28px_1fr_1fr_36px] gap-2 px-1">
                  {['Set', 'lbs', 'Reps', ''].map((h) => (
                    <p key={h} className="text-[10px] text-center" style={{ color: 'var(--fg-4)' }}>{h}</p>
                  ))}
                </div>
                {exSets.map((s, i) => (
                  <div key={i} className="grid grid-cols-[28px_1fr_1fr_36px] gap-2 items-center">
                    <span className="text-xs text-center tabular-nums" style={{ color: 'var(--fg-3)' }}>{s.set}</span>
                    <input type="number" value={s.weight} placeholder="—" min="0"
                      onChange={(e) => updateSetField(ex.exercise_name, i, 'weight', e.target.value)}
                      className="py-1.5 rounded-lg text-xs text-center border outline-none"
                      style={{ background: s.done ? 'var(--bg-4)' : 'var(--bg-2)', borderColor: 'var(--border)', color: 'var(--fg)' }}
                    />
                    <input type="number" value={s.reps} placeholder="—" min="0"
                      onChange={(e) => updateSetField(ex.exercise_name, i, 'reps', e.target.value)}
                      className="py-1.5 rounded-lg text-xs text-center border outline-none"
                      style={{ background: s.done ? 'var(--bg-4)' : 'var(--bg-2)', borderColor: 'var(--border)', color: 'var(--fg)' }}
                    />
                    <button onClick={() => toggleSet(ex.exercise_name, i)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                      style={s.done ? { background: 'oklch(0.72 0.14 150 / 0.2)', color: 'oklch(0.72 0.14 150)' } : { background: 'var(--bg-4)', color: 'var(--fg-4)' }}
                    ><Check size={14} /></button>
                  </div>
                ))}
                <button onClick={() => addSet(ex.exercise_name)}
                  className="w-full py-1.5 rounded-lg text-xs flex items-center justify-center gap-1 mt-1"
                  style={{ color: 'var(--fg-3)', background: 'var(--bg-4)' }}
                ><Plus size={11} /> Add set</button>
              </div>
            </div>
          )
        })}

        <button onClick={() => setPickerOpen(true)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed text-sm"
          style={{ borderColor: 'var(--border-2)', color: 'var(--fg-3)' }}
        ><Plus size={14} /> Add exercise</button>
      </div>

      {pickerOpen && (
        <ExercisePicker
          customExercises={customExercises}
          onSelect={(ex) => {
            setExtraExercises((prev) => [...prev, { exercise_name: ex.name, sets: 3, reps_target: '8-12', id: `extra-${Date.now()}` }])
            initSets(ex.name, 3)
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  )
}

// ─── Custom Exercise Modal ────────────────────────────────────────────────────
function CustomExerciseModal({ onClose, userId }) {
  const { addCustomExercise } = useGymStore()
  const [form, setForm] = useState({ name: '', muscle_group: MUSCLE_GROUPS[0], category: 'strength' })
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!form.name.trim()) return
    setSaving(true)
    const { error } = await addCustomExercise({ user_id: userId, name: form.name.trim(), muscle_group: form.muscle_group, category: form.category })
    setSaving(false)
    if (error) { showToast({ message: 'Save failed', variant: 'error' }); return }
    showToast({ message: 'Exercise created', variant: 'success' })
    onClose()
  }

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center" style={{ zIndex: 500 }} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full sm:max-w-sm bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-2xl p-5 space-y-4" style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold" style={{ color: 'var(--fg)' }}>New Exercise</h3>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400"><X size={16} /></button>
        </div>
        <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Exercise name" autoFocus
          className="w-full px-3 py-2 rounded-lg text-sm border outline-none focus:ring-2 focus:ring-[color:var(--accent)]/30"
          style={{ background: 'var(--bg-3)', borderColor: 'var(--border)', color: 'var(--fg)' }}
        />
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--fg-3)' }}>Muscle group</label>
            <select value={form.muscle_group} onChange={(e) => setForm((f) => ({ ...f, muscle_group: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
              style={{ background: 'var(--bg-3)', borderColor: 'var(--border)', color: 'var(--fg)' }}
            >
              {MUSCLE_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--fg-3)' }}>Category</label>
            <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
              style={{ background: 'var(--bg-3)', borderColor: 'var(--border)', color: 'var(--fg)' }}
            >
              {['strength', 'cardio', 'flexibility', 'other'].map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg text-sm font-medium" style={{ background: 'var(--bg-3)', color: 'var(--fg-2)' }}>Cancel</button>
          <button onClick={save} disabled={!form.name.trim() || saving}
            className="flex-1 py-2 rounded-lg text-sm font-medium disabled:opacity-40"
            style={{ background: 'oklch(0.72 0.14 30)', color: '#fff' }}
          >{saving ? 'Saving…' : 'Create'}</button>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Gym() {
  const { user } = useAuthStore()
  const { workouts, logs, customExercises, workoutExercises, fetchWorkouts, fetchLogs, fetchCustomExercises, fetchWorkoutExercises, deleteWorkout, deleteLog, deleteCustomExercise } = useGymStore()
  const [tab, setTab] = useState('workouts')
  const [workoutModal, setWorkoutModal] = useState(null)
  const [activeSession, setActiveSession] = useState(null) // { workout, exercises }
  const [customExModal, setCustomExModal] = useState(false)
  const [expandedLog, setExpandedLog] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const { fetchLogSets, logSets } = useGymStore()

  useEffect(() => {
    if (!user) return
    fetchWorkouts(user.id)
    fetchLogs(user.id)
    fetchCustomExercises(user.id)
  }, [user])

  async function startWorkout(workout) {
    const exs = await fetchWorkoutExercises(workout.id)
    setActiveSession({ workout, exercises: exs })
  }

  function startQuick() {
    setActiveSession({ workout: { name: 'Quick Workout', id: null }, exercises: [] })
  }

  async function toggleLog(logId) {
    if (expandedLog === logId) { setExpandedLog(null); return }
    setExpandedLog(logId)
    if (!logSets[logId]) await fetchLogSets(logId)
  }

  // Stats
  const thisWeekLogs = logs.filter((l) => {
    if (!l.date) return false
    const d = parseISO(l.date)
    const now = new Date()
    const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay())
    return d >= weekStart
  })
  const totalVolume = Object.values(logSets).flat().filter((s) => s.completed && s.weight && s.reps).reduce((sum, s) => sum + (s.weight * s.reps), 0)

  const allExercises = [
    ...DEFAULT_EXERCISES,
    ...customExercises.map((e) => ({ ...e, custom: true })),
  ]

  return (
    <>
      {activeSession && (
        <ActiveSession
          workout={activeSession.workout}
          workoutExs={activeSession.exercises}
          userId={user.id}
          customExercises={customExercises}
          onFinish={() => { setActiveSession(null); fetchLogs(user.id) }}
        />
      )}

      <div className="max-w-3xl mx-auto w-full">

        {/* Header — sticky so it stays visible while the page scrolls */}
        <div className="sticky top-0 z-10 px-4 pt-4 pb-3 md:px-8 md:pt-6 border-b" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'oklch(0.72 0.14 30 / 0.15)' }}>
                <Dumbbell size={15} style={{ color: 'oklch(0.72 0.14 30)' }} />
              </div>
              <h1 className="text-xl font-bold" style={{ color: 'var(--fg)' }}>Gym</h1>
            </div>
            <button onClick={startQuick}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{ background: 'oklch(0.72 0.14 30)', color: '#fff' }}
            ><Flame size={12} /> Quick workout</button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[
              { label: 'This week', value: thisWeekLogs.length, unit: 'sessions', color: 'oklch(0.72 0.14 30)' },
              { label: 'Total logged', value: logs.length, unit: 'workouts', color: 'oklch(0.74 0.14 65)' },
              { label: 'Total volume', value: totalVolume > 0 ? `${(totalVolume / 1000).toFixed(1)}k` : '—', unit: 'lbs lifted', color: 'oklch(0.72 0.14 150)' },
            ].map(({ label, value, unit, color }) => (
              <div key={label} className="rounded-xl p-3 text-center" style={{ background: 'var(--bg-3)' }}>
                <div className="text-lg font-bold tabular-nums" style={{ color }}>{value}</div>
                <div className="text-[10px]" style={{ color: 'var(--fg-3)' }}>{unit}</div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-1">
            {[
              { value: 'workouts',  label: 'Workouts',  Icon: Dumbbell  },
              { value: 'log',       label: 'History',   Icon: BarChart2 },
              { value: 'exercises', label: 'Exercises', Icon: Award     },
            ].map(({ value, label, Icon }) => (
              <button key={value} onClick={() => setTab(value)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                style={tab === value
                  ? { background: 'oklch(0.72 0.14 30 / 0.15)', color: 'oklch(0.72 0.14 30)' }
                  : { color: 'var(--fg-3)' }
                }
              ><Icon size={12} />{label}</button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="px-4 py-4 md:px-8 space-y-3">

          {/* ── Workouts tab ── */}
          {tab === 'workouts' && (
            <div className="space-y-3">
              {workouts.length === 0 && (
                <div className="text-center py-12 space-y-2">
                  <Dumbbell size={32} className="mx-auto opacity-20" />
                  <p className="text-sm" style={{ color: 'var(--fg-3)' }}>No workouts yet. Create your first split.</p>
                </div>
              )}
              {workouts.map((w) => {
                const exCount = (workoutExercises[w.id] ?? []).length
                const splitInfo = SPLIT_TYPES.find((s) => s.value === w.split_type)
                return (
                  <div key={w.id} className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-3)', border: '1px solid var(--border)' }}>
                    <div className="flex items-center gap-3 px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>{w.name}</p>
                          {splitInfo && splitInfo.value !== 'custom' && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'oklch(0.72 0.14 30 / 0.15)', color: 'oklch(0.72 0.14 30)' }}>{splitInfo.label}</span>
                          )}
                        </div>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--fg-3)' }}>{exCount} exercise{exCount !== 1 ? 's' : ''}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setWorkoutModal(w)} className="p-1.5 rounded-lg" style={{ color: 'var(--fg-3)' }}><Edit2 size={13} /></button>
                        <button onClick={() => setDeleteConfirm({ type: 'workout', item: w })} className="p-1.5 rounded-lg hover:text-rose-500" style={{ color: 'var(--fg-3)' }}><Trash2 size={13} /></button>
                        <button onClick={() => startWorkout(w)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold ml-1"
                          style={{ background: 'oklch(0.72 0.14 30)', color: '#fff' }}
                        ><Flame size={11} /> Start</button>
                      </div>
                    </div>
                  </div>
                )
              })}
              <button onClick={() => setWorkoutModal('new')}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed text-sm"
                style={{ borderColor: 'var(--border-2)', color: 'var(--fg-3)' }}
              ><Plus size={14} /> New workout</button>
            </div>
          )}

          {/* ── History tab ── */}
          {tab === 'log' && (
            <div className="space-y-2">
              {logs.length === 0 && (
                <div className="text-center py-12 space-y-2">
                  <BarChart2 size={32} className="mx-auto opacity-20" />
                  <p className="text-sm" style={{ color: 'var(--fg-3)' }}>No workouts logged yet. Start a session to track your progress.</p>
                </div>
              )}
              {logs.map((log) => {
                const isExpanded = expandedLog === log.id
                const sets = logSets[log.id] ?? []
                const completedSets = sets.filter((s) => s.completed)
                return (
                  <div key={log.id} className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-3)', border: '1px solid var(--border)' }}>
                    <button onClick={() => toggleLog(log.id)} className="w-full flex items-center gap-3 px-4 py-3 text-left">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'oklch(0.72 0.14 30 / 0.12)' }}>
                        <Dumbbell size={16} style={{ color: 'oklch(0.72 0.14 30)' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>{log.workout_name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px]" style={{ color: 'var(--fg-3)' }}>{log.date ? format(parseISO(log.date), 'MMM d, yyyy') : '—'}</span>
                          {log.duration_minutes && <span className="text-[10px] flex items-center gap-0.5" style={{ color: 'var(--fg-4)' }}><Clock size={9} />{log.duration_minutes}m</span>}
                          {completedSets.length > 0 && <span className="text-[10px]" style={{ color: 'var(--fg-4)' }}>{completedSets.length} sets</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ type: 'log', item: log }) }} className="p-1.5 rounded-lg hover:text-rose-500" style={{ color: 'var(--fg-4)' }}><Trash2 size={12} /></button>
                        {isExpanded ? <ChevronUp size={14} style={{ color: 'var(--fg-3)' }} /> : <ChevronDown size={14} style={{ color: 'var(--fg-3)' }} />}
                      </div>
                    </button>
                    {isExpanded && completedSets.length > 0 && (
                      <div className="px-4 pb-3" style={{ borderTop: '1px solid var(--border)' }}>
                        {Object.entries(completedSets.reduce((acc, s) => { acc[s.exercise_name] = [...(acc[s.exercise_name] ?? []), s]; return acc }, {})).map(([exName, exSets]) => (
                          <div key={exName} className="mt-3">
                            <p className="text-xs font-semibold mb-1.5" style={{ color: 'var(--fg-2)' }}>{exName}</p>
                            <div className="space-y-1">
                              {exSets.map((s) => (
                                <div key={s.id} className="flex items-center gap-2 text-xs" style={{ color: 'var(--fg-3)' }}>
                                  <span className="font-mono w-8">Set {s.set_number}</span>
                                  <span>{s.weight ?? '—'} lbs</span>
                                  <span>×</span>
                                  <span>{s.reps ?? '—'} reps</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* ── Exercises tab ── */}
          {tab === 'exercises' && (
            <div className="space-y-4">
              {customExercises.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--fg-3)' }}>Custom</p>
                  <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-3)', border: '1px solid var(--border)' }}>
                    {customExercises.map((e, i) => (
                      <div key={e.id} className="flex items-center gap-3 px-4 py-2.5" style={{ borderBottom: i < customExercises.length - 1 ? '1px solid var(--hairline)' : 'none' }}>
                        <div className="flex-1">
                          <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>{e.name}</p>
                          <p className="text-[10px] mt-0.5" style={{ color: 'var(--fg-3)' }}>{e.muscle_group} · {e.category}</p>
                        </div>
                        <button onClick={() => setDeleteConfirm({ type: 'exercise', item: e })} className="p-1.5 rounded-lg hover:text-rose-500" style={{ color: 'var(--fg-4)' }}><Trash2 size={12} /></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {MUSCLE_GROUPS.map((mg) => {
                const exs = DEFAULT_EXERCISES.filter((e) => e.muscle_group === mg)
                return (
                  <div key={mg}>
                    <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--fg-3)' }}>{mg}</p>
                    <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-3)', border: '1px solid var(--border)' }}>
                      {exs.map((e, i) => (
                        <div key={e.name} className="px-4 py-2.5" style={{ borderBottom: i < exs.length - 1 ? '1px solid var(--hairline)' : 'none' }}>
                          <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>{e.name}</p>
                          <p className="text-[10px] mt-0.5" style={{ color: 'var(--fg-3)' }}>{e.category}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}

              <button onClick={() => setCustomExModal(true)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed text-sm"
                style={{ borderColor: 'var(--border-2)', color: 'var(--fg-3)' }}
              ><Plus size={14} /> Create custom exercise</button>
            </div>
          )}
        </div>
      </div>

      {workoutModal && (
        <WorkoutModal
          workout={workoutModal === 'new' ? null : workoutModal}
          userId={user.id}
          onClose={() => { setWorkoutModal(null); fetchWorkouts(user.id) }}
        />
      )}
      {customExModal && (
        <CustomExerciseModal userId={user.id} onClose={() => setCustomExModal(false)} />
      )}

      <ConfirmDeleteModal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => {
          const dc = deleteConfirm
          if (!dc?.item) return
          if (dc.type === 'workout') deleteWorkout(dc.item.id)
          else if (dc.type === 'log') deleteLog(dc.item.id)
          else if (dc.type === 'exercise') deleteCustomExercise(dc.item.id)
        }}
        title={
          deleteConfirm?.type === 'workout'  ? `Delete "${deleteConfirm?.item?.name}"?` :
          deleteConfirm?.type === 'log'      ? `Delete log from ${deleteConfirm?.item?.date ?? 'this session'}?` :
          `Delete "${deleteConfirm?.item?.name}"?`
        }
        description={
          deleteConfirm?.type === 'workout'  ? 'This workout plan will be permanently deleted.' :
          deleteConfirm?.type === 'log'      ? 'This workout log and all its sets will be permanently deleted.' :
          'This custom exercise will be permanently deleted.'
        }
      />
    </>
  )
}
