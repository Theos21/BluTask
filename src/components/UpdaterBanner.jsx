/* global __APP_VERSION__ */
import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

const CURRENT_VERSION = __APP_VERSION__
const RELEASES_PAGE = 'https://github.com/Theos21/BluTask/releases/latest'
const API_URL = 'https://api.github.com/repos/Theos21/BluTask/releases/latest'
const STORAGE_KEY = 'blutask_update_check'
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000

export function isNewer(latest, current) {
  const parse = v => v.replace(/^v/, '').split('.').map(Number)
  const [la, lb, lc] = parse(latest)
  const [ca, cb, cc] = parse(current)
  if (la !== ca) return la > ca
  if (lb !== cb) return lb > cb
  return lc > cc
}

export async function runUpdateCheck({ force = false } = {}) {
  const isTauri = !!(window.__TAURI_INTERNALS__ || window.__TAURI__)
  if (!isTauri) return { skipped: true }

  let stored = {}
  try { stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') } catch { /* ignore */ }

  const alreadyDismissed = stored.dismissedVersion && stored.latestVersion &&
    stored.dismissedVersion === stored.latestVersion
  const cacheStillFresh = stored.checkedAt && Date.now() - stored.checkedAt < CHECK_INTERVAL_MS

  if (!force && cacheStillFresh && stored.latestVersion) {
    if (!alreadyDismissed && isNewer(stored.latestVersion, CURRENT_VERSION)) {
      return { available: true, version: stored.latestVersion, fromCache: true }
    }
    return { available: false, fromCache: true }
  }

  try {
    const response = await fetch(API_URL, { headers: { Accept: 'application/vnd.github+json' } })
    const data = await response.json()
    const latest = (data.tag_name ?? '').replace(/^v/, '')
    if (!latest) return { available: false }

    const updated = { ...stored, checkedAt: Date.now(), latestVersion: latest }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))

    if (isNewer(latest, CURRENT_VERSION)) {
      const wasDismissed = stored.dismissedVersion === latest
      return { available: true, version: latest, dismissed: wasDismissed }
    }
    return { available: false }
  } catch {
    return { available: false }
  }
}

// phase: null | 'available' | 'downloading' | 'installing' | 'done' | 'error'
export default function UpdaterBanner() {
  const [phase, setPhase] = useState(null)
  const [version, setVersion] = useState(null)
  const [updateObj, setUpdateObj] = useState(null)
  const [errorMsg, setErrorMsg] = useState(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const isTauri = !!(window.__TAURI_INTERNALS__ || window.__TAURI__)
    if (!isTauri) return

    ;(async () => {
      // Prefer the Tauri plugin — it gives us an installable update object
      try {
        const { check } = await import('@tauri-apps/plugin-updater')
        const update = await check()
        if (update) {
          let stored = {}
          try { stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') } catch { /* ignore */ }
          if (stored.dismissedVersion === update.version) return
          setUpdateObj(update)
          setVersion(update.version)
          setPhase('available')
          return
        }
      } catch { /* plugin unavailable, fall through */ }

      // GitHub API fallback — detection only, no in-app install
      const result = await runUpdateCheck()
      if (result?.available && !result?.dismissed) {
        setVersion(result.version)
        setPhase('available')
      }
    })()
  }, [])

  function dismiss() {
    setDismissed(true)
    if (version) {
      try {
        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...stored, dismissedVersion: version }))
      } catch { /* ignore */ }
    }
  }

  async function handleInstall() {
    if (!updateObj) {
      // No installable update object — open releases page as fallback
      window.open(RELEASES_PAGE, '_blank')
      dismiss()
      return
    }

    try {
      setPhase('downloading')
      setErrorMsg(null)
      await updateObj.downloadAndInstall((event) => {
        if (event.event === 'Finished') setPhase('installing')
      })
      setPhase('done')
    } catch (err) {
      const msg = err?.message || String(err) || 'Unknown error'
      setErrorMsg(msg)
      setPhase('error')
    }
  }

  async function handleRestart() {
    try {
      const { relaunch } = await import('@tauri-apps/plugin-process')
      await relaunch()
    } catch {
      setErrorMsg('Please close and reopen BluTask to apply the update.')
      setPhase('error')
    }
  }

  if (dismissed || phase === null) return null

  return (
    <div className="fixed bottom-5 right-5 z-50 w-80 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-xl p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {phase === 'done'
              ? 'Update ready to apply'
              : phase === 'error'
              ? 'Update failed'
              : `BluTask v${version} available`}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            {phase === 'available' && (updateObj ? 'A new version is ready to install in the background.' : 'Download the latest version from the releases page.')}
            {phase === 'downloading' && 'Downloading update…'}
            {phase === 'installing' && 'Installing update…'}
            {phase === 'done' && 'Restart BluTask to finish applying the update.'}
            {phase === 'error' && (errorMsg || 'Something went wrong during the update.')}
          </p>
        </div>
        {(phase === 'available' || phase === 'error') && (
          <button
            onClick={dismiss}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0 mt-0.5"
          >
            <X size={14} />
          </button>
        )}
      </div>

      <div className="flex gap-2">
        {phase === 'available' && (
          <>
            <button onClick={dismiss} className="flex-1 btn-ghost text-xs py-1.5 justify-center">
              Later
            </button>
            <button
              onClick={handleInstall}
              className="flex-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors"
            >
              {updateObj ? 'Install update' : 'Download'}
            </button>
          </>
        )}

        {(phase === 'downloading' || phase === 'installing') && (
          <div className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-600/10 text-blue-600 dark:text-blue-400 text-xs font-medium">
            <svg className="animate-spin w-3 h-3 flex-shrink-0" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            {phase === 'downloading' ? 'Downloading…' : 'Installing…'}
          </div>
        )}

        {phase === 'done' && (
          <button
            onClick={handleRestart}
            className="flex-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors"
          >
            Restart now
          </button>
        )}

        {phase === 'error' && (
          <>
            <button onClick={dismiss} className="flex-1 btn-ghost text-xs py-1.5 justify-center">
              Dismiss
            </button>
            <a
              href={RELEASES_PAGE}
              target="_blank"
              rel="noopener noreferrer"
              onClick={dismiss}
              className="flex-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors text-center"
            >
              Download manually
            </a>
          </>
        )}
      </div>
    </div>
  )
}
