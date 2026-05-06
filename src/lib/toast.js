import { createRef } from 'react'

// Module-level singleton ref — populated when <Toaster> mounts in App.jsx
export const toasterRef = createRef()

export function showToast({ message, title, variant = 'default', duration = 3000, actions } = {}) {
  toasterRef.current?.show({ message, title, variant, duration, actions, position: 'bottom-right' })
}
