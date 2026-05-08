import { useEffect, useState, useCallback } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from './stores/useAuthStore'
import { useAppStore } from './stores/useAppStore'
import AppLayout from './components/layout/AppLayout'
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

function LandingRoute() {
  const { user, loading } = useAuthStore()
  if (loading) return <Spinner />
  if (user) return <Navigate to="/home" replace />
  if (isTauri) return <Navigate to="/auth" replace />
  return <Landing />
}

export default function App() {
  const { init } = useAuthStore()
  const { theme, accentColor } = useAppStore()
  const [cmdOpen, setCmdOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)

  useEffect(() => { init() }, [])

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

      {/* ? button — bottom right corner, hidden on landing */}
      {!isLanding && (
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
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Home />} />
          <Route path="school" element={<School />} />
          <Route path="watch" element={<Watch />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="calendar" element={<Calendar />} />
          <Route path="settings" element={<Settings />} />
          <Route path="archive" element={<Archive />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
