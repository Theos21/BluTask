import { useEffect, useState } from 'react'
import { checkForUpdate, doRelaunch } from '../lib/updater'

export default function UpdaterBanner() {
  const [update, setUpdate] = useState(null)
  const [status, setStatus] = useState('idle') // idle | downloading | ready
  const [progress, setProgress] = useState(0)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Only run inside Tauri desktop app
    if (!window.__TAURI_INTERNALS__) return

    const timer = setTimeout(async () => {
      try {
        const u = await checkForUpdate()
        if (u?.available) setUpdate(u)
      } catch {
        // silent — auto-check failures are not surfaced to the user
      }
    }, 3000)

    return () => clearTimeout(timer)
  }, [])

  async function handleUpdate() {
    if (!update) return
    setStatus('downloading')
    setProgress(0)

    let downloaded = 0
    let total = 0

    await update.downloadAndInstall((event) => {
      if (event.event === 'Started') {
        total = event.data.contentLength ?? 0
      } else if (event.event === 'Progress') {
        downloaded += event.data.chunkLength
        if (total > 0) setProgress(Math.round((downloaded / total) * 100))
      } else if (event.event === 'Finished') {
        setStatus('ready')
      }
    })

    await doRelaunch()
  }

  if (!update || dismissed) return null

  return (
    <div className="fixed bottom-5 right-5 z-50 w-80 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-xl p-4 flex flex-col gap-3">
      <div>
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Update available — v{update.version}
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
          A new version of BluTask is ready to install.
        </p>
      </div>

      {status === 'downloading' && (
        <div className="space-y-1">
          <div className="w-full h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-blue-500 transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 text-right">
            {progress > 0 ? `${progress}%` : 'Starting…'}
          </p>
        </div>
      )}

      {status === 'ready' && (
        <p className="text-xs text-teal-600 dark:text-teal-400 font-medium">
          Update installed — restarting…
        </p>
      )}

      {status === 'idle' && (
        <div className="flex gap-2">
          <button
            onClick={() => setDismissed(true)}
            className="flex-1 btn-ghost text-xs py-1.5 justify-center"
          >
            Later
          </button>
          <button
            onClick={handleUpdate}
            className="flex-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors"
          >
            Update now
          </button>
        </div>
      )}
    </div>
  )
}
