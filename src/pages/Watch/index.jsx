import { useState, useEffect } from 'react'
import { Plus, ChevronDown, ChevronUp, X, Tv2, Share2, Copy, Check } from 'lucide-react'
import { format } from 'date-fns'
import { useWatchStore } from '../../stores/useWatchStore'
import { useAuthStore } from '../../stores/useAuthStore'
import { showToast } from '../../lib/toast'
import AddShowModal from './AddShowModal'
import ConfirmDeleteModal from '../../components/ui/ConfirmDeleteModal'

const STATUS_CONFIG = {
  watching:      { label: 'Watching',      dot: 'bg-green-400' },
  paused:        { label: 'Paused',        dot: 'bg-yellow-400' },
  want_to_watch: { label: 'Want to Watch', dot: 'bg-gray-400 dark:bg-gray-500' },
  finished:      { label: 'Finished',      dot: 'bg-blue-400' },
  dropped:       { label: 'Dropped',       dot: 'bg-red-400' },
}

const CARD_W = 180
const CARD_H = 260

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

function ProgressBar({ percent, color, isPoster }) {
  return (
    <div
      className="absolute bottom-0 left-0 right-0 h-0.5"
      style={{ backgroundColor: isPoster ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.07)' }}
    >
      <div
        className="h-full transition-all duration-500"
        style={{ width: `${percent}%`, backgroundColor: isPoster ? 'rgba(255,255,255,0.75)' : color }}
      />
    </div>
  )
}

function ShowCard({ show, onClick }) {
  const isWatchable = show.status === 'watching' || show.status === 'paused'
  const progress = getProgress(show)

  if (show.poster_url) {
    return (
      <div
        className="watch-card group relative rounded-2xl overflow-hidden cursor-pointer flex-shrink-0 transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/25"
        style={{ width: CARD_W, height: CARD_H }}
        onClick={onClick}
      >
        <img src={show.poster_url} alt={show.title} className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
        {isWatchable && (
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 flex items-center justify-center">
            <span className="text-white text-xs font-semibold px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-sm">
              {show.status === 'paused' ? 'Resume' : 'Continue'}
            </span>
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 px-3 py-3">
          <p className="text-white text-xs font-semibold leading-snug line-clamp-2">{show.title}</p>
          {show.type === 'show' && (
            <span className="inline-block mt-1.5 text-[10px] text-white/60 bg-white/10 px-1.5 py-0.5 rounded-full leading-none">
              S{show.season} E{show.episode}
              {progress && <span className="text-white/40"> · {progress.percent}%</span>}
            </span>
          )}
          {show.type === 'movie' && show.status === 'finished' && show.rating > 0 && (
            <div className="flex gap-0.5 mt-1.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <span key={n} className="text-[10px]" style={{ color: n <= show.rating ? '#fbbf24' : 'rgba(255,255,255,0.3)' }}>●</span>
              ))}
            </div>
          )}
        </div>
        <div className={`absolute top-2.5 right-2.5 w-2 h-2 rounded-full ${STATUS_CONFIG[show.status]?.dot || 'bg-gray-400'}`} />
        {progress && <ProgressBar percent={progress.percent} color={show.color} isPoster />}
      </div>
    )
  }

  return (
    <div
      className="watch-card group relative rounded-2xl overflow-hidden cursor-pointer flex-shrink-0 transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/25"
      style={{ width: CARD_W, height: CARD_H }}
      onClick={onClick}
    >
      <div className="relative" style={{ height: '65%', backgroundColor: show.color }}>
        <div className="absolute inset-0 flex items-center justify-center select-none">
          <span className="text-6xl font-extrabold" style={{ color: 'rgba(255,255,255,0.2)' }}>
            {getInitials(show.title)}
          </span>
        </div>
        {isWatchable && (
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 flex items-center justify-center">
            <span className="text-white text-xs font-semibold px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-sm">
              {show.status === 'paused' ? 'Resume' : 'Continue'}
            </span>
          </div>
        )}
      </div>
      <div className="relative px-3 py-3" style={{ height: '35%', backgroundColor: 'rgba(10,10,20,0.95)' }}>
        <p className="text-white text-xs font-semibold leading-snug line-clamp-2">{show.title}</p>
        {show.type === 'show' && (
          <span className="inline-block mt-1.5 text-[10px] text-white/50 bg-white/10 px-1.5 py-0.5 rounded-full leading-none">
            S{show.season} E{show.episode}
            {progress && <span className="text-white/30"> · {progress.percent}%</span>}
          </span>
        )}
        {show.type === 'movie' && show.status === 'finished' && show.rating > 0 && (
          <div className="flex gap-0.5 mt-1.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <span key={n} className="text-[10px]" style={{ color: n <= show.rating ? '#fbbf24' : 'rgba(255,255,255,0.15)' }}>●</span>
            ))}
          </div>
        )}
        {show.type === 'movie' && show.status !== 'finished' && (
          <span className="inline-block mt-1.5 text-[10px] text-white/50 bg-white/10 px-1.5 py-0.5 rounded-full leading-none">
            {STATUS_CONFIG[show.status]?.label || show.status}
          </span>
        )}
        <div className={`absolute bottom-2.5 right-2.5 w-2 h-2 rounded-full ${STATUS_CONFIG[show.status]?.dot || 'bg-gray-400'}`} />
      </div>
      {progress && <ProgressBar percent={progress.percent} color={show.color} isPoster={false} />}
    </div>
  )
}

function SectionDivider({ label, top = false }) {
  return (
    <div className={`flex items-center gap-3 ${top ? 'mb-7' : 'my-10'}`}>
      {!top && <div className="flex-1 h-px bg-gray-100 dark:bg-white/[0.06]" />}
      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-600">
        {label}
      </span>
      <div className="flex-1 h-px bg-gray-100 dark:bg-white/[0.06]" />
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

function CompletedShowsGroup({ finished, dropped, onSelect, onAdd }) {
  const [open, setOpen] = useState(false)
  const total = finished.length + dropped.length
  if (total === 0) return null
  return (
    <div className="mb-10">
      <div className="flex items-center justify-between mb-3">
        <button type="button" className="flex items-center gap-2" onClick={() => setOpen((v) => !v)}>
          <p className="section-label">Completed · {total}</p>
          {open ? <ChevronUp size={13} className="text-gray-400" /> : <ChevronDown size={13} className="text-gray-400" />}
        </button>
        <button
          type="button"
          onClick={onAdd}
          className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
        >
          <Plus size={12} />
          Add
        </button>
      </div>
      {open && (
        <div className="space-y-7">
          {finished.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-600 mb-3">Finished</p>
              <div className="flex flex-wrap gap-3 md:gap-5">
                {finished.map((show) => <ShowCard key={show.id} show={show} onClick={() => onSelect(show)} />)}
              </div>
            </div>
          )}
          {dropped.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-600 mb-3">Dropped</p>
              <div className="flex flex-wrap gap-3 md:gap-5">
                {dropped.map((show) => <ShowCard key={show.id} show={show} onClick={() => onSelect(show)} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function WatchedMoviesGroup({ watched, onSelect }) {
  const [open, setOpen] = useState(false)
  if (watched.length === 0) return null
  return (
    <div className="mb-10">
      <button type="button" className="flex items-center gap-2 mb-3" onClick={() => setOpen((v) => !v)}>
        <p className="section-label">Watched · {watched.length}</p>
        {open ? <ChevronUp size={13} className="text-gray-400" /> : <ChevronDown size={13} className="text-gray-400" />}
      </button>
      {open && (
        <div className="flex flex-wrap gap-3 md:gap-5">
          {watched.map((show) => <ShowCard key={show.id} show={show} onClick={() => onSelect(show)} />)}
        </div>
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
    <div className="w-80 flex-shrink-0 border-l border-gray-100 dark:border-white/[0.06] flex flex-col overflow-y-auto">
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
      // Generate a new share token (UUID v4)
      token = crypto.randomUUID()
      await updateProfile({ share_token: token })
    }
    const url = `${window.location.origin}/shared/watch/${token}`
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    setGeneratingLink(false)
    showToast({ message: 'Share link copied to clipboard!', variant: 'success' })
  }

  const tvShows       = shows.filter((s) => s.type === 'show')
  const movies        = shows.filter((s) => s.type === 'movie')
  const watchingShows = tvShows.filter((s) => s.status === 'watching')
  const pausedShows   = tvShows.filter((s) => s.status === 'paused')
  const wantShows     = tvShows.filter((s) => s.status === 'want_to_watch')
  const finishedShows = tvShows.filter((s) => s.status === 'finished')
  const droppedShows  = tvShows.filter((s) => s.status === 'dropped')
  const wantMovies    = movies.filter((s) => s.status === 'want_to_watch')
  const watchingMovies = movies.filter((s) => s.status === 'watching' || s.status === 'paused')
  const watchedMovies  = movies.filter((s) => s.status === 'finished' || s.status === 'dropped')

  return (
    <div className="h-full flex overflow-hidden max-w-[1200px] mx-auto w-full">
      <div className="flex-1 overflow-y-auto px-4 py-4 md:px-8 md:py-8">

        <div className="flex items-center justify-between gap-3 mb-5 md:mb-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center">
              <Tv2 size={18} className="text-amber-500" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Watch</h1>
          </div>
          <button
            onClick={handleShare}
            disabled={generatingLink || shows.length === 0}
            className="btn-ghost text-xs flex items-center gap-1.5 disabled:opacity-40"
            title="Copy shareable watchlist link"
          >
            {copied ? <Check size={13} className="text-teal-500" /> : <Share2 size={13} />}
            {copied ? 'Copied!' : 'Share watchlist'}
          </button>
        </div>

        {/* Shows */}
        <SectionDivider label="Shows" top />

        {/* Watching */}
        <div className="mb-10">
          <SectionLabel label="Watching" count={watchingShows.length} onAdd={() => openAddModal({ type: 'show', status: 'watching' })} />
          {watchingShows.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-600">Nothing playing right now</p>
          ) : (
            <div className="flex gap-5 overflow-x-auto pb-3 scrollbar-thin">
              {watchingShows.map((show) => <ShowCard key={show.id} show={show} onClick={() => toggleSelect(show)} />)}
            </div>
          )}
        </div>

        {/* Paused - hidden when empty */}
        {pausedShows.length > 0 && (
          <div className="mb-10">
            <SectionLabel label="Paused" count={pausedShows.length} onAdd={() => openAddModal({ type: 'show', status: 'paused' })} />
            <div className="flex gap-5 overflow-x-auto pb-3 scrollbar-thin">
              {pausedShows.map((show) => <ShowCard key={show.id} show={show} onClick={() => toggleSelect(show)} />)}
            </div>
          </div>
        )}

        {/* Want to Watch */}
        <div className="mb-10">
          <SectionLabel label="Want to Watch" count={wantShows.length} onAdd={() => openAddModal({ type: 'show', status: 'want_to_watch' })} />
          {wantShows.length === 0 ? (
            <p className="text-sm italic text-gray-400 dark:text-gray-600">You have nothing here yet</p>
          ) : (
            <div className="flex flex-wrap gap-3 md:gap-5">
              {wantShows.map((show) => <ShowCard key={show.id} show={show} onClick={() => toggleSelect(show)} />)}
            </div>
          )}
        </div>

        {/* Completed shows */}
        <CompletedShowsGroup
          finished={finishedShows}
          dropped={droppedShows}
          onSelect={toggleSelect}
          onAdd={() => openAddModal({ type: 'show', status: 'finished' })}
        />

        {/* Movies */}
        <SectionDivider label="Movies" />

        {/* Want to Watch movies */}
        <div className="mb-10">
          <SectionLabel label="Want to Watch" count={wantMovies.length} onAdd={() => openAddModal({ type: 'movie', status: 'want_to_watch' })} />
          {wantMovies.length === 0 ? (
            <p className="text-sm italic text-gray-400 dark:text-gray-600">No movies on your list</p>
          ) : (
            <div className="flex flex-wrap gap-3 md:gap-5">
              {wantMovies.map((show) => <ShowCard key={show.id} show={show} onClick={() => toggleSelect(show)} />)}
            </div>
          )}
        </div>

        {/* Watching movies - hidden when empty */}
        {watchingMovies.length > 0 && (
          <div className="mb-10">
            <SectionLabel label="Watching" count={watchingMovies.length} onAdd={() => openAddModal({ type: 'movie', status: 'watching' })} />
            <div className="flex gap-5 overflow-x-auto pb-3 scrollbar-thin">
              {watchingMovies.map((show) => <ShowCard key={show.id} show={show} onClick={() => toggleSelect(show)} />)}
            </div>
          </div>
        )}

        {/* Watched movies - collapsible */}
        <WatchedMoviesGroup watched={watchedMovies} onSelect={toggleSelect} />

      </div>

      {selectedShow && (
        <DetailPanel
          show={selectedShow}
          onClose={() => setSelectedShow(null)}
          onUpdate={updateShow}
          onDelete={deleteShow}
        />
      )}

      <AddShowModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        defaults={modalDefault}
      />
    </div>
  )
}
