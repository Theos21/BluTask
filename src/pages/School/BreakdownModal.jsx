import { useState, useEffect } from 'react'
import { Sparkles, Check, Loader2 } from 'lucide-react'
import Modal from '../../components/ui/Modal'
import { useSchoolStore } from '../../stores/useSchoolStore'
import { callAI } from '../../lib/ai'
import { showToast } from '../../lib/toast'

function uid() {
  return Math.random().toString(36).slice(2, 10)
}

export default function BreakdownModal({ isOpen, onClose, assignment }) {
  const { updateAssignment } = useSchoolStore()
  const [steps, setSteps] = useState(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isOpen || !assignment) return
    setSteps(null)
    setError('')
    fetchBreakdown()
  }, [isOpen, assignment?.id])

  async function fetchBreakdown() {
    setLoading(true)
    try {
      const { steps: raw } = await callAI('breakdown_assignment', {
        title: assignment.title,
        type: assignment.type,
      })
      setSteps(raw.map((text, i) => ({ id: i, text, accepted: true })))
    } catch (err) {
      setError(err.message || 'Could not generate steps. Try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    const accepted = steps.filter((s) => s.accepted)
    if (!accepted.length) return
    setSaving(true)
    const existing = assignment.checklist || []
    const newItems = accepted.map((s) => ({ id: uid(), title: s.text, completed: false }))
    const { error } = await updateAssignment(assignment.id, {
      checklist: [...existing, ...newItems],
    })
    if (!error) {
      showToast({ message: `${accepted.length} step${accepted.length !== 1 ? 's' : ''} added`, variant: 'success' })
      onClose()
    } else {
      showToast({ message: 'Failed to save steps', variant: 'error' })
    }
    setSaving(false)
  }

  function toggle(id) {
    setSteps((prev) => prev.map((s) => s.id === id ? { ...s, accepted: !s.accepted } : s))
  }

  const acceptedCount = steps?.filter((s) => s.accepted).length ?? 0

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="AI breakdown" size="md">
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/20">
          <Sparkles size={13} className="text-indigo-500 flex-shrink-0" />
          <span className="text-xs text-indigo-700 dark:text-indigo-300 font-medium truncate">
            {assignment?.title}
          </span>
          <span className="text-[10px] text-indigo-500 dark:text-indigo-400 capitalize ml-auto flex-shrink-0">
            {assignment?.type}
          </span>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-8 gap-2 text-sm text-gray-400">
            <Loader2 size={16} className="animate-spin" />
            Generating steps…
          </div>
        )}

        {error && !loading && (
          <div className="text-center py-6">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{error}</p>
            <button onClick={fetchBreakdown} className="btn-ghost text-sm">Try again</button>
          </div>
        )}

        {steps && !loading && (
          <>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Click any step to deselect it.
            </p>
            <div className="space-y-1.5">
              {steps.map((step) => (
                <button
                  key={step.id}
                  onClick={() => toggle(step.id)}
                  className={`w-full flex items-start gap-3 p-2.5 rounded-lg border text-left transition-colors ${
                    step.accepted
                      ? 'border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-900/10'
                      : 'border-gray-100 dark:border-gray-800 opacity-40'
                  }`}
                >
                  <div className={`mt-0.5 w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center border ${
                    step.accepted
                      ? 'bg-indigo-500 border-indigo-500'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}>
                    {step.accepted && <Check size={10} className="text-white" />}
                  </div>
                  <span className="text-sm text-gray-700 dark:text-gray-300 leading-snug">{step.text}</span>
                </button>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-1 border-t border-gray-100 dark:border-gray-800">
              <button onClick={onClose} className="btn-ghost text-sm">Cancel</button>
              <button
                onClick={handleSave}
                disabled={acceptedCount === 0 || saving}
                className="btn-primary text-sm flex items-center gap-2 disabled:opacity-40"
              >
                <Sparkles size={13} />
                {saving ? 'Adding…' : `Add ${acceptedCount} step${acceptedCount !== 1 ? 's' : ''}`}
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
