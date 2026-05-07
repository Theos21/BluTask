import { createRef } from 'react'

// Module-level singleton ref - populated when <Toaster> mounts in App.jsx
export const toasterRef = createRef()

// Last undo action registry — Cmd+Z triggers this
let _lastUndo = null
export function registerUndo(fn) { _lastUndo = fn }
export function triggerUndo() {
  if (_lastUndo) { _lastUndo(); _lastUndo = null }
}

export function showToast({ message, title, variant = 'default', duration = 3000, actions } = {}) {
  if (actions?.onClick) registerUndo(actions.onClick)
  toasterRef.current?.show({ message, title, variant, duration, actions, position: 'bottom-right' })
}
