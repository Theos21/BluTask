import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Tv2 } from 'lucide-react'

const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

const STATUS_LABEL = {
  watching:      'Watching',
  paused:        'Paused',
  want_to_watch: 'Want to watch',
  finished:      'Finished',
  dropped:       'Dropped',
}

const STATUS_DOT = {
  watching:      'bg-green-400',
  paused:        'bg-yellow-400',
  want_to_watch: 'bg-gray-400',
  finished:      'bg-blue-400',
  dropped:       'bg-red-400',
}

function getInitials(title) {
  return title.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

function ShowCard({ show }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <div
        className="w-10 h-14 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden"
        style={{ backgroundColor: show.poster_url ? undefined : show.color }}
      >
        {show.poster_url
          ? <img src={show.poster_url} alt={show.title} className="w-full h-full object-cover" />
          : <span className="text-white font-bold text-xs">{getInitials(show.title)}</span>
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{show.title}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          {show.type === 'show' ? 'Show' : 'Movie'}
          {show.type === 'show' && show.status === 'watching' ? ` · S${show.season} E${show.episode}` : ''}
        </p>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <span className={`w-2 h-2 rounded-full ${STATUS_DOT[show.status] || 'bg-gray-400'}`} />
        <span className="text-xs text-gray-500 dark:text-gray-400">{STATUS_LABEL[show.status] || show.status}</span>
      </div>
    </div>
  )
}

export default function SharedWatchlist() {
  const { token } = useParams()
  const [shows, setShows] = useState([])
  const [ownerName, setOwnerName] = useState('')
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [networkError, setNetworkError] = useState(false)

  useEffect(() => {
    if (!token) { setNotFound(true); setLoading(false); return }

    async function load() {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/functions/v1/shared-watchlist?token=${encodeURIComponent(token)}`,
          {
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            },
          },
        )

        if (res.status === 404) {
          setNotFound(true)
          setLoading(false)
          return
        }

        if (!res.ok) {
          setNetworkError(true)
          setLoading(false)
          return
        }

        const data = await res.json()
        if (data.error) {
          setNotFound(true)
          setLoading(false)
          return
        }

        setOwnerName(data.ownerName)
        setShows(data.shows)
      } catch {
        setNetworkError(true)
      }
      setLoading(false)
    }

    load()
  }, [token])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (networkError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
        <div className="text-center space-y-3">
          <p className="text-gray-700 dark:text-gray-300 font-medium">Couldn't load this watchlist</p>
          <p className="text-sm text-gray-400 dark:text-gray-500">Check your connection and try again.</p>
          <button
            onClick={() => { setNetworkError(false); setLoading(true) }}
            className="text-sm text-amber-500 underline"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400">This watchlist link is invalid or has been removed.</p>
        </div>
      </div>
    )
  }

  const watching    = shows.filter(s => s.status === 'watching' || s.status === 'paused')
  const wantToWatch = shows.filter(s => s.status === 'want_to_watch')
  const finished    = shows.filter(s => s.status === 'finished' || s.status === 'dropped')

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-12 px-4">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center">
            <Tv2 size={18} className="text-amber-500" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">{ownerName}'s Watchlist</h1>
            <p className="text-xs text-gray-400 dark:text-gray-500">{shows.length} title{shows.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        {watching.length > 0 && (
          <div className="mb-6 card p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">Currently watching</p>
            {watching.map(s => <ShowCard key={s.id} show={s} />)}
          </div>
        )}

        {wantToWatch.length > 0 && (
          <div className="mb-6 card p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">Want to watch</p>
            {wantToWatch.map(s => <ShowCard key={s.id} show={s} />)}
          </div>
        )}

        {finished.length > 0 && (
          <div className="mb-6 card p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">Finished</p>
            {finished.map(s => <ShowCard key={s.id} show={s} />)}
          </div>
        )}

        {shows.length === 0 && (
          <p className="text-center text-sm text-gray-400 dark:text-gray-500 py-12">Nothing on the watchlist yet.</p>
        )}

        <p className="text-center text-xs text-gray-300 dark:text-gray-700 mt-8">
          Made with <span style={{ color: '#1a56db' }}>Blu</span>Task
        </p>
      </div>
    </div>
  )
}
