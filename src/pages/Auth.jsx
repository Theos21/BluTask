import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../stores/useAuthStore'
import { supabase } from '../lib/supabase'
import { isCapacitor, isIOS } from '../hooks/useMobileApp'

export default function Auth() {
  const location = useLocation()
  const [mode, setMode] = useState('signin')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [appleLoading, setAppleLoading] = useState(false)
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
        redirectTo: `${window.location.origin}/reset-password`,
      })
      setLoading(false)
      if (error) setError(error.message)
      else setSuccess('Check your email for a password reset link.')
      return
    }

    if (mode === 'signin') {
      const { error } = await signIn(email, password)
      if (error) setError(error.message)
      else navigate('/home', { replace: true })
    } else {
      const { error } = await signUp(email, password, fullName.trim())
      if (error) setError(error.message)
      else setSuccess('Check your email to confirm your account.')
    }
    setLoading(false)
  }

  async function handleGoogleSignIn() {
    console.log('[Auth] Google Sign In tapped', {
      isCapacitor,
      isIOS,
      origin: window.location.origin,
    })

    setGoogleLoading(true)
    setError('')

    // Capacitor: redirect back into the app via custom URL scheme.
    // Web / Tauri: redirect back to the page origin.
    // The custom scheme must be registered in:
    //   iOS  → Info.plist CFBundleURLTypes
    //   Android → AndroidManifest.xml intent-filter
    //   Supabase → Auth > URL Configuration > Redirect URLs
    const redirectTo = isCapacitor
      ? 'com.blutask.app://auth/callback'
      : window.location.origin

    console.log('[Auth] Calling signInWithOAuth → redirectTo:', redirectTo)

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    })

    console.log('[Auth] signInWithOAuth returned →', {
      url:   data?.url  ?? null,
      error: error?.message ?? null,
    })

    if (error) {
      console.log('[Auth] OAuth initiation failed:', error)
      setError(error.message)
      setGoogleLoading(false)
    } else {
      // Browser / WebView navigates to Google — execution stops here.
      // The appUrlOpen listener above handles the return trip.
      console.log('[Auth] Redirecting to Google…', data?.url)
    }
  }

  async function handleAppleSignIn() {
    setAppleLoading(true)
    setError('')

    try {
      // Generate a random nonce and its SHA-256 hash.
      // Apple requires the hashed nonce; Supabase needs the raw nonce to verify.
      const rawNonce = Array.from(crypto.getRandomValues(new Uint8Array(16)))
        .map(b => b.toString(16).padStart(2, '0')).join('')

      const hashBuffer = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(rawNonce)
      )
      const hashedNonce = Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0')).join('')

      const { SignInWithApple } = await import('@capacitor-community/apple-sign-in')
      const result = await SignInWithApple.authorize({
        clientId:    'com.blutask.app',
        redirectURI: 'https://app.blutask.com',
        scopes:      'email name',
        nonce:       hashedNonce,
      })

      const { identityToken, givenName, familyName } = result.response

      // Exchange the Apple identity token with Supabase
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token:    identityToken,
        nonce:    rawNonce,
      })

      if (error) throw error

      // Apple only sends name on first sign-in — persist it if available
      if (data?.user && (givenName || familyName)) {
        const fullName = [givenName, familyName].filter(Boolean).join(' ')
        if (fullName) {
          await supabase.from('profiles')
            .upsert({ id: data.user.id, full_name: fullName }, { onConflict: 'id', ignoreDuplicates: false })
        }
      }

      navigate('/home', { replace: true })
    } catch (err) {
      // 'USER_CANCELLED' is thrown when the user dismisses the sheet — not an error
      if (err?.code !== 'USER_CANCELLED' && err?.message !== "The operation couldn’t be completed.") {
        setError(err?.message || 'Apple sign in failed')
      }
      setAppleLoading(false)
    }
  }

  function switchMode(m) {
    setMode(m)
    setError('')
    setSuccess('')
    setFullName('')
  }

  const socialDisabled = loading || googleLoading || appleLoading

  return (
    <div className={`min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4${isCapacitor ? ' mob-auth-safe' : ''}`}>
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
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
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
              disabled={loading || socialDisabled}
              className="btn-primary w-full justify-center py-3 disabled:opacity-50"
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

          {mode !== 'forgot' && (
            <>
              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200 dark:border-gray-700" />
                </div>
                <div className="relative flex justify-center">
                  <span className="px-3 text-xs text-gray-400 dark:text-gray-500 bg-white dark:bg-[#131b24]">
                    or
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                {/* Google */}
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={socialDisabled}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/80 transition-colors disabled:opacity-50"
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
                    <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
                    <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
                    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
                  </svg>
                  {googleLoading ? 'Opening…' : 'Continue with Google'}
                </button>

                {/* Apple — only on iOS Capacitor (required by App Store guidelines) */}
                {isIOS && (
                  <button
                    type="button"
                    onClick={handleAppleSignIn}
                    disabled={socialDisabled}
                    className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg bg-black dark:bg-white text-white dark:text-black text-sm font-medium hover:bg-gray-900 dark:hover:bg-gray-100 transition-colors disabled:opacity-50"
                  >
                    {/* Apple logo SVG */}
                    <svg width="16" height="19" viewBox="0 0 16 19" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                      <path d="M13.247 10.143c-.022-2.417 1.977-3.587 2.067-3.645-1.128-1.645-2.882-1.87-3.51-1.895-1.495-.152-2.917.878-3.673.878-.756 0-1.934-.856-3.177-.833C3.12 4.673 1.35 5.718.48 7.365c-1.772 3.062-.454 7.61 1.27 10.105.843 1.218 1.849 2.588 3.173 2.538 1.275-.05 1.756-.819 3.296-.819 1.54 0 1.975.819 3.325.794 1.373-.023 2.243-1.244 3.078-2.47.976-1.413 1.378-2.789 1.4-2.86-.031-.013-2.684-1.03-2.705-4.51Z"/>
                      <path d="M10.856 2.898C11.533 2.07 11.99.95 11.862-.19c-.95.046-2.103.634-2.783 1.462-.612.74-1.147 1.921-1.003 3.054 1.059.082 2.14-.538 2.78-1.428Z"/>
                    </svg>
                    {appleLoading ? 'Signing in…' : 'Continue with Apple'}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
