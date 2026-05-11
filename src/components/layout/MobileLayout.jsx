import { useState, useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Home, GraduationCap, CheckSquare, Tv, Calendar,
  Archive, Settings, LogOut, Sun, Moon, ChevronRight,
} from 'lucide-react'
import { isToday, isPast } from 'date-fns'
import { useAppStore } from '../../stores/useAppStore'
import { useAuthStore } from '../../stores/useAuthStore'
import { useTaskStore } from '../../stores/useTaskStore'
import { useSchoolStore } from '../../stores/useSchoolStore'
import { useTagStore } from '../../stores/useTagStore'
import UpdaterBanner from '../UpdaterBanner'
import Avatar from '../ui/Avatar'

// ─── badge counts (mirrors Sidebar logic) ───────────────────────────────────
function useBadges() {
  const { tasks } = useTaskStore()
  const { assignments } = useSchoolStore()

  const activeTasks = tasks.filter(t => !t.completed && t.due_date)
  const overdueT = activeTasks.filter(t => isPast(new Date(t.due_date)) && !isToday(new Date(t.due_date))).length
  const todayT   = activeTasks.filter(t => isToday(new Date(t.due_date))).length

  const activeAsg = assignments.filter(a => !a.submitted && a.due_date)
  const overdueA  = activeAsg.filter(a => isPast(new Date(a.due_date)) && !isToday(new Date(a.due_date))).length
  const todayA    = activeAsg.filter(a => isToday(new Date(a.due_date))).length

  return {
    tasks:  overdueT + todayT,
    school: overdueA + todayA,
    tasksOverdue:  overdueT > 0,
    schoolOverdue: overdueA > 0,
  }
}

// ─── tab definition ──────────────────────────────────────────────────────────
function useTabs() {
  const { profile } = useAuthStore()
  const showSchool = profile?.show_school ?? true
  const showWatch  = profile?.show_watch  ?? true

  return [
    { path: '/home',          label: 'Home',     Icon: Home },
    showSchool && { path: '/home/school',   label: 'School',   Icon: GraduationCap },
    { path: '/home/tasks',    label: 'Tasks',    Icon: CheckSquare },
    showWatch  && { path: '/home/watch',    label: 'Watch',    Icon: Tv },
    { path: '/home/calendar', label: 'Calendar', Icon: Calendar },
  ].filter(Boolean)
}

// ─── small badge bubble ───────────────────────────────────────────────────────
function Badge({ count, danger }) {
  if (!count) return null
  return (
    <span className={`mob-badge${danger ? ' danger' : ''}`}>
      {count > 99 ? '99+' : count}
    </span>
  )
}

// ─── main layout ─────────────────────────────────────────────────────────────
export default function MobileLayout() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [sheetOpen, setSheetOpen] = useState(false)
  const { theme, toggleTheme } = useAppStore()
  const { profile, user, signOut } = useAuthStore()
  const { fetchTags, fetchTaskTags } = useTagStore()
  const badges = useBadges()
  const tabs   = useTabs()

  // Fetch tags globally (same as AppLayout does for sidebar)
  useEffect(() => {
    if (!user) return
    fetchTags(user.id)
    fetchTaskTags(user.id)
  }, [user])

  // Close sheet on route change
  useEffect(() => { setSheetOpen(false) }, [pathname])

  const displayName = profile?.full_name || profile?.display_name || user?.email || ''

  function isActive(path) {
    if (path === '/home') return pathname === '/home'
    return pathname.startsWith(path)
  }

  function go(path) {
    navigate(path)
    setSheetOpen(false)
  }

  function handleSignOut() {
    setSheetOpen(false)
    signOut()
  }

  return (
    <div className="mob-app">
      {/* ── Scrollable page content ──────────────────────────────────────── */}
      <div key={pathname} className="mob-content page-enter">
        <Outlet />
      </div>

      {/* ── Bottom tab bar ───────────────────────────────────────────────── */}
      <nav className="mob-tab-bar">
        {tabs.map(({ path, label, Icon }) => {
          const active = isActive(path)
          const badge  = path === '/home/tasks' ? badges.tasks
                       : path === '/home/school' ? badges.school
                       : null
          const danger = path === '/home/tasks' ? badges.tasksOverdue
                       : path === '/home/school' ? badges.schoolOverdue
                       : false
          return (
            <button
              key={path}
              className={`mob-tab${active ? ' active' : ''}`}
              onClick={() => navigate(path)}
            >
              <span className="mob-tab-icon-wrap">
                <Icon size={22} strokeWidth={active ? 2.5 : 1.75} />
                <Badge count={badge} danger={danger} />
              </span>
              <span className="mob-tab-label">{label}</span>
            </button>
          )
        })}

        {/* Profile / More */}
        <button
          className={`mob-tab${sheetOpen ? ' active' : ''}`}
          onClick={() => setSheetOpen(o => !o)}
        >
          <span className="mob-tab-icon-wrap">
            <Avatar profile={profile} email={user?.email} size="xs" />
          </span>
          <span className="mob-tab-label">More</span>
        </button>
      </nav>

      {/* ── Profile bottom sheet ─────────────────────────────────────────── */}
      {sheetOpen && (
        <>
          <div className="mob-scrim" onClick={() => setSheetOpen(false)} />
          <div className="mob-sheet">
            <div className="mob-sheet-handle" />

            {/* User info */}
            <div className="mob-sheet-user">
              <Avatar profile={profile} email={user?.email} size="lg" />
              <div className="mob-sheet-user-info">
                <div className="mob-sheet-name">{displayName}</div>
                {profile?.full_name && (
                  <div className="mob-sheet-email">{user?.email}</div>
                )}
              </div>
            </div>

            <div className="mob-sheet-divider" />

            {/* Navigation items */}
            <button className="mob-sheet-item" onClick={() => go('/home/archive')}>
              <Archive size={18} />
              <span>Archive</span>
              <ChevronRight size={14} className="mob-sheet-chevron" />
            </button>
            <button className="mob-sheet-item" onClick={() => go('/home/settings')}>
              <Settings size={18} />
              <span>Settings</span>
              <ChevronRight size={14} className="mob-sheet-chevron" />
            </button>

            <div className="mob-sheet-divider" />

            {/* Theme toggle */}
            <div className="mob-sheet-theme-row">
              <span className="mob-sheet-theme-label">Appearance</span>
              <div className="mob-theme-seg">
                <button
                  className={theme !== 'dark' ? 'on' : ''}
                  onClick={() => { if (theme === 'dark') toggleTheme() }}
                >
                  <Sun size={13} /> Light
                </button>
                <button
                  className={theme === 'dark' ? 'on' : ''}
                  onClick={() => { if (theme !== 'dark') toggleTheme() }}
                >
                  <Moon size={13} /> Dark
                </button>
              </div>
            </div>

            <div className="mob-sheet-divider" />

            <button className="mob-sheet-item danger" onClick={handleSignOut}>
              <LogOut size={18} />
              <span>Sign out</span>
            </button>
          </div>
        </>
      )}

      <UpdaterBanner />
    </div>
  )
}
