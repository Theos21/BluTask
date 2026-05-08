// Shared helpers used by both the auto-check banner and the manual Settings button.
// Dynamic imports keep the Tauri plugins out of the web bundle entirely.

export async function checkForUpdate() {
  const { check } = await import('@tauri-apps/plugin-updater')
  return check() // throws on network / plugin error; returns { available, version, … }
}

export async function doRelaunch() {
  try {
    const { restart } = await import('@tauri-apps/plugin-process')
    await restart()
  } catch {
    window.location.reload()
  }
}
