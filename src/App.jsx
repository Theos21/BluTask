import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/useAuthStore'
import { useAppStore } from './stores/useAppStore'
import AppLayout from './components/layout/AppLayout'
import Toaster from './components/toast'
import { toasterRef } from './lib/toast'
import Auth from './pages/Auth'
import Home from './pages/Home'
import School from './pages/School'
import Watch from './pages/Watch'
import Tasks from './pages/Tasks'
import Calendar from './pages/Calendar'
import Settings from './pages/Settings'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuthStore()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#fafbfc] dark:bg-[#0d1117]">
      <div className="w-6 h-6 border-2 border-gray-300 dark:border-gray-700 border-t-[color:var(--color-accent)] rounded-full animate-spin" />
    </div>
  )
  if (!user) return <Navigate to="/auth" replace />
  return children
}

function AuthRoute() {
  const { user, loading } = useAuthStore()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#fafbfc] dark:bg-[#0d1117]">
      <div className="w-6 h-6 border-2 border-gray-300 dark:border-gray-700 border-t-[color:var(--color-accent)] rounded-full animate-spin" />
    </div>
  )
  if (user) return <Navigate to="/" replace />
  return <Auth />
}

export default function App() {
  const { init } = useAuthStore()
  const { theme, accentColor } = useAppStore()

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

  return (
    <>
    <Toaster ref={toasterRef} defaultPosition="bottom-right" />
    <Routes>
      <Route path="/auth" element={<AuthRoute />} />
      <Route
        path="/"
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
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  )
}
