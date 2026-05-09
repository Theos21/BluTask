import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Menu, Sun, Moon } from 'lucide-react'
import AppSidebar from './Sidebar'
import UpdaterBanner from '../UpdaterBanner'
import { useAppStore } from '../../stores/useAppStore'
import { useAuthStore } from '../../stores/useAuthStore'
import { useTagStore } from '../../stores/useTagStore'

export default function AppLayout() {
  const { pathname } = useLocation()
  const { theme, toggleTheme } = useAppStore()
  const [mobileOpen, setMobileOpen] = useState(false)
  const { user } = useAuthStore()
  const { fetchTags, fetchTaskTags } = useTagStore()

  // Fetch tags globally so the sidebar always has tag data regardless of which page is active
  useEffect(() => {
    if (!user) return
    fetchTags(user.id)
    fetchTaskTags(user.id)
  }, [user])

  return (
    <div className="app">
      {/* Mobile top bar — hidden on 860px+ */}
      <div className="mobile-bar">
        <button className="icon-btn" onClick={() => setMobileOpen(true)} aria-label="Open menu">
          <Menu size={18} />
        </button>
        <div className="mobile-brand">
          <span className="brand-name sm">
            <span className="brand-blu">Blu</span>
            <span className="brand-task">Task</span>
          </span>
        </div>
        <button className="icon-btn" onClick={toggleTheme} aria-label="Toggle theme">
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>

      <div className={`shell${mobileOpen ? ' mobile-open' : ''}`}>
        <AppSidebar onClose={() => setMobileOpen(false)} />
        {mobileOpen && (
          <div className="mobile-scrim" onClick={() => setMobileOpen(false)} />
        )}
        <div key={pathname} className="content page-enter">
          <Outlet />
        </div>
      </div>

      <UpdaterBanner />
    </div>
  )
}
