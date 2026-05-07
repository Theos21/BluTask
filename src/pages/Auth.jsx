import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../stores/useAuthStore'
import { supabase } from '../lib/supabase'

export default function Auth() {
  const location = useLocation()
  const [mode, setMode] = useState('signin')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(location.state?.message || '')
  const { signIn, signUp } = useAuthStore()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    if (mode === 'forgot') {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'http://localhost:5173/reset-password',
      })
      setLoading(false)
      if (error) setError(error.message)
      else setSuccess('Check your email for a password reset link.')
      return
    }

    if (mode === 'signin') {
      const { error } = await signIn(email, password)
      if (error) setError(error.message)
      else navigate('/', { replace: true })
    } else {
      const { error } = await signUp(email, password, fullName.trim())
      if (error) setError(error.message)
      else setSuccess('Check your email to confirm your account.')
    }
    setLoading(false)
  }

  function switchMode(m) {
    setMode(m)
    setError('')
    setSuccess('')
    setFullName('')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            Blu<span className="text-indigo-500">Task</span>
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Your life organizer</p>
        </div>

        <div className="card p-6 shadow-sm">
          {mode !== 'forgot' && (
            <div className="flex rounded-xl bg-gray-100 dark:bg-gray-800 p-1 mb-6">
              {['signin', 'signup'].map((m) => (
                <button
                  key={m}
                  onClick={() => switchMode(m)}
                  className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    mode === m
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {m === 'signin' ? 'Sign in' : 'Sign up'}
                </button>
              ))}
            </div>
          )}

          {mode === 'forgot' && (
            <div className="mb-6">
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Reset password</h2>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Enter your email and we'll send you a reset link.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                  Full name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                  required
                  autoFocus
                  className="input-base"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoFocus={mode === 'signin' || mode === 'forgot'}
                className="input-base"
              />
            </div>

            {mode !== 'forgot' && (
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="input-base"
                />
                {mode === 'signin' && (
                  <button
                    type="button"
                    onClick={() => switchMode('forgot')}
                    className="mt-1.5 text-xs text-gray-400 dark:text-gray-500 hover:text-[color:var(--color-accent)] transition-colors"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
            )}

            {error && (
              <p className="text-xs text-rose-500 bg-rose-50 dark:bg-rose-900/20 px-3 py-2 rounded-lg">
                {error}
              </p>
            )}
            {success && (
              <p className="text-xs text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20 px-3 py-2 rounded-lg">
                {success}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-2.5 disabled:opacity-50"
            >
              {loading
                ? 'Loading…'
                : mode === 'signin'
                ? 'Sign in'
                : mode === 'signup'
                ? 'Create account'
                : 'Send reset link'}
            </button>

            {mode === 'forgot' && (
              <button
                type="button"
                onClick={() => switchMode('signin')}
                className="w-full text-xs text-center text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                Back to sign in
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}
