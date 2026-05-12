import { useEffect, useState, useCallback, Component } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from './stores/useAuthStore'
import { useAppStore } from './stores/useAppStore'
import { supabase } from './lib/supabase'
import { markOAuthCallbackReceived } from './lib/oauthCallback'
import {
  getPermissionStatus,
  rescheduleAll,
  addLocalNotificationListener,
} from './services/localNotifications'
import AppLayout from './components/layout/AppLayout'
import MobileLayout from './components/layout/MobileLayout'
import { isCapacitor } from './hooks/useMobileApp'
import Toaster from './components/toast'
import { toasterRef, triggerUndo } from './lib/toast'
import CommandPalette from './components/CommandPalette'
import ShortcutsModal from './components/ShortcutsModal'
import Auth from './pages/Auth'
import Landing from './pages/Landing'
import Home from './pages/Home'
import School from './pages/School'
import Watch from './pages/Watch'
import Tasks from './pages/Tasks'
import Calendar from './pages/Calendar'
import Settings from './pages/Settings'
import Archive from './pages/Archive'
import Onboarding from './pages/Onboarding'
import ResetPassword from './pages/ResetPassword'
import SharedWatchlist from './pages/Watch/SharedWatchlist'
import PrivacyPolicy from './pages/PrivacyPolicy'
import Sports from './pages/Sports'
import Gym from './pages/Gym'
import Books from './pages/Books'

// Called after any successful OAuth code/token exchange so the auth store
// stays in sync even if the Supabase onAuthStateChange event fires before
// the store's own listener is registered (race condition on cold start).
async function syncOAuthSession() {
  const { data: { session } } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }))
  if (!session) return
  useAuthStore.setState({ session, user: session.user, loading: false })
  useAuthStore.getState().fetchProfile(session.user.id)
}

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fafbfc] dark:bg-[#0d1117]">
      <div className="w-6 h-6 border-2 border-gray-300 dark:border-gray-700 border-t-[color:var(--color-accent)] rounded-full animate-spin" />
    </div>
  )
}

function ProtectedRoute({ children }) {
  const { user, loading, profile } = useAuthStore()
  const { pathname } = useLocation()
  if (pathname === '/reset-password') return children
  if (loading) return <Spinner />
  if (!user) return <Navigate to="/auth" replace />
  // Profile still loading — show spinner briefly to avoid onboarding flash
  if (user && profile === null) return <Spinner />
  if (profile && !profile.onboarding_complete) return <Navigate to="/onboarding" replace />
  return children
}

function OnboardingRoute({ children }) {
  const { user, loading, profile } = useAuthStore()
  if (loading) return <Spinner />
  if (!user) return <Navigate to="/auth" replace />
  if (profile?.onboarding_complete) return <Navigate to="/home" replace />
  return children
}

function AuthRoute() {
  const { user, loading } = useAuthStore()
  if (loading) return <Spinner />
  if (user) return <Navigate to="/home" replace />
  return <Auth />
}

const isTauri = !!(window.__TAURI_INTERNALS__ || window.__TAURI__)

class PageErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(error) { return { error } }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 px-6 text-center">
        <p className="text-base font-semibold" style={{ color: 'var(--fg)' }}>Something went wrong</p>
        <p className="text-sm" style={{ color: 'var(--fg-3)' }}>{this.state.error.message}</p>
        <button
          onClick={() => this.setState({ error: null })}
          className="px-4 py-2 rounded-lg text-sm font-medium"
          style={{ background: 'var(--bg-3)', color: 'var(--fg)' }}
        >Try again</button>
      </div>
    )
  }
}

// Pick the right shell: native mobile gets bottom-tab layout, everything else gets sidebar
const AppShell = isCapacitor ? MobileLayout : AppLayout

function LandingRoute() {
  const { user, loading } = useAuthStore()
  if (loading) return <Spinner />
  if (user) return <Navigate to="/home" replace />
  // Desktop app and mobile native app skip the landing page
  if (isTauri || isCapacitor) return <Navigate to="/auth" replace />
  return <Landing />
}

export default function App() {
  const { init, user } = useAuthStore()
  const { theme, accentColor } = useAppStore()
  const [cmdOpen, setCmdOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)

  useEffect(() => { init() }, [])

  // Local notifications: re-sync scheduled notifications after login.
  // Permission is requested natively by AppDelegate.swift at launch
  // (UNUserNotificationCenter.requestAuthorization) — never from JS, to
  // avoid competing requestAuthorization calls that cause iOS to hang.
  useEffect(() => {
    if (!user || !isCapacitor) return
    let removeListener = () => {}

    async function setupLocalNotifications() {
      const status = await getPermissionStatus()
      if (status !== 'granted') return

      // Re-sync all scheduled notifications against current DB state
      const [{ data: tasks }, { data: assignments }, { data: prefs }] = await Promise.all([
        supabase.from('tasks').select('id, title, due_date, reminders, completed').eq('user_id', user.id).eq('completed', false),
        supabase.from('assignments').select('id, title, due_date, completed').eq('user_id', user.id).eq('completed', false),
        supabase.from('notification_preferences').select('*').eq('user_id', user.id).maybeSingle(),
      ])
      await rescheduleAll(tasks ?? [], assignments ?? [], prefs ?? {})

      // Show in-app toast when a notification fires while the app is open
      removeListener = await addLocalNotificationListener((notification) => {
        console.log('[LocalNotification] received in foreground:', notification.title)
      })
    }

    setupLocalNotifications().catch(() => {})
    return () => removeListener()
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Capacitor OAuth callback — runs at root so it's always active regardless of route.
  // Handles both cold-start (app killed, URL scheme re-launches it) via getLaunchUrl()
  // and warm-start (app backgrounded, URL scheme foregrounds it) via appUrlOpen.
  useEffect(() => {
    if (!isCapacitor) return

    let removeListener = () => {}

    function dispatchOAuthError(message) {
      window.dispatchEvent(new CustomEvent('blutask-oauth-error', { detail: { message } }))
    }

    async function processOAuthUrl(url) {
      if (!url?.startsWith('com.blutask.app://')) return

      console.log('[OAuth] Raw callback URL:', url)

      // Signal Auth.jsx that a real callback arrived — distinguishes from user cancellation.
      markOAuthCallbackReceived()

      // iOS can deliver the URL with an extra layer of percent-encoding applied to
      // the entire string. Attempt one decode pass; keep the result only if it still
      // starts with our scheme (sanity check) and doesn't break the structure.
      let workingUrl = url
      try {
        const once = decodeURIComponent(url)
        if (once.startsWith('com.blutask.app://')) {
          workingUrl = once
          console.log('[OAuth] URL needed a decode pass:', workingUrl)
        }
      } catch { /* url is already clean */ }

      // Use the URL API for robust parameter extraction (replace custom scheme
      // temporarily — the URL constructor requires a known scheme).
      let queryParams = new URLSearchParams()
      let hashParams  = new URLSearchParams()
      try {
        const parsed = new URL(workingUrl.replace(/^com\.blutask\.app:\/\//, 'https://x.app/'))
        queryParams  = parsed.searchParams
        if (parsed.hash) hashParams = new URLSearchParams(parsed.hash.slice(1))
      } catch {
        // Fallback to manual splitting if URL API rejects the string
        const q = workingUrl.includes('?') ? workingUrl.split('?')[1]?.split('#')[0] ?? '' : ''
        const h = workingUrl.includes('#') ? workingUrl.split('#')[1] : ''
        queryParams = new URLSearchParams(q)
        hashParams  = new URLSearchParams(h)
      }

      console.log('[OAuth] Query params:', Object.fromEntries(queryParams.entries()))
      console.log('[OAuth] Hash params:',  Object.fromEntries(hashParams.entries()))

      const urlError = queryParams.get('error') || hashParams.get('error')
      if (urlError) {
        let desc = queryParams.get('error_description') || hashParams.get('error_description') || ''
        try { desc = decodeURIComponent(desc) } catch { /* already clean */ }
        console.log('[OAuth] Error in callback URL:', urlError, desc)
        dispatchOAuthError(desc || urlError)
        return
      }

      // ── Implicit flow ────────────────────────────────────────────────────
      if (hashParams.has('access_token')) {
        const access_token  = hashParams.get('access_token')
        const refresh_token = hashParams.get('refresh_token')
        console.log('[OAuth] Implicit flow — calling setSession()')
        const { data, error } = await supabase.auth.setSession({ access_token, refresh_token })
        if (error) {
          console.log('[OAuth] setSession failed:', error.message)
          dispatchOAuthError(error.message)
        } else {
          console.log('[OAuth] Signed in (implicit):', data?.user?.email)
          await syncOAuthSession()
        }
        return
      }

      // ── PKCE / auth-code flow ────────────────────────────────────────────
      const rawCode = queryParams.get('code') || hashParams.get('code')
      if (rawCode) {
        // URLSearchParams.get() already decodes %XX once. Apply a second pass to
        // handle any double-encoded characters (e.g. %253A → %3A → :).
        // Only accept the decoded result if it differs AND has no remaining % sequences.
        let code = rawCode
        try {
          const decoded = decodeURIComponent(rawCode)
          if (decoded !== rawCode) {
            console.log('[OAuth] Code required extra decode pass')
            code = decoded
          }
        } catch { /* rawCode is already clean */ }

        console.log('[OAuth] PKCE — raw code   :', rawCode)
        console.log('[OAuth] PKCE — clean code :', code)
        console.log('[OAuth] PKCE — lengths (raw/clean):', rawCode.length, '/', code.length)
        console.log('[OAuth] PKCE — exchange starting at:', new Date().toISOString())

        const { data, error } = await supabase.auth.exchangeCodeForSession(code)

        console.log('[OAuth] PKCE — exchange finished at:', new Date().toISOString())
        if (error) {
          console.log('[OAuth] exchangeCodeForSession FAILED')
          console.log('[OAuth]   message :', error.message)
          console.log('[OAuth]   status  :', error.status)
          console.log('[OAuth]   code    :', error.code)
          console.log('[OAuth]   details :', JSON.stringify(error))
          dispatchOAuthError(error.message)
        } else {
          console.log('[OAuth] Signed in (PKCE):', data?.user?.email)
          await syncOAuthSession()
        }
        return
      }

      console.log('[OAuth] No access_token or code found in callback URL')
      dispatchOAuthError('Authentication failed: unexpected callback format.')
    }

    ;(async () => {
      try {
        const { App: CapApp } = await import('@capacitor/app')

        // Cold-start: app was launched via the URL scheme after being killed.
        // getLaunchUrl() returns null when there is no launch URL.
        const launchResult = await CapApp.getLaunchUrl()
        console.log('[OAuth] getLaunchUrl result:', launchResult)
        const coldStartUrl = launchResult?.url ?? null
        if (coldStartUrl) {
          console.log('[OAuth] Cold-start launch URL:', coldStartUrl)
          await processOAuthUrl(coldStartUrl)
        }

        // Warm-start: app was foregrounded via the URL scheme.
        // On cold start Capacitor queues the appUrlOpen event and delivers it once
        // the listener is registered — which would process the same URL a second time
        // and cause Apple to reject the one-time-use authorization code.
        // Guard: skip any URL that was already handled via getLaunchUrl above.
        const handle = await CapApp.addListener('appUrlOpen', (data) => {
          console.log('[OAuth] appUrlOpen data:', data)
          const url = data?.url ?? null
          if (url && url !== coldStartUrl) processOAuthUrl(url)
        })
        removeListener = () => handle.remove()
        console.log('[OAuth] URL listener registered')
      } catch (err) {
        console.log('[OAuth] URL listener setup failed:', err?.message ?? err)
      }
    })()

    return () => removeListener()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Keep system theme in sync with OS preference changes
  useEffect(() => {
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e) => document.documentElement.classList.toggle('dark', e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])

  // Keep accent CSS var in sync
  useEffect(() => {
    document.documentElement.style.setProperty('--color-accent', accentColor)
  }, [accentColor])

  // Global keyboard shortcuts
  const handleKeyDown = useCallback((e) => {
    const tag = document.activeElement?.tagName
    const editable = document.activeElement?.isContentEditable
    const typing = tag === 'INPUT' || tag === 'TEXTAREA' || editable

    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault()
      setCmdOpen(o => !o)
      return
    }

    if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
      triggerUndo()
      return
    }

    if (e.key === 'Escape') {
      if (cmdOpen) { setCmdOpen(false); return }
      if (shortcutsOpen) { setShortcutsOpen(false); return }
      return
    }

    if (typing) return

    if (e.key === '?') {
      e.preventDefault()
      setShortcutsOpen(o => !o)
    }
  }, [cmdOpen, shortcutsOpen])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const { pathname } = useLocation()
  const isLanding = pathname === '/'

  return (
    <>
      <Toaster ref={toasterRef} defaultPosition="bottom-right" />
      <CommandPalette isOpen={cmdOpen} onClose={() => setCmdOpen(false)} />
      <ShortcutsModal isOpen={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />

      {/* ? button — bottom right corner, hidden on landing and in Capacitor */}
      {!isLanding && !isCapacitor && (
        <button
          onClick={() => setShortcutsOpen(true)}
          className="fixed bottom-4 right-4 z-50 w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600 hover:text-gray-700 dark:hover:text-gray-200 text-xs font-semibold transition-colors flex items-center justify-center shadow-sm"
          title="Keyboard shortcuts (?)"
        >
          ?
        </button>
      )}

      <Routes>
        {/* Landing */}
        <Route path="/" element={<LandingRoute />} />

        {/* Public — no auth check */}
        <Route path="/auth" element={<AuthRoute />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/shared/watch/:token" element={<SharedWatchlist />} />

        {/* Onboarding */}
        <Route
          path="/onboarding"
          element={
            <OnboardingRoute>
              <Onboarding />
            </OnboardingRoute>
          }
        />

        {/* Protected dashboard — all app routes under /home */}
        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route index element={<Home />} />
          <Route path="school" element={<School />} />
          <Route path="watch" element={<Watch />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="calendar" element={<Calendar />} />
          <Route path="sports" element={<Sports />} />
          <Route path="gym" element={<PageErrorBoundary><Gym /></PageErrorBoundary>} />
          <Route path="books" element={<Books />} />
          <Route path="settings" element={<Settings />} />
          <Route path="archive" element={<Archive />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
