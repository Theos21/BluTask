// Tracks whether a valid OAuth callback URL was received from iOS (appUrlOpen).
// Used by Auth.jsx's appStateChange handler to distinguish:
//   - callback received (exchange in progress) → don't show cancellation error
//   - no callback (user cancelled in Safari)   → show cancellation error
let _received = false

export const markOAuthCallbackReceived = () => { _received = true }

// Returns and resets the flag atomically so the next auth attempt starts clean.
export const takeOAuthCallbackReceived = () => {
  const v = _received
  _received = false
  return v
}
