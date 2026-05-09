import { useState } from 'react'
import AccountSection from './AccountSection'
import AppearanceSection from './AppearanceSection'
import NotificationsSection from './NotificationsSection'
import DataSection from './DataSection'
import DangerSection from './DangerSection'
import SpacesSection from './SpacesSection'
import AboutSection from './AboutSection'

const SECTIONS = [
  { id: 'account',       label: 'Account',       component: AccountSection },
  { id: 'appearance',    label: 'Appearance',     component: AppearanceSection },
  { id: 'spaces',        label: 'Spaces',         component: SpacesSection },
  { id: 'notifications', label: 'Notifications',  component: NotificationsSection },
  { id: 'data',          label: 'Data',           component: DataSection },
  { id: 'about',         label: 'About',          component: AboutSection },
  { id: 'danger',        label: 'Danger Zone',    component: DangerSection, danger: true },
]

export default function Settings() {
  const [active, setActive] = useState('account')
  const ActiveComponent = SECTIONS.find(s => s.id === active)?.component

  return (
    <div className="page" style={{ maxWidth: 1100, paddingBottom: 60 }}>
      <div className="page-head" style={{ marginBottom: 28 }}>
        <div>
          <div className="crumbs">
            <span style={{ width: 8, height: 8, borderRadius: 999, background: 'oklch(0.65 0.02 250)', display: 'inline-block' }} />
            <span>Settings</span>
          </div>
          <h1>Settings</h1>
        </div>
      </div>

      <div className="settings-shell">
        {/* Nav */}
        <nav className="settings-nav">
          {SECTIONS.map(({ id, label, danger }) => (
            <button
              key={id}
              onClick={() => setActive(id)}
              className={`${active === id ? 'on' : ''}`}
              style={danger ? { color: active === id ? 'var(--due-over)' : 'oklch(0.72 0.16 25)' } : undefined}
            >
              {label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div>
          {ActiveComponent && <ActiveComponent />}
        </div>
      </div>
    </div>
  )
}
