import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  Home, GraduationCap, Clock, CheckSquare, Calendar,
  Sun, Moon, Settings,
} from 'lucide-react'
import { useAppStore } from '../../stores/useAppStore'
import { useAuthStore } from '../../stores/useAuthStore'
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

const navItems = [
  { to: '/',         label: 'Home',     icon: Home,          accentHex: '#9ca3af' },
  { to: '/school',   label: 'School',   icon: GraduationCap, accentHex: '#6366f1' },
  { to: '/watch',    label: 'Watch',    icon: Clock,         accentHex: '#f59e0b' },
  { to: '/tasks',    label: 'Tasks',    icon: CheckSquare,   accentHex: '#14b8a6' },
  { to: '/calendar', label: 'Calendar', icon: Calendar,      accentHex: '#f43f5e' },
]

function SidebarNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const { state } = useSidebar()
  const { theme, toggleTheme } = useAppStore()
  const { user, profile } = useAuthStore()

  const collapsed = state === 'collapsed'

  const isActive = (to) => {
    if (to === '/') return location.pathname === '/'
    return location.pathname.startsWith(to)
  }

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
      <SidebarContent className="py-3">
        <SidebarMenu className="px-2 space-y-0.5">
          {navItems.map(({ to, label, icon: Icon, accentHex }) => {
            const active = isActive(to)
            return (
              <SidebarMenuItem key={to} className="relative">
                {/* Left accent bar — expanded mode only */}
                {active && (
                  <div
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full z-10 pointer-events-none group-data-[collapsible=icon]:hidden"
                    style={{ backgroundColor: accentHex }}
                  />
                )}
                <SidebarMenuButton
                  asChild
                  isActive={active}
                  tooltip={label}
                  className={cn(
                    'rounded-md transition-colors duration-150',
                    'data-[active=true]:bg-transparent dark:data-[active=true]:bg-transparent',
                    'hover:bg-gray-100/70 dark:hover:bg-white/[0.05]',
                    active
                      ? 'text-gray-900 dark:text-gray-100 font-medium data-[active=true]:text-gray-900 dark:data-[active=true]:text-gray-100'
                      : 'text-gray-500 dark:text-gray-500 hover:text-gray-800 dark:hover:text-gray-300',
                    'group-data-[collapsible=icon]:pl-2',
                    'pl-5'
                  )}
                >
                  <NavLink to={to} className="flex items-center w-full">
                    {/* Icon — visible only in collapsed/icon mode */}
                    <Icon
                      size={16}
                      className="flex-shrink-0 hidden group-data-[collapsible=icon]:block"
                      style={{ color: active ? accentHex : undefined }}
                    />
                    {/* Label — hidden in collapsed/icon mode */}
                    <span className="group-data-[collapsible=icon]:hidden">{label}</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="border-t border-sidebar-border py-3 px-2">
        {/* Theme toggle */}
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

        {/* User row: first name + settings gear */}
        {user && (
          <div className={cn(
            'flex items-center pt-2 mt-1 border-t border-sidebar-border',
            collapsed ? 'justify-center' : 'justify-between px-1'
          )}>
            {!collapsed && firstName && (
              <span className="text-[13px] text-gray-600 dark:text-gray-500 font-medium truncate group-data-[collapsible=icon]:hidden">
                {firstName}
              </span>
            )}
            <button
              onClick={() => navigate('/settings')}
              className={cn(
                'p-1.5 rounded-md transition-colors flex-shrink-0',
                location.pathname === '/settings'
                  ? 'text-[color:var(--color-accent)]'
                  : 'text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400'
              )}
              title="Settings"
            >
              <Settings size={14} />
            </button>
          </div>
        )}
      </SidebarFooter>
    </>
  )
}

export default function AppSidebar() {
  return (
    <Sidebar
      collapsible="icon"
      className="border-r-0"
    >
      <SidebarNav />
      <SidebarRail />
    </Sidebar>
  )
}
