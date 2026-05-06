import { create } from 'zustand'
import { persist } from 'zustand/middleware'

function applyTheme(theme) {
  if (theme === 'system') {
    const dark = window.matchMedia('(prefers-color-scheme: dark)').matches
    document.documentElement.classList.toggle('dark', dark)
  } else {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }
}

function applyAccent(hex) {
  document.documentElement.style.setProperty('--color-accent', hex)
}

export const useAppStore = create(
  persist(
    (set, get) => ({
      theme: 'light',
      accentColor: '#6366f1',
      notificationsEnabled: false,
      reminderAdvance: '1hour',
      sidebarCollapsed: false,

      setTheme: (theme) => {
        applyTheme(theme)
        set({ theme })
      },

      toggleTheme: () => {
        const next = get().theme === 'dark' ? 'light' : 'dark'
        applyTheme(next)
        set({ theme: next })
      },

      setAccentColor: (hex) => {
        applyAccent(hex)
        set({ accentColor: hex })
      },

      setNotificationsEnabled: (val) => set({ notificationsEnabled: val }),
      setReminderAdvance: (val) => set({ reminderAdvance: val }),
      setSidebarCollapsed: (val) => set({ sidebarCollapsed: val }),
    }),
    {
      name: 'blutask-app',
      onRehydrateStorage: () => (state) => {
        if (state?.theme) applyTheme(state.theme)
        if (state?.accentColor) applyAccent(state.accentColor)
      },
    }
  )
)
