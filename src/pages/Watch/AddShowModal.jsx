import { useState, useEffect, useRef } from 'react'
import Modal from '../../components/ui/Modal'
import { useWatchStore } from '../../stores/useWatchStore'
import { useAuthStore } from '../../stores/useAuthStore'

const WATCH_COLORS = ['#1d4ed8', '#4f46e5', '#0f766e', '#b45309', '#be123c', '#7c3aed', '#15803d', '#334155']
const TMDB_BEARER = import.meta.env.VITE_TMDB_API_KEY
const TMDB_IMG = 'https://image.tmdb.org/t/p/w200'

const STATUS_OPTIONS_SHOW = [
  { value: 'watching', label: 'Watching' },
  { value: 'paused', label: 'Paused' },
  { value: 'want_to_watch', label: 'Want to Watch' },
  { value: 'finished', label: 'Finished' },
  { value: 'dropped', label: 'Dropped' },
]

const STATUS_OPTIONS_MOVIE = [
  { value: 'want_to_watch', label: 'Want to Watch' },
  { value: 'finished', label: 'Watched' },
]

export default function AddShowModal({ isOpen, onClose, defaults = {} }) {
  const { user } = useAuthStore()
  const { addShow } = useWatchStore()

  const [title, setTitle] = useState('')
  const [type, setType] = useState(defaults.type || 'show')
  const [color, setColor] = useState(WATCH_COLORS[0])
  const [status, setStatus] = useState(defaults.status || 'watching')
  const [season, setSeason] = useState(1)
  const [episode, setEpisode] = useState(1)
  const [totalSeasons, setTotalSeasons] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // TMDB state
  const [tmdbId, setTmdbId] = useState(null)
  const [posterUrl, setPosterUrl] = useState(null)
  const [episodesPerSeason, setEpisodesPerSeason] = useState(null)
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [fetchingDetails, setFetchingDetails] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const searchTimeout = useRef(null)

  useEffect(() => {
    if (isOpen) {
      setTitle('')
      setType(defaults.type || 'show')
      setColor(WATCH_COLORS[0])
      setStatus(defaults.status || 'watching')
      setSeason(1)
      setEpisode(1)
      setTotalSeasons('')
      setSaving(false)
      setError('')
      setTmdbId(null)
      setPosterUrl(null)
      setEpisodesPerSeason(null)
      setSearchResults([])
      setShowDropdown(false)
      setFetchingDetails(false)
      clearTimeout(searchTimeout.current)
    }
  }, [isOpen])

  function handleTitleChange(e) {
    const val = e.target.value
    setTitle(val)
    setTmdbId(null)
    setPosterUrl(null)
    setEpisodesPerSeason(null)
    clearTimeout(searchTimeout.current)
    if (val.trim().length < 2) {
      setSearchResults([])
      setShowDropdown(false)
      return
    }
    searchTimeout.current = setTimeout(() => doSearch(val.trim()), 300)
  }

  async function doSearch(query) {
    if (!TMDB_BEARER) return
    setSearching(true)
    try {
      const res = await fetch(
        `https://api.themoviedb.org/3/search/multi?query=${encodeURIComponent(query)}&language=en-US&page=1&include_adult=false`,
        { headers: { Authorization: `Bearer ${TMDB_BEARER}` } }
      )
      const data = await res.json()
      const results = (data.results || [])
        .filter((r) => r.media_type === 'movie' || r.media_type === 'tv')
        .slice(0, 6)
      setSearchResults(results)
      setShowDropdown(results.length > 0)
    } catch {
      setSearchResults([])
      setShowDropdown(false)
    } finally {
      setSearching(false)
    }
  }

  async function handleSelectResult(result) {
    const isMovie = result.media_type === 'movie'
    const selectedTitle = isMovie ? result.title : result.name
    const selectedType = isMovie ? 'movie' : 'show'
    const poster = result.poster_path ? `${TMDB_IMG}${result.poster_path}` : null

    setTitle(selectedTitle)
    setType(selectedType)
    setPosterUrl(poster)
    setTmdbId(result.id)
    setShowDropdown(false)
    setSearchResults([])
    clearTimeout(searchTimeout.current)

    if (isMovie) {
      setStatus('want_to_watch')
    } else {
      setStatus(defaults.status || 'watching')
      setFetchingDetails(true)
      try {
        // Fetch show overview for total seasons
        const res = await fetch(
          `https://api.themoviedb.org/3/tv/${result.id}`,
          { headers: { Authorization: `Bearer ${TMDB_BEARER}` } }
        )
        const details = await res.json()
        const numSeasons = details.number_of_seasons
        if (numSeasons) {
          setTotalSeasons(String(numSeasons))
          // Fetch each season in parallel to get per-season episode counts (cap at 25)
          const cap = Math.min(numSeasons, 25)
          const fetches = Array.from({ length: cap }, (_, i) =>
            fetch(`https://api.themoviedb.org/3/tv/${result.id}/season/${i + 1}`, {
              headers: { Authorization: `Bearer ${TMDB_BEARER}` },
            })
              .then((r) => r.json())
              .catch(() => null)
          )
          const seasonData = await Promise.all(fetches)
          const epCounts = seasonData.map((s) =>
            Array.isArray(s?.episodes) ? s.episodes.length : null
          )
          setEpisodesPerSeason(epCounts)
        }
      } catch {
        // non-fatal - user can fill in manually
      } finally {
        setFetchingDetails(false)
      }
    }
  }

  function removePoster() {
    setPosterUrl(null)
    setTmdbId(null)
    setEpisodesPerSeason(null)
  }

  const statusOptions = type === 'movie' ? STATUS_OPTIONS_MOVIE : STATUS_OPTIONS_SHOW

  async function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    setError('')

    const now = new Date().toISOString()
    const payload = {
      user_id: user.id,
      title: title.trim(),
      type,
      color,
      status,
      tmdb_id: tmdbId || null,
      poster_url: posterUrl || null,
      episodes_per_season: episodesPerSeason || null,
    }

    if (type === 'show') {
      payload.season = season
      payload.episode = episode
      if (totalSeasons) payload.total_seasons = Number(totalSeasons)
    }

    if (status === 'watching') payload.started_at = now
    if (status === 'finished') payload.finished_at = now

    const { error: err } = await addShow(payload)
    setSaving(false)
    if (err) setError(err.message)
    else onClose()
  }

  const totalEpisodes = episodesPerSeason?.every((e) => e != null)
    ? episodesPerSeason.reduce((s, e) => s + e, 0)
    : null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add to Watch List" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Title with TMDB search dropdown */}
        <div className="relative">
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Title</label>
          <input
            autoFocus
            required
            value={title}
            onChange={handleTitleChange}
            onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
            placeholder="Search or type a title…"
            className="input-base"
          />
          {searching && (
            <p className="absolute right-3 top-8 text-[10px] text-gray-400">Searching…</p>
          )}
          {showDropdown && searchResults.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden">
              {searchResults.map((result) => {
                const isMovie = result.media_type === 'movie'
                const displayTitle = isMovie ? result.title : result.name
                const year = (isMovie ? result.release_date : result.first_air_date)?.slice(0, 4)
                const poster = result.poster_path ? `${TMDB_IMG}${result.poster_path}` : null
                return (
                  <button
                    key={result.id}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSelectResult(result)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left border-b border-gray-100 dark:border-gray-800 last:border-0"
                  >
                    <div className="w-8 h-12 rounded flex-shrink-0 overflow-hidden bg-gray-100 dark:bg-gray-800">
                      {poster
                        ? <img src={poster} alt="" className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-gray-400 text-[10px]">?</div>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{displayTitle}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {year && <span className="text-xs text-gray-400">{year}</span>}
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                          isMovie
                            ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                            : 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400'
                        }`}>
                          {isMovie ? 'Movie' : 'TV Show'}
                        </span>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Season data loading indicator */}
        {fetchingDetails && (
          <p className="text-xs text-gray-400 flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 border border-gray-300 dark:border-gray-600 border-t-transparent rounded-full animate-spin" />
            Loading season data…
          </p>
        )}

        {/* Type toggle */}
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Type</label>
          <div className="rounded-lg bg-gray-100 dark:bg-white/[0.05] p-0.5 flex">
            {['show', 'movie'].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => { setType(t); setStatus(t === 'movie' ? 'want_to_watch' : 'watching') }}
                className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  type === t
                    ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-gray-100 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                {t === 'show' ? 'Show' : 'Movie'}
              </button>
            ))}
          </div>
        </div>

        {/* Poster preview OR color picker */}
        {posterUrl ? (
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50 dark:bg-white/[0.04] border border-gray-100 dark:border-white/[0.08]">
            <img src={posterUrl} alt="" className="w-8 h-12 rounded object-cover flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Poster from TMDB</p>
              {totalEpisodes && (
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                  {episodesPerSeason.length} seasons · {totalEpisodes} episodes
                </p>
              )}
              <button
                type="button"
                onClick={removePoster}
                className="text-[11px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 mt-0.5"
              >
                Remove, use color instead
              </button>
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Color</label>
            <div className="flex gap-2 flex-wrap">
              {WATCH_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full transition-all ${
                    color === c
                      ? 'ring-2 ring-offset-2 ring-gray-400 dark:ring-offset-[#131b24] scale-110'
                      : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Show-specific fields */}
        {type === 'show' && (
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Season</label>
              <input type="number" min={1} value={season} onChange={(e) => setSeason(Number(e.target.value))} className="input-base" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Episode</label>
              <input type="number" min={1} value={episode} onChange={(e) => setEpisode(Number(e.target.value))} className="input-base" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Seasons total</label>
              <input type="number" min={1} value={totalSeasons} onChange={(e) => setTotalSeasons(e.target.value)} placeholder="?" className="input-base" />
            </div>
          </div>
        )}

        {/* Status */}
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="input-base">
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {error && <p className="text-xs text-rose-500">{error}</p>}

        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center">Cancel</button>
          <button
            type="submit"
            disabled={saving || fetchingDetails}
            className="btn-primary flex-1 justify-center disabled:opacity-50"
          >
            {saving ? 'Adding…' : fetchingDetails ? 'Loading…' : 'Add'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
