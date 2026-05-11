import { useState, useEffect } from 'react'
import { Plus, X, Share2, Check, Tv2 } from 'lucide-react'
import { format } from 'date-fns'
import { useWatchStore } from '../../stores/useWatchStore'
import { useAuthStore } from '../../stores/useAuthStore'
import { showToast } from '../../lib/toast'
import { isCapacitor } from '../../hooks/useMobileApp'
import AddShowModal from './AddShowModal'
import ConfirmDeleteModal from '../../components/ui/ConfirmDeleteModal'

const STATUS_CONFIG = {
  watching:      { label: 'Watching',  badge: 'rgba(22,163,74,.85)',   dot: 'bg-green-400' },
  paused:        { label: 'Paused',    badge: 'rgba(202,138,4,.85)',   dot: 'bg-yellow-400' },
  want_to_watch: { label: 'Queued',    badge: 'rgba(71,85,105,.85)',   dot: 'bg-gray-400 dark:bg-gray-500' },
  finished:      { label: 'Finished',  badge: 'rgba(37,99,235,.85)',   dot: 'bg-blue-400' },
  dropped:       { label: 'Dropped',   badge: 'rgba(220,38,38,.85)',   dot: 'bg-red-400' },
}

function getInitials(title) {
  return title.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}

function getProgress(show) {
  if (show.type !== 'show') return null
  if (show.status === 'want_to_watch') return null
  const eps = show.episodes_per_season
  if (!eps || !Array.isArray(eps) || eps.length === 0) return null
  if (eps.some((e) => e == null || e <= 0)) return null
  const total = eps.reduce((s, e) => s + e, 0)
  if (total === 0) return null
  if (show.status === 'finished') return { watched: total, total, percent: 100 }
  const currentSeason = Math.max(1, show.season || 1)
  const currentEpisode = Math.max(1, show.episode || 1)
  let watched = 0
  for (let i = 0; i < currentSeason - 1 && i < eps.length; i++) watched += eps[i]
  watched += Math.min(currentEpisode, eps[currentSeason - 1] ?? currentEpisode)
  return { watched: Math.min(watched, total), total, percent: Math.min(100, Math.round((watched / total) * 100)) }
}

function ShowCard({ show, onClick }) {
  const progress = getProgress(show)
  const statusCfg = STATUS_CONFIG[show.status]

  if (show.poster_url) {
    return (
      <div className="watch-card" onClick={onClick}>
        <div className="watch-poster" style={{ background: show.color || 'var(--bg-4)' }}>
          <img src={show.poster_url} alt={show.title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,.8) 0%, transparent 60%)' }} />
          <div className="watch-status" style={{ background: statusCfg?.badge }}>
            {statusCfg?.label || show.status}
          </div>
          <div style={{ position: 'absolute', bottom: 10, left: 10, right: 10 }}>
            <p style={{ color: 'white', fontSize: 12, fontWeight: 600, lineHeight: 1.3 }}>{show.title}</p>
            {show.type === 'show' && (
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,.6)', marginTop: 4, display: 'inline-block' }}>
                S{show.season} E{show.episode}
                {progress && ` · ${progress.percent}%`}
              </span>
            )}
          </div>
          {progress && (
            <div className="watch-progress">
              <div className="watch-progress-fill" style={{ width: `${progress.percent}%`, background: show.color }} />
            </div>
          )}
        </div>
        <div className="watch-info">
          <div className="watch-title">{show.title}</div>
          <div className="watch-sub">{statusCfg?.label || show.status}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="watch-card" onClick={onClick}>
      <div className="watch-poster" style={{ background: show.color || 'var(--bg-4)' }}>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 48, fontWeight: 800, color: 'rgba(255,255,255,0.18)' }}>
            {getInitials(show.title)}
          </span>
        </div>
        <div className="watch-status" style={{ background: statusCfg?.badge }}>
          {statusCfg?.label || show.status}
        </div>
        {progress && (
          <div className="watch-progress">
            <div className="watch-progress-fill" style={{ width: `${progress.percent}%`, background: show.color }} />
          </div>
        )}
      </div>
      <div className="watch-info">
        <div className="watch-title">{show.title}</div>
        <div className="watch-sub">
          {show.type === 'show'
            ? `S${show.season} E${show.episode} · ${statusCfg?.label}`
            : statusCfg?.label}
        </div>
      </div>
    </div>
  )
}

function SectionLabel({ label, count, onAdd }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <p className="section-label">{label}{count > 0 ? ` · ${count}` : ''}</p>
      {onAdd && (
        <button
          onClick={onAdd}
          className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
        >
          <Plus size={12} />
          Add
        </button>
      )}
    </div>
  )
}

const BTN = 'w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm font-bold text-gray-600 dark:text-gray-300 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed'

function DetailPanel({ show, onClose, onUpdate, onDelete }) {
  const [status, setStatus] = useState(show.status)
  const [notes, setNotes] = useState(show.notes || '')
  const [rating, setRating] = useState(show.rating || 0)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  useEffect(() => {
    setStatus(show.status)
    setNotes(show.notes || '')
    setRating(show.rating || 0)
  }, [show.id])

  const eps = show.episodes_per_season
  const currentSeason = show.season || 1
  const currentEpisode = show.episode || 1
  const currentSeasonEps = eps?.[currentSeason - 1] ?? null
  const atSeasonCap = currentSeasonEps !== null && currentEpisode >= currentSeasonEps
  const atFinalSeason = !!(show.total_seasons && currentSeason >= show.total_seasons)
  const progress = getProgress(show)

  async function handleSeason(delta) {
    const next = currentSeason + delta
    if (next < 1) return
    if (delta > 0 && atFinalSeason) return
    await onUpdate(show.id, { season: next, episode: 1 })
  }

  async function handleEpisode(delta) {
    if (delta < 0) {
      if (currentEpisode <= 1) return
      await onUpdate(show.id, { episode: currentEpisode - 1 })
      return
    }
    if (atSeasonCap) {
      if (atFinalSeason) {
        const now = new Date().toISOString()
        await onUpdate(show.id, { status: 'finished', finished_at: now })
        setStatus('finished')
        showToast({ message: `You finished ${show.title}! 🎉`, variant: 'success' })
      } else {
        await onUpdate(show.id, { season: currentSeason + 1, episode: 1 })
      }
    } else {
      await onUpdate(show.id, { episode: currentEpisode + 1 })
    }
  }

  async function handleStatusChange(newStatus) {
    setStatus(newStatus)
    const updates = { status: newStatus }
    if (newStatus === 'watching' && !show.started_at) updates.started_at = new Date().toISOString()
    if (newStatus === 'finished') updates.finished_at = new Date().toISOString()
    await onUpdate(show.id, updates)
  }

  async function handleSave() {
    setSaving(true)
    const { error } = await onUpdate(show.id, { notes, rating })
    setSaving(false)
    if (!error) showToast({ message: 'Changes saved', variant: 'success' })
  }

  async function handleMarkFinished() {
    await onUpdate(show.id, { status: 'finished', finished_at: new Date().toISOString() })
    setStatus('finished')
  }

  async function handleDelete() {
    await onDelete(show.id)
    onClose()
  }

  const showRating = show.type === 'movie' || show.status === 'finished' || status === 'finished'
  const statusOptions =
    show.type === 'movie'
      ? [
          { value: 'watching', label: 'Watching' },
          { value: 'want_to_watch', label: 'Want to Watch' },
          { value: 'finished', label: 'Watched' },
        ]
      : [
          { value: 'watching', label: 'Watching' },
          { value: 'paused', label: 'Paused' },
          { value: 'want_to_watch', label: 'Want to Watch' },
          { value: 'finished', label: 'Finished' },
          { value: 'dropped', label: 'Dropped' },
        ]

  return (
    <div className="watch-detail-panel">
      <div className="relative flex-shrink-0" style={{ backgroundColor: show.color, minHeight: 96 }}>
        {show.poster_url && (
          <img src={show.poster_url} alt={show.title} className="absolute inset-0 w-full h-full object-cover opacity-30" />
        )}
        <div className="relative px-5 py-5">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={15} />
          </button>
          <p className="text-white/50 text-[10px] font-semibold uppercase tracking-widest mb-1">
            {show.type === 'movie' ? 'Movie' : 'Show'}
          </p>
          <h2 className="text-white text-base font-bold leading-snug pr-6">{show.title}</h2>
          <div className="flex items-center gap-1.5 mt-2">
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_CONFIG[show.status]?.dot || 'bg-gray-400'}`} />
            <span className="text-white/60 text-xs">{STATUS_CONFIG[show.status]?.label || show.status}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 px-5 py-5 space-y-5">
        {show.type === 'show' && (
          <div>
            <p className="section-label mb-3">Episode</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Season</p>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleSeason(-1)} disabled={currentSeason <= 1} className={BTN}>−</button>
                  <span className="text-center text-sm font-semibold text-gray-800 dark:text-gray-200 min-w-[2.5rem]">
                    {currentSeason}
                    {show.total_seasons && <span className="text-[10px] font-normal text-gray-400 dark:text-gray-500">/{show.total_seasons}</span>}
                  </span>
                  <button onClick={() => handleSeason(1)} disabled={atFinalSeason} className={BTN}>+</button>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Episode</p>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleEpisode(-1)} disabled={currentEpisode <= 1} className={BTN}>−</button>
                  <span className="text-center text-sm font-semibold text-gray-800 dark:text-gray-200 min-w-[2.5rem]">
                    {currentEpisode}
                    {currentSeasonEps && <span className="text-[10px] font-normal text-gray-400 dark:text-gray-500">/{currentSeasonEps}</span>}
                  </span>
                  <button onClick={() => handleEpisode(1)} className={BTN}>+</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {show.type === 'show' && progress && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="section-label">Progress</p>
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">{progress.percent}%</span>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-2.5">
              Episode {progress.watched} of {progress.total}
              {show.total_seasons && ` · Season ${currentSeason} of ${show.total_seasons}`}
            </p>
            <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress.percent}%`, backgroundColor: show.color }} />
            </div>
          </div>
        )}

        {show.type === 'show' && !progress && show.status !== 'want_to_watch' && (
          <p className="text-xs text-gray-400 dark:text-gray-500 italic">
            S{currentSeason} E{currentEpisode} of ?
            {show.total_seasons ? ` · Season ${currentSeason} of ${show.total_seasons}` : ''}
          </p>
        )}

        {showRating && (
          <div>
            <p className="section-label mb-2">Rating</p>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n === rating ? 0 : n)}
                  className={`text-lg leading-none transition-colors ${n <= rating ? 'text-amber-400' : 'text-gray-200 dark:text-gray-700 hover:text-amber-300'}`}
                >
                  ●
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <p className="section-label mb-2">Status</p>
          <select value={status} onChange={(e) => handleStatusChange(e.target.value)} className="input-base">
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div>
          <p className="section-label mb-2">Notes</p>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Thoughts, recommendations..." rows={3} className="input-base resize-none" />
        </div>

        {(show.started_at || show.finished_at) && (
          <div className="space-y-1">
            {show.started_at && <p className="text-xs text-gray-400 dark:text-gray-500">Started {format(new Date(show.started_at), 'MMM d, yyyy')}</p>}
            {show.finished_at && <p className="text-xs text-gray-400 dark:text-gray-500">Finished {format(new Date(show.finished_at), 'MMM d, yyyy')}</p>}
          </div>
        )}

        <div className="space-y-2 pt-1">
          <button onClick={handleSave} disabled={saving} className="btn-primary w-full justify-center text-xs">
            {saving ? 'Saving...' : 'Save changes'}
          </button>
          {status !== 'finished' && (
            <button onClick={handleMarkFinished} className="w-full text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 py-2 rounded-lg transition-colors">
              Mark as finished
            </button>
          )}
          <button onClick={() => setDeleteConfirm(true)} className="w-full text-xs text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 py-2 rounded-lg transition-colors">
            Delete
          </button>
        </div>
      </div>
      <ConfirmDeleteModal
        isOpen={deleteConfirm}
        onClose={() => setDeleteConfirm(false)}
        onConfirm={handleDelete}
        title={`Delete "${show.title}"?`}
        description={`This will permanently remove it from your ${show.type === 'movie' ? 'movie' : 'show'} list. This cannot be undone.`}
        confirmLabel={`Delete ${show.type === 'movie' ? 'movie' : 'show'}`}
      />
    </div>
  )
}

export default function Watch() {
  const { user, profile, updateProfile } = useAuthStore()
  const { shows, fetchShows, updateShow, deleteShow } = useWatchStore()
  const [modalOpen, setModalOpen] = useState(false)
  const [modalDefault, setModalDefault] = useState({ type: 'show', status: 'watching' })
  const [selectedShow, setSelectedShow] = useState(null)
  const [copied, setCopied] = useState(false)
  const [generatingLink, setGeneratingLink] = useState(false)
  const [tab, setTab] = useState('watching') // 'watching' | 'queued' | 'finished'

  useEffect(() => {
    if (user) fetchShows(user.id)
  }, [user])

  useEffect(() => {
    if (selectedShow) {
      const updated = shows.find((s) => s.id === selectedShow.id)
      if (updated) setSelectedShow(updated)
    }
  }, [shows])

  function openAddModal(defaults) {
    setModalDefault(defaults)
    setModalOpen(true)
  }

  function toggleSelect(show) {
    setSelectedShow((prev) => (prev?.id === show.id ? null : show))
  }

  async function handleShare() {
    setGeneratingLink(true)
    let token = profile?.share_token
    if (!token) {
      token = crypto.randomUUID()
      await updateProfile({ share_token: token })
    }
    const shareOrigin = isCapacitor ? 'https://blutask.app' : window.location.origin
    const url = `${shareOrigin}/shared/watch/${token}`
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    setGeneratingLink(false)
    showToast({ message: 'Share link copied to clipboard!', variant: 'success' })
  }

  // Stats
  const inProgress = shows.filter((s) => ['watching', 'paused'].includes(s.status))
  const queued = shows.filter((s) => s.status === 'want_to_watch')
  const currentYear = new Date().getFullYear()
  const completedThisYear = shows.filter((s) =>
    ['finished', 'dropped'].includes(s.status) &&
    s.finished_at &&
    new Date(s.finished_at).getFullYear() === currentYear
  )

  // Tab items (all statuses for each tab)
  const allFinished = shows.filter((s) => ['finished', 'dropped'].includes(s.status))
  const tabItems = { watching: inProgress, queued, finished: allFinished }
  const currentTabItems = tabItems[tab]
  const tabTvShows = currentTabItems.filter((s) => s.type === 'show')
  const tabMovies = currentTabItems.filter((s) => s.type === 'movie')

  const defaultStatusForTab = { watching: 'watching', queued: 'want_to_watch', finished: 'finished' }

  const TABS = [
    { id: 'watching', label: 'Watching', count: inProgress.length },
    { id: 'queued',   label: 'Queued',   count: queued.length },
    { id: 'finished', label: 'Finished', count: allFinished.length },
  ]

  return (
    <div className="h-full flex overflow-hidden" style={{ maxWidth: 1200, margin: '0 auto', width: '100%' }}>
      <div className="flex-1 overflow-y-auto watch-content">

        {/* Page header */}
        <div className="page-head">
          <div>
            <div className="crumbs">
              <span style={{ width: 8, height: 8, borderRadius: 999, background: 'oklch(0.7 0.14 350)', display: 'inline-block' }} />
              <span>Watch</span>
            </div>
            <h1>Watch</h1>
            <div className="page-sub">
              <span><b>{inProgress.length}</b> in progress</span>
              <span className="sep" />
              <span><b>{queued.length}</b> queued</span>
              <span className="sep" />
              <span><b>{completedThisYear.length}</b> completed this year</span>
            </div>
          </div>
          <div className="page-head-right">
            <button
              onClick={handleShare}
              disabled={generatingLink || shows.length === 0}
              className="btn-ghost"
              style={{ opacity: shows.length === 0 ? 0.4 : 1 }}
            >
              {copied ? <Check size={13} /> : <Share2 size={13} />}
              {copied ? 'Copied!' : 'Share'}
            </button>
            <button
              onClick={() => openAddModal({ type: 'show', status: defaultStatusForTab[tab] })}
              className="btn-ghost"
            >
              <Plus size={14} />
              Add show
            </button>
            <button
              onClick={() => openAddModal({ type: 'movie', status: defaultStatusForTab[tab] })}
              className="btn-primary"
            >
              <Plus size={14} />
              Add movie
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="watch-tabs">
          <div className="seg">
            {TABS.map(({ id, label, count }) => (
              <button
                key={id}
                className={`seg-btn${tab === id ? ' on' : ''}`}
                onClick={() => setTab(id)}
              >
                {label}
                <span className="seg-count">{count}</span>
              </button>
            ))}
          </div>
        </div>

        {shows.length === 0 ? (
          <div className="ds-empty">
            <div className="ds-empty-mark"><Tv2 size={22} /></div>
            <div className="ds-empty-title">Your watchlist is empty</div>
            <div className="ds-empty-sub">Add shows and movies to track what you're watching.</div>
          </div>
        ) : currentTabItems.length === 0 ? (
          <div className="ds-empty" style={{ marginTop: 24 }}>
            <div className="ds-empty-mark"><Tv2 size={22} /></div>
            <div className="ds-empty-title">
              {tab === 'watching' ? 'Nothing in progress' : tab === 'queued' ? 'Queue is empty' : 'Nothing finished yet'}
            </div>
            <div className="ds-empty-sub">
              {tab === 'watching'
                ? 'Start watching something to see it here.'
                : tab === 'queued'
                ? 'Add shows or movies to your queue.'
                : 'Finish a show or movie to see it here.'}
            </div>
          </div>
        ) : (
          <>
            {/* Shows section */}
            {tabTvShows.length > 0 && (
              <div style={{ marginBottom: tabMovies.length > 0 ? 32 : 0 }}>
                <div className="group-head" style={{ marginBottom: 16 }}>
                  <h3>Shows</h3>
                  <span className="group-count">{tabTvShows.length}</span>
                  <div className="group-rule" />
                  <button
                    className="icon-btn ghost"
                    onClick={() => openAddModal({ type: 'show', status: defaultStatusForTab[tab] })}
                    title="Add show"
                  >
                    <Plus size={14} />
                  </button>
                </div>
                <div className="watch-grid">
                  {tabTvShows.map((show) => (
                    <ShowCard key={show.id} show={show} onClick={() => toggleSelect(show)} />
                  ))}
                </div>
              </div>
            )}

            {/* Movies section */}
            {tabMovies.length > 0 && (
              <div>
                <div className="group-head" style={{ marginBottom: 16, marginTop: tabTvShows.length > 0 ? 8 : 0 }}>
                  <h3>Movies</h3>
                  <span className="group-count">{tabMovies.length}</span>
                  <div className="group-rule" />
                  <button
                    className="icon-btn ghost"
                    onClick={() => openAddModal({ type: 'movie', status: defaultStatusForTab[tab] })}
                    title="Add movie"
                  >
                    <Plus size={14} />
                  </button>
                </div>
                <div className="watch-grid">
                  {tabMovies.map((show) => (
                    <ShowCard key={show.id} show={show} onClick={() => toggleSelect(show)} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {selectedShow && (
        <>
          <div className="watch-panel-scrim" onClick={() => setSelectedShow(null)} />
          <DetailPanel
            show={selectedShow}
            onClose={() => setSelectedShow(null)}
            onUpdate={updateShow}
            onDelete={deleteShow}
          />
        </>
      )}

      <AddShowModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        defaults={modalDefault}
      />
    </div>
  )
}
