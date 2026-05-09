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

export default function UpdaterBanner() {
  const [latestVersion, setLatestVersion] = useState(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    runUpdateCheck().then(result => {
      if (result?.available && !result?.dismissed) {
        setLatestVersion(result.version)
      }
    })
  }, [])

  function handleDismiss() {
    setDismissed(true)
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...stored, dismissedVersion: latestVersion }))
    } catch { /* ignore */ }
  }

  if (!latestVersion || dismissed) return null

  return (
    <div className="fixed bottom-5 right-5 z-50 w-80 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-xl p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            BluTask v{latestVersion} is available
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            Download the latest version to get new features and fixes.
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0 mt-0.5"
        >
          <X size={14} />
        </button>
      </div>
      <div className="flex gap-2">
        <button onClick={handleDismiss} className="flex-1 btn-ghost text-xs py-1.5 justify-center">
          Later
        </button>
        <button
          onClick={() => window.open(RELEASES_PAGE, '_blank')}
          className="flex-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors"
        >
          Download
        </button>
      </div>
    </div>
  )
}
