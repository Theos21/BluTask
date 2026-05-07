import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useAuthStore } from '../../stores/useAuthStore'
import { supabase } from '../../lib/supabase'
import { showToast } from '../../lib/toast'

function StrengthBar({ password }) {
  if (!password) return null

  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^a-zA-Z0-9]/.test(password)) score++

  const level = score <= 1 ? 'weak' : score <= 3 ? 'medium' : 'strong'
  const bars = level === 'weak' ? 1 : level === 'medium' ? 2 : 3
  const color = level === 'weak' ? 'bg-rose-500' : level === 'medium' ? 'bg-amber-400' : 'bg-teal-500'
  const label = level === 'weak' ? 'Weak' : level === 'medium' ? 'Medium' : 'Strong'

  return (
    <div className="mt-1.5">
      <div className="flex gap-1 mb-1">
        {[1, 2, 3].map(n => (
          <div
            key={n}
            className={`h-1 flex-1 rounded-full transition-colors ${n <= bars ? color : 'bg-gray-200 dark:bg-gray-700'}`}
          />
        ))}
      </div>
      <p className={`text-[11px] ${
        level === 'weak' ? 'text-rose-500' : level === 'medium' ? 'text-amber-500' : 'text-teal-600 dark:text-teal-400'
      }`}>
        {label} password
      </p>
    </div>
  )
}

function PasswordInput({ value, onChange, placeholder, autoFocus }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="input-base pr-9"
      />
      <button
        type="button"
        onClick={() => setShow(v => !v)}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        tabIndex={-1}
      >
        {show ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </div>
  )
}

export default function ChangePasswordModal({ isOpen, onClose }) {
  const navigate = useNavigate()
  const { user, signOut, updatePassword } = useAuthStore()

  const [step, setStep] = useState(1)
  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function reset() {
    setStep(1)
    setCurrentPwd('')
    setNewPwd('')
    setConfirmPwd('')
    setError('')
    setLoading(false)
  }

  function handleClose() {
    reset()
    onClose()
  }

  async function verifyCurrentPassword(e) {
    e.preventDefault()
    if (!currentPwd) return
    setLoading(true)
    setError('')
    const { error: err } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPwd,
    })
    setLoading(false)
    if (err) {
      setError('Incorrect password. Please try again.')
    } else {
      setStep(2)
    }
  }

  async function submitNewPassword(e) {
    e.preventDefault()
    if (newPwd.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (newPwd !== confirmPwd) { setError('Passwords do not match.'); return }
    if (newPwd === currentPwd) { setError('New password must be different from your current password.'); return }
    setLoading(true)
    setError('')
    const { error: err } = await updatePassword(newPwd)
    if (err) {
      setLoading(false)
      setError(err.message)
      return
    }
    // Sign out all sessions after password change — security best practice
    await signOut()
    showToast({ message: 'Password changed. Please sign in again.', variant: 'success', duration: 5000 })
    navigate('/auth', { replace: true })
  }

  if (!isOpen) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      onMouseDown={e => { if (e.target === e.currentTarget) handleClose() }}
    >
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60" />

      <div className="relative w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Change password</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              {step === 1 ? 'Verify your current password first' : 'Choose a new password'}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Step indicators */}
        <div className="flex px-5 pt-4 gap-1.5">
          {[1, 2].map(n => (
            <div
              key={n}
              className={`h-1 flex-1 rounded-full transition-colors ${
                n <= step ? 'bg-[color:var(--color-accent)]' : 'bg-gray-200 dark:bg-gray-700'
              }`}
            />
          ))}
        </div>

        <div className="px-5 py-5">
          {/* Step 1: Verify current password */}
          {step === 1 && (
            <form onSubmit={verifyCurrentPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                  Current password
                </label>
                <PasswordInput
                  value={currentPwd}
                  onChange={e => setCurrentPwd(e.target.value)}
                  placeholder="Enter your current password"
                  autoFocus
                />
              </div>
              {error && (
                <p className="text-xs text-rose-500 bg-rose-50 dark:bg-rose-900/20 px-3 py-2 rounded-lg">{error}</p>
              )}
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={handleClose} className="btn-ghost flex-1 justify-center text-sm">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !currentPwd}
                  className="btn-primary flex-1 justify-center text-sm disabled:opacity-50"
                >
                  {loading ? 'Verifying…' : 'Continue'}
                </button>
              </div>
            </form>
          )}

          {/* Step 2: Set new password */}
          {step === 2 && (
            <form onSubmit={submitNewPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                  New password
                </label>
                <PasswordInput
                  value={newPwd}
                  onChange={e => setNewPwd(e.target.value)}
                  placeholder="At least 8 characters"
                  autoFocus
                />
                <StrengthBar password={newPwd} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                  Confirm new password
                </label>
                <PasswordInput
                  value={confirmPwd}
                  onChange={e => setConfirmPwd(e.target.value)}
                  placeholder="Repeat new password"
                />
                {confirmPwd && newPwd !== confirmPwd && (
                  <p className="text-[11px] text-rose-500 mt-1">Passwords do not match</p>
                )}
                {confirmPwd && newPwd === confirmPwd && newPwd.length >= 8 && (
                  <p className="text-[11px] text-teal-600 dark:text-teal-400 mt-1">Passwords match</p>
                )}
              </div>
              {error && (
                <p className="text-xs text-rose-500 bg-rose-50 dark:bg-rose-900/20 px-3 py-2 rounded-lg">{error}</p>
              )}
              <p className="text-[11px] text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800/50 px-3 py-2 rounded-lg">
                You'll be signed out on all devices after changing your password.
              </p>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={handleClose} className="btn-ghost flex-1 justify-center text-sm">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || newPwd.length < 8 || newPwd !== confirmPwd}
                  className="btn-primary flex-1 justify-center text-sm disabled:opacity-50"
                >
                  {loading ? 'Saving…' : 'Change password'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
