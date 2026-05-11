import { useNavigate, useLocation } from 'react-router-dom'
import {
  Home, GraduationCap, Tv, CheckSquare, Calendar,
  Archive, Settings, Sun, Moon, LogOut, X, Search,
  Plus, Inbox, Star, Clock, Dumbbell, BookOpen, Trophy,
} from 'lucide-react'
import Avatar from '../ui/Avatar'
import { isToday, isPast, addDays, startOfDay } from 'date-fns'
import { useAppStore } from '../../stores/useAppStore'
import { useAuthStore } from '../../stores/useAuthStore'
import { useTaskStore } from '../../stores/useTaskStore'
import { useSchoolStore } from '../../stores/useSchoolStore'
import { useTagStore } from '../../stores/useTagStore'
import { useFolderStore } from '../../stores/useFolderStore'

const SPACE_COLORS = {
  '/home':          { hue: 240, dot: 'oklch(0.72 0.14 240)' },
  '/home/school':   { hue: 295, dot: 'oklch(0.72 0.14 295)' },
  '/home/tasks':    { hue: 150, dot: 'oklch(0.72 0.14 150)' },
  '/home/watch':    { hue: 350, dot: 'oklch(0.7 0.14 350)' },
  '/home/calendar': { hue: 65,  dot: 'oklch(0.74 0.14 65)' },
  '/home/sports':   { hue: 25,  dot: 'oklch(0.72 0.16 25)' },
  '/home/gym':      { hue: 320, dot: 'oklch(0.72 0.14 320)' },
  '/home/books':    { hue: 200, dot: 'oklch(0.72 0.12 200)' },
  '/home/archive':  { hue: 250, dot: 'oklch(0.55 0.04 250)' },
  '/home/settings': { hue: 250, dot: 'oklch(0.65 0.02 250)' },
}

function SpaceDot({ route, size = 8 }) {
  const color = SPACE_COLORS[route]?.dot || 'oklch(0.65 0.02 250)'
  return (
    <span style={{
      width: size, height: size, borderRadius: 999,
      background: color, display: 'inline-block', flexShrink: 0,
      boxShadow: '0 0 0 1px rgba(0,0,0,.3) inset'
    }} />
  )
}

function useBadges() {
  const { tasks } = useTaskStore()
  const { assignments } = useSchoolStore()

  const activeTasks = tasks.filter(t => !t.completed && t.due_date)
  const overdueTaskCount = activeTasks.filter(t =>
    isPast(new Date(t.due_date)) && !isToday(new Date(t.due_date))
  ).length
  const todayTaskCount = activeTasks.filter(t => isToday(new Date(t.due_date))).length

  const activeAssignments = assignments.filter(a => !a.submitted && a.due_date)
  const overdueAsgCount = activeAssignments.filter(a =>
    isPast(new Date(a.due_date)) && !isToday(new Date(a.due_date))
  ).length
  const todayAsgCount = activeAssignments.filter(a => isToday(new Date(a.due_date))).length

  return {
    tasks: overdueTaskCount + todayTaskCount,
    school: overdueAsgCount + todayAsgCount,
    tasksOverdue: overdueTaskCount > 0,
    schoolOverdue: overdueAsgCount > 0,
  }
}

const isMac = typeof navigator !== 'undefined' &&
  (/Mac/i.test(navigator.platform) || /Macintosh/i.test(navigator.userAgent))

export default function AppSidebar({ onClose }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { theme, toggleTheme } = useAppStore()
  const { user, profile, signOut } = useAuthStore()
  const { lists, tasks } = useTaskStore()
  const { tags } = useTagStore()
  const { folders } = useFolderStore()
  const badges = useBadges()

  const showSchool  = profile?.show_school  ?? true
  const showWatch   = profile?.show_watch   ?? true
  const showSports  = profile?.show_sports  ?? false
  const showGym     = profile?.show_gym     ?? false
  const showBooks   = profile?.show_books   ?? false

  function openCommandPalette() {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }))
  }

  const isActive = (path) => {
    if (path === '/home') return location.pathname === '/home'
    return location.pathname.startsWith(path)
  }

  const go = (path) => {
    navigate(path)
    onClose?.()
  }

  const firstName = profile?.display_name
    || profile?.full_name?.split(' ')[0]
    || user?.email?.split('@')[0]
    || ''

  const activeTasks = tasks.filter(t => !t.completed)
  const inboxCount = activeTasks.filter(t => !t.list_id).length
  const todayCount = activeTasks.filter(t => t.due_date && isToday(new Date(t.due_date))).length
  const upcomingCutoff = addDays(startOfDay(new Date()), 8)
  const upcomingCount = activeTasks.filter(t => {
    if (!t.due_date) return false
    const d = new Date(t.due_date)
    return !isPast(d) && !isToday(d) && d < upcomingCutoff
  }).length

  const SPACES = [
    { path: '/home',          label: 'Home',     badge: null },
    showSchool && { path: '/home/school',   label: 'School',   badge: badges.school || null },
    { path: '/home/tasks',    label: 'Tasks',    badge: badges.tasks || null },
    showWatch  && { path: '/home/watch',    label: 'Watch',    badge: null },
    { path: '/home/calendar', label: 'Calendar', badge: null },
    showSports && { path: '/home/sports',   label: 'Sports',   badge: null },
    showGym    && { path: '/home/gym',      label: 'Gym',      badge: null },
    showBooks  && { path: '/home/books',    label: 'Books',    badge: null },
  ].filter(Boolean)

  const QUICK = [
    { path: '/home/tasks?view=inbox', label: 'Inbox', icon: Inbox, count: inboxCount || null },
    { path: '/home/tasks?view=today', label: 'Today', icon: Star, count: todayCount || null },
    { path: '/home/tasks?view=upcoming', label: 'Upcoming', icon: Clock, count: upcomingCount || null },
  ]

  function isQuickActive(path) {
    const [p, q] = path.split('?')
    if (location.pathname !== p) return false
    return location.search === (q ? `?${q}` : '')
  }

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="brand">
        <div className="brand-mark">
          <span /><span /><span /><span />
        </div>
        <div className="brand-name">
          <span className="brand-blu">Blu</span>
          <span className="brand-task">Task</span>
        </div>
        <button className="icon-btn close-mobile" onClick={onClose} aria-label="Close menu">
          <X size={16} />
        </button>
      </div>

      {/* Search */}
      <div className="sb-search" onClick={openCommandPalette}>
        <span className="sb-search-icon"><Search size={14} /></span>
        <span className="sb-search-text">Search or jump…</span>
        <kbd>{isMac ? '⌘K' : 'Ctrl+K'}</kbd>
      </div>

      {/* Spaces */}
      <nav className="sb-spaces">
        <div className="nav-label">Spaces</div>
        {SPACES.map(({ path, label, badge }) => (
          <button
            key={path}
            className={`space-row${isActive(path) ? ' on' : ''}`}
            onClick={() => go(path)}
          >
            <SpaceDot route={path} size={9} />
            <span className="space-label">{label}</span>
            {badge != null && badge > 0 && (
              <span className="space-count">{badge}</span>
            )}
          </button>
        ))}
        <button
          className={`space-row${isActive('/home/archive') ? ' on' : ''}`}
          onClick={() => go('/home/archive')}
        >
          <SpaceDot route="/home/archive" size={9} />
          <span className="space-label">Archive</span>
        </button>
        <button
          className={`space-row${isActive('/home/settings') ? ' on' : ''}`}
          onClick={() => go('/home/settings')}
        >
          <SpaceDot route="/home/settings" size={9} />
          <span className="space-label">Settings</span>
        </button>
      </nav>

      <div className="sb-divider" />

      {/* Quick nav */}
      <div className="sb-section">
        <div className="nav-label">Quick</div>
        {QUICK.map(({ path, label, icon: Icon, count }) => (
          <button
            key={path}
            className={`quick-row${isQuickActive(path) ? ' on' : ''}`}
            onClick={() => go(path)}
          >
            <span className="quick-icon"><Icon size={14} /></span>
            <span>{label}</span>
            {count != null && count > 0 && (
              <span className="space-count">{count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Lists */}
      {lists.length > 0 && (
        <>
          <div className="sb-divider" />
          <div className="sb-section">
            <div className="nav-label-row">
              <div className="nav-label">Lists</div>
              <button className="nav-add" onClick={() => go('/home/tasks')} title="Manage lists">
                <Plus size={12} />
              </button>
            </div>
            {lists.slice(0, 8).map(list => {
              const count = activeTasks.filter(t => t.list_id === list.id).length
              return (
                <button
                  key={list.id}
                  className="quick-row"
                  onClick={() => go('/home/tasks')}
                >
                  <span style={{
                    width: 8, height: 8, borderRadius: 999,
                    background: list.color || 'var(--fg-4)', flexShrink: 0
                  }} />
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {list.name}
                  </span>
                  {count > 0 && <span className="space-count">{count}</span>}
                </button>
              )
            })}
          </div>
        </>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <>
          <div className="sb-divider" />
          <div className="sb-section">
            <div className="nav-label">Tags</div>
            <div className="tag-cloud">
              {tags.map(tag => {
                const c = tag.color || '#6366f1'
                return (
                  <button
                    key={tag.id}
                    className="tag-pill"
                    style={{ background: c + '28', color: c, borderColor: c + '55' }}
                    onClick={() => go(`/home/tasks?tag=${tag.id}`)}
                  >
                    <span style={{ width: 5, height: 5, background: c, borderRadius: 999, flexShrink: 0 }} />
                    {tag.name}
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}

      {/* Footer */}
      <div className="sb-foot">
        <Avatar profile={profile} email={user?.email} size="sm" />
        <div className="sb-foot-info">
          <div className="sb-foot-name">{firstName || 'Account'}</div>
          <button
            className="sb-foot-sub"
            style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer', textAlign: 'left' }}
            onClick={() => signOut()}
          >
            Sign out
          </button>
        </div>
        <div className="sb-foot-theme">
          <button
            className={theme === 'dark' ? 'on' : ''}
            onClick={() => {
              if (theme !== 'dark') toggleTheme()
            }}
            title="Dark"
          >
            <Moon size={12} />
          </button>
          <button
            className={theme !== 'dark' ? 'on' : ''}
            onClick={() => {
              if (theme === 'dark') toggleTheme()
            }}
            title="Light"
          >
            <Sun size={12} />
          </button>
        </div>
      </div>
    </aside>
  )
}
