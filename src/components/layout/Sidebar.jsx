import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  Home, GraduationCap, Clock, CheckSquare, Calendar,
  Sun, Moon, Settings, Archive, LogOut,
} from 'lucide-react'
import { isToday, isPast } from 'date-fns'
import { useAppStore } from '../../stores/useAppStore'
import { useAuthStore } from '../../stores/useAuthStore'
import { useTaskStore } from '../../stores/useTaskStore'
import { useSchoolStore } from '../../stores/useSchoolStore'
import { cn } from '../../lib/utils'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from '@/components/sidebar'

const BASE_NAV = [
  { to: '/home',          label: 'Home',     icon: Home,          accentHex: '#9ca3af' },
  { to: '/home/watch',    label: 'Watch',    icon: Clock,         accentHex: '#f59e0b' },
  { to: '/home/tasks',    label: 'Tasks',    icon: CheckSquare,   accentHex: '#14b8a6' },
  { to: '/home/calendar', label: 'Calendar', icon: Calendar,      accentHex: '#f43f5e' },
]

const SCHOOL_ITEM = { to: '/home/school', label: 'School', icon: GraduationCap, accentHex: '#6366f1' }

function NavBadge({ count, overdue }) {
  if (!count) return null
  return (
    <span
      className={`group-data-[collapsible=icon]:hidden ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white flex-shrink-0 leading-none ${
        overdue ? 'bg-rose-500' : 'bg-amber-400'
      }`}
    >
      {count}
    </span>
  )
}

function NavItem({ to, label, icon: Icon, accentHex, isActive, badge }) {
  return (
    <SidebarMenuItem className="relative">
      {isActive && (
        <div
          className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full z-10 pointer-events-none group-data-[collapsible=icon]:hidden"
          style={{ backgroundColor: accentHex }}
        />
      )}
      <SidebarMenuButton
        asChild
        isActive={isActive}
        tooltip={label}
        className={cn(
          'rounded-md transition-colors duration-150',
          'data-[active=true]:bg-transparent dark:data-[active=true]:bg-transparent',
          'hover:bg-gray-100/70 dark:hover:bg-white/[0.05]',
          isActive
            ? 'text-gray-900 dark:text-gray-100 font-medium data-[active=true]:text-gray-900 dark:data-[active=true]:text-gray-100'
            : 'text-gray-500 dark:text-gray-500 hover:text-gray-800 dark:hover:text-gray-300',
          'group-data-[collapsible=icon]:pl-2',
          'pl-5'
        )}
      >
        <NavLink to={to} className="flex items-center w-full">
          <Icon
            size={16}
            className="flex-shrink-0 hidden group-data-[collapsible=icon]:block"
            style={{ color: isActive ? accentHex : undefined }}
          />
          <span className="group-data-[collapsible=icon]:hidden flex-1">{label}</span>
          {badge && <NavBadge count={badge.count} overdue={badge.overdue} />}
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
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
  const taskBadge = {
    count: overdueTaskCount + todayTaskCount,
    overdue: overdueTaskCount > 0,
  }

  const activeAssignments = assignments.filter(a => !a.submitted && a.due_date)
  const overdueAsgCount = activeAssignments.filter(a =>
    isPast(new Date(a.due_date)) && !isToday(new Date(a.due_date))
  ).length
  const todayAsgCount = activeAssignments.filter(a => isToday(new Date(a.due_date))).length
  const schoolBadge = {
    count: overdueAsgCount + todayAsgCount,
    overdue: overdueAsgCount > 0,
  }

  return { taskBadge, schoolBadge }
}

function SidebarNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const { theme, toggleTheme } = useAppStore()
  const { user, profile, signOut } = useAuthStore()
  const { state } = useSidebar()
  const { taskBadge, schoolBadge } = useBadges()

  const collapsed = state === 'collapsed'
  const showSchool = profile?.show_school ?? true
  const showWatch = profile?.show_watch ?? true

  const baseItems = showWatch ? BASE_NAV : BASE_NAV.filter(i => i.to !== '/home/watch')
  const navItems = showSchool
    ? [baseItems[0], SCHOOL_ITEM, ...baseItems.slice(1)]
    : baseItems

  const isActive = (to) => {
    if (to === '/home') return location.pathname === '/home'
    return location.pathname.startsWith(to)
  }

  function getBadge(to) {
    if (to === '/home/tasks') return taskBadge.count > 0 ? taskBadge : null
    if (to === '/home/school') return schoolBadge.count > 0 ? schoolBadge : null
    return null
  }

  const archiveActive = location.pathname.startsWith('/home/archive')

  const firstName = profile?.display_name
    || profile?.full_name?.split(' ')[0]
    || user?.email?.split('@')[0]
    || ''

  return (
    <>
      {/* Logo */}
      <SidebarHeader className="h-[60px] flex items-center justify-center px-4 border-b border-sidebar-border flex-shrink-0">
        <span
          className={cn(
            'text-[17px] tracking-tight leading-none select-none transition-all duration-200',
            collapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'
          )}
        >
          <span className="font-bold" style={{ color: '#1a56db' }}>Blu</span>
          <span className="font-normal text-gray-700 dark:text-gray-200">Task</span>
        </span>
      </SidebarHeader>

      {/* Nav items */}
      <SidebarContent className="py-3 flex flex-col">
        <SidebarMenu className="px-2 space-y-0.5">
          {navItems.map((item) => (
            <NavItem
              key={item.to}
              {...item}
              isActive={isActive(item.to)}
              badge={getBadge(item.to)}
            />
          ))}
        </SidebarMenu>

        {/* Archive - secondary section */}
        <div className="px-2 mt-auto pt-3">
          <div className="border-t border-sidebar-border/40 pt-2">
            <SidebarMenuItem className="relative">
              {archiveActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full z-10 pointer-events-none bg-gray-400 dark:bg-gray-600 group-data-[collapsible=icon]:hidden" />
              )}
              <SidebarMenuButton
                asChild
                isActive={archiveActive}
                tooltip="Archive"
                className={cn(
                  'rounded-md transition-colors duration-150',
                  'data-[active=true]:bg-transparent dark:data-[active=true]:bg-transparent',
                  'hover:bg-gray-100/70 dark:hover:bg-white/[0.05]',
                  archiveActive
                    ? 'text-gray-600 dark:text-gray-400 font-medium'
                    : 'text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400',
                  'group-data-[collapsible=icon]:pl-2',
                  'pl-5'
                )}
              >
                <NavLink to="/home/archive" className="flex items-center w-full">
                  <Archive
                    size={14}
                    className="flex-shrink-0 hidden group-data-[collapsible=icon]:block"
                  />
                  <span className="group-data-[collapsible=icon]:hidden text-xs">Archive</span>
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </div>
        </div>
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="border-t border-sidebar-border py-3 px-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={toggleTheme}
              tooltip={theme === 'dark' ? 'Light mode' : 'Dark mode'}
              className="text-gray-500 dark:text-gray-500 hover:text-gray-800 dark:hover:text-gray-300 hover:bg-gray-100/70 dark:hover:bg-white/[0.05] rounded-md pl-5 group-data-[collapsible=icon]:pl-2"
            >
              {theme === 'dark'
                ? <Sun size={14} className="flex-shrink-0" />
                : <Moon size={14} className="flex-shrink-0" />
              }
              <span className="group-data-[collapsible=icon]:hidden">
                {theme === 'dark' ? 'Light mode' : 'Dark mode'}
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        {user && (
          <div className={cn(
            'pt-2 mt-1 border-t border-sidebar-border',
            collapsed ? 'flex justify-center' : 'space-y-1 px-1'
          )}>
            {/* Name + settings row */}
            <div className={cn('flex items-center', collapsed ? '' : 'justify-between')}>
              {!collapsed && firstName && (
                <span className="text-[13px] text-gray-600 dark:text-gray-500 font-medium truncate">
                  {firstName}
                </span>
              )}
              <button
                onClick={() => navigate('/home/settings')}
                className={cn(
                  'p-1.5 rounded-md transition-colors flex-shrink-0',
                  location.pathname === '/home/settings'
                    ? 'text-[color:var(--color-accent)]'
                    : 'text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400'
                )}
                title="Settings"
              >
                <Settings size={14} />
              </button>
            </div>

            {/* Sign out — hidden in collapsed mode */}
            {!collapsed && (
              <button
                onClick={() => signOut()}
                className="flex items-center gap-1.5 text-[11px] text-gray-400 dark:text-gray-600 hover:text-rose-500 dark:hover:text-rose-400 transition-colors w-full py-0.5"
              >
                <LogOut size={11} />
                Sign out
              </button>
            )}
          </div>
        )}
      </SidebarFooter>
    </>
  )
}

export default function AppSidebar() {
  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarNav />
      <SidebarRail />
    </Sidebar>
  )
}
