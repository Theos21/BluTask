import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckSquare, GraduationCap, Clock, ChevronRight } from 'lucide-react'
import { useAuthStore } from '../stores/useAuthStore'
import { useTaskStore } from '../stores/useTaskStore'
import { useSchoolStore } from '../stores/useSchoolStore'
import { CLASS_COLORS } from '../lib/constants'
import ColorPicker from '../components/ui/ColorPicker'

const SPACES = [
  {
    id: 'school',
    label: 'School',
    description: 'Track classes and assignments',
    icon: GraduationCap,
    color: '#6366f1',
  },
  {
    id: 'watch',
    label: 'Watch',
    description: 'Track shows and movies',
    icon: Clock,
    color: '#f59e0b',
  },
  {
    id: 'tasks',
    label: 'Tasks',
    description: 'Organize your to-dos',
    icon: CheckSquare,
    color: '#14b8a6',
  },
]

export default function Onboarding() {
  const navigate = useNavigate()
  const { user, updateProfile } = useAuthStore()
  const { addList } = useTaskStore()
  const { addClass } = useSchoolStore()

  const [step, setStep] = useState(1)
  const [enabled, setEnabled] = useState({ school: true, watch: true, tasks: true })
  const [className, setClassName] = useState('')
  const [classColor, setClassColor] = useState(CLASS_COLORS[0]?.value || '#6366f1')
  const [listName, setListName] = useState('')
  const [saving, setSaving] = useState(false)

  function toggleSpace(id) {
    setEnabled(prev => ({ ...prev, [id]: !prev[id] }))
  }

  async function finish() {
    setSaving(true)
    // Save space preferences
    await updateProfile({
      show_school: enabled.school,
      onboarding_complete: true,
    })

    // Add first class if provided
    if (enabled.school && className.trim()) {
      await addClass({
        user_id: user.id,
        name: className.trim(),
        color: classColor,
      })
    }

    // Add first list if provided
    if (enabled.tasks && listName.trim()) {
      await addList({
        user_id: user.id,
        name: listName.trim(),
        color: '#14b8a6',
        position: 0,
      })
    }

    navigate('/', { replace: true })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0d1117] p-4">
      <div className="w-full max-w-md">

        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-8">
          {[1, 2, 3].map(n => (
            <div
              key={n}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                n === step
                  ? 'w-6 bg-[color:var(--color-accent)]'
                  : n < step
                  ? 'w-3 bg-[color:var(--color-accent)]/40'
                  : 'w-3 bg-gray-200 dark:bg-gray-700'
              }`}
            />
          ))}
        </div>

        {/* ── Step 1: Welcome ─────────────────────────────────────────── */}
        {step === 1 && (
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-[color:var(--color-accent)]/10 flex items-center justify-center mx-auto mb-6">
              <CheckSquare size={32} className="text-[color:var(--color-accent)]" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3">
              Welcome to BluTask
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-base leading-relaxed mb-8">
              BluTask keeps your tasks, school, and life organized in one place.
            </p>
            <button
              onClick={() => setStep(2)}
              className="btn-primary px-8 py-3 text-base"
            >
              Get started <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* ── Step 2: Personalize ─────────────────────────────────────── */}
        {step === 2 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
              Choose your spaces
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
              Enable the features you want. You can change this later in Settings.
            </p>

            <div className="space-y-3 mb-8">
              {SPACES.map(({ id, label, description, icon: Icon, color }) => {
                const on = enabled[id]
                return (
                  <button
                    key={id}
                    onClick={() => toggleSpace(id)}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all ${
                      on
                        ? 'border-[color:var(--color-accent)] bg-[color:var(--color-accent)]/5'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: color + '20' }}
                    >
                      <Icon size={20} style={{ color }} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{label}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                        on
                          ? 'border-[color:var(--color-accent)] bg-[color:var(--color-accent)]'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      {on && (
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>

            <button onClick={() => setStep(3)} className="btn-primary w-full justify-center py-3">
              Continue <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* ── Step 3: Quick setup ─────────────────────────────────────── */}
        {step === 3 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
              Quick setup
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
              Optionally add your first items to get started fast.
            </p>

            <div className="space-y-5 mb-8">
              {enabled.school && (
                <div className="card p-4">
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                    First class
                  </label>
                  <input
                    value={className}
                    onChange={e => setClassName(e.target.value)}
                    placeholder="e.g. Biology, Calculus…"
                    className="input-base mb-3"
                  />
                  <ColorPicker value={classColor} onChange={setClassColor} />
                </div>
              )}

              {enabled.tasks && (
                <div className="card p-4">
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                    First list
                  </label>
                  <input
                    value={listName}
                    onChange={e => setListName(e.target.value)}
                    placeholder="e.g. Personal, Work…"
                    className="input-base"
                  />
                </div>
              )}

              {!enabled.school && !enabled.tasks && (
                <p className="text-sm text-gray-400 dark:text-gray-500 italic text-center py-4">
                  No setup needed — you can add content anytime.
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={finish}
                disabled={saving}
                className="btn-ghost flex-1 justify-center py-3 text-gray-500"
              >
                Skip
              </button>
              <button
                onClick={finish}
                disabled={saving}
                className="btn-primary flex-2 px-8 justify-center py-3"
              >
                {saving ? 'Saving…' : 'Done'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
