import { useState } from 'react'
import { User, Palette, Bell, Database, AlertTriangle, LayoutGrid, Info } from 'lucide-react'
import { cn } from '../../lib/utils'
import AccountSection from './AccountSection'
import AppearanceSection from './AppearanceSection'
import NotificationsSection from './NotificationsSection'
import DataSection from './DataSection'
import DangerSection from './DangerSection'
import SpacesSection from './SpacesSection'
import AboutSection from './AboutSection'

const SECTIONS = [
  { id: 'account',       label: 'Account',       icon: User,          component: AccountSection },
  { id: 'appearance',    label: 'Appearance',     icon: Palette,       component: AppearanceSection },
  { id: 'spaces',        label: 'Spaces',         icon: LayoutGrid,    component: SpacesSection },
  { id: 'notifications', label: 'Notifications',  icon: Bell,          component: NotificationsSection },
  { id: 'data',          label: 'Data',           icon: Database,      component: DataSection },
  { id: 'about',         label: 'About',          icon: Info,          component: AboutSection },
  { id: 'danger',        label: 'Danger Zone',    icon: AlertTriangle, component: DangerSection, danger: true },
]

export default function Settings() {
  const [active, setActive] = useState('account')
  const ActiveComponent = SECTIONS.find((s) => s.id === active)?.component

  return (
    <div className="max-w-[1200px] mx-auto w-full h-full flex flex-col">
      <div className="px-8 pt-8 pb-5 border-b border-gray-100 dark:border-gray-800/60 flex-shrink-0">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Section nav */}
        <div className="w-48 flex-shrink-0 border-r border-gray-100 dark:border-gray-800/60 px-3 py-4 space-y-0.5 overflow-y-auto">
          {SECTIONS.map(({ id, label, icon: Icon, danger }) => (
            <button
              key={id}
              onClick={() => setActive(id)}
              className={cn(
                'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors text-left',
                active === id
                  ? danger
                    ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                  : danger
                    ? 'text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/10'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-700 dark:hover:text-gray-300'
              )}
            >
              <Icon size={15} className="flex-shrink-0" />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-10 py-8 max-w-2xl">
          {ActiveComponent && <ActiveComponent />}
        </div>
      </div>
    </div>
  )
}
