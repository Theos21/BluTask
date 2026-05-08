/* global __APP_VERSION__ */
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { X, ExternalLink } from 'lucide-react'

// Injected by Vite at build time from src-tauri/tauri.conf.json
const VERSION = __APP_VERSION__

const CHANGELOG = [
  {
    version: '1.0.1',
    date: 'May 2025',
    changes: [
      'Added landing page for web users',
      'Added Google sign-in',
      'Windows desktop app with built-in auto-updater',
      'Watch space can now be disabled in Settings',
      'Added confirmation dialogs before destructive deletes',
      'Home: right column stacks on small screens',
      'Calendar: week view scrolls horizontally on mobile, day detail opens as bottom sheet',
      'Fixed password reset links on non-localhost domains',
      'Fixed Watch section divider alignment',
      'Desktop app goes directly to login instead of the landing page',
    ],
  },
  {
    version: '1.0.0',
    date: 'May 2025',
    changes: [
      'Initial release with Tasks, School, Calendar, Watch, and Home',
      'Onboarding flow with space selection',
      'Command palette (Cmd+K)',
      'Keyboard shortcuts panel',
      'Smart import for tasks and assignments',
      'Dark and light mode with accent color picker',
      'Sidebar badges for due and overdue items',
      'Sort and filter in task lists',
      'Markdown notes with preview',
      'Study mode with Pomodoro timer',
    ],
  },
]

function ChangelogModal({ onClose }) {
  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60" />
      <div className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Changelog</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">What's new in BluTask</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X size={15} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
          {CHANGELOG.map(entry => (
            <div key={entry.version}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-bold text-gray-900 dark:text-gray-100">v{entry.version}</span>
                <span className="text-[11px] text-gray-400 dark:text-gray-500">{entry.date}</span>
                {entry.version === VERSION && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 font-medium">
                    Current
                  </span>
                )}
              </div>
              <ul className="space-y-1.5">
                {entry.changes.map((c, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
                    <span className="mt-1.5 w-1 h-1 rounded-full bg-teal-400 dark:bg-teal-500 flex-shrink-0" />
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body
  )
}


export default function AboutSection() {
  const [changelogOpen, setChangelogOpen] = useState(false)

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">About</h2>
        <p className="text-xs text-gray-400 dark:text-gray-500">App info and release notes.</p>
      </div>

      {/* App identity */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
          <span className="text-xl font-bold" style={{ color: '#1a56db' }}>B</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            <span style={{ color: '#1a56db' }}>Blu</span>Task
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Version {VERSION}</p>
          <button
            onClick={() => setChangelogOpen(true)}
            className="mt-1 text-xs text-[color:var(--color-accent)] hover:underline transition-colors"
          >
            What's new →
          </button>
        </div>
      </div>

      {/* Info rows */}
      <div className="space-y-3">
        <div className="flex items-center justify-between py-3 border-t border-gray-100 dark:border-gray-800">
          <span className="text-xs text-gray-600 dark:text-gray-400">Version</span>
          <span className="text-xs font-medium text-gray-900 dark:text-gray-100">{VERSION}</span>
        </div>
        <div className="flex items-center justify-between py-3 border-t border-gray-100 dark:border-gray-800">
          <span className="text-xs text-gray-600 dark:text-gray-400">Built with</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">React + Supabase + Tailwind</span>
        </div>
        <div className="flex items-center justify-between py-3 border-t border-gray-100 dark:border-gray-800">
          <span className="text-xs text-gray-600 dark:text-gray-400">Release notes</span>
          <button
            onClick={() => setChangelogOpen(true)}
            className="text-xs text-[color:var(--color-accent)] hover:underline flex items-center gap-1"
          >
            View changelog <ExternalLink size={10} />
          </button>
        </div>
      </div>

      {changelogOpen && <ChangelogModal onClose={() => setChangelogOpen(false)} />}
    </div>
  )
}
