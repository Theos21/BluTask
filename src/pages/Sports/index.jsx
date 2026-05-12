import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  format, isPast, isToday, isFuture, parseISO,
  startOfMonth, endOfMonth, eachDayOfInterval, getDay,
  addMonths, subMonths,
} from 'date-fns'
import {
  Trophy, Plus, X, Calendar, MapPin, Trash2, Edit2,
  CheckCircle, Circle, Target, Wrench, Search, Youtube,
  ChevronLeft, ChevronRight, Users, User, Archive,
  RotateCcw, LayoutGrid, Settings2,
} from 'lucide-react'
import { useSportsStore } from '../../stores/useSportsStore'
import { useAuthStore } from '../../stores/useAuthStore'
import { showToast } from '../../lib/toast'
import ConfirmDeleteModal from '../../components/ui/ConfirmDeleteModal'

// ─── sport configs ────────────────────────────────────────────────────────────
const SPORT_TYPES = [
  { value: 'basketball',   label: 'Basketball'          },
  { value: 'soccer',       label: 'Soccer / Football'   },
  { value: 'tennis',       label: 'Tennis'              },
  { value: 'volleyball',   label: 'Volleyball'          },
  { value: 'baseball',     label: 'Baseball / Softball' },
  { value: 'swimming',     label: 'Swimming'            },
  { value: 'running',      label: 'Running / Track'     },
  { value: 'hockey',       label: 'Hockey'              },
  { value: 'rugby',        label: 'Rugby'               },
  { value: 'golf',         label: 'Golf'                },
  { value: 'martial_arts', label: 'Martial Arts'        },
  { value: 'gymnastics',   label: 'Gymnastics'          },
  { value: 'other',        label: 'Other'               },
]

const SPORT_CONFIGS = {
  basketball:   { drillCategories: ['Ball Handling', 'Shooting', 'Defense', 'Passing', 'Conditioning', 'Strategy'],   positions: ['Point Guard', 'Shooting Guard', 'Small Forward', 'Power Forward', 'Center'] },
  soccer:       { drillCategories: ['Dribbling', 'Shooting', 'Passing', 'Defense', 'Set Pieces', 'Fitness'],          positions: ['Goalkeeper', 'Centre Back', 'Full Back', 'Defensive Mid', 'Central Mid', 'Winger', 'Striker'] },
  tennis:       { drillCategories: ['Serve', 'Return', 'Groundstrokes', 'Net Play', 'Footwork', 'Match Play'],        positions: ['Singles', 'Doubles'] },
  volleyball:   { drillCategories: ['Setting', 'Spiking', 'Serving', 'Defense', 'Blocking', 'Conditioning'],         positions: ['Setter', 'Outside Hitter', 'Middle Blocker', 'Opposite', 'Libero', 'DS'] },
  baseball:     { drillCategories: ['Hitting', 'Pitching', 'Fielding', 'Base Running', 'Catching', 'Strategy'],      positions: ['Pitcher', 'Catcher', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH'] },
  swimming:     { drillCategories: ['Technique', 'Starts & Turns', 'Endurance', 'Speed', 'Stroke Drills', 'Race Prep'], positions: ['Freestyle', 'Backstroke', 'Breaststroke', 'Butterfly', 'IM'] },
  running:      { drillCategories: ['Sprints', 'Distance', 'Intervals', 'Form Drills', 'Strength', 'Recovery'],      positions: ['Sprinter', 'Middle Distance', 'Long Distance', 'Hurdles'] },
  hockey:       { drillCategories: ['Skating', 'Shooting', 'Passing', 'Defense', 'Puck Handling', 'Strategy'],       positions: ['Goalie', 'Defenseman', 'Center', 'Left Wing', 'Right Wing'] },
  rugby:        { drillCategories: ['Tackling', 'Passing', 'Kicking', 'Scrums', 'Lineouts', 'Fitness'],              positions: ['Prop', 'Hooker', 'Lock', 'Flanker', 'No. 8', 'Scrum Half', 'Fly Half', 'Centre', 'Wing', 'Full Back'] },
  golf:         { drillCategories: ['Driving', 'Iron Play', 'Chipping', 'Putting', 'Bunker Play', 'Course Management'], positions: [] },
  martial_arts: { drillCategories: ['Striking', 'Grappling', 'Kata / Forms', 'Sparring', 'Conditioning', 'Flexibility'], positions: [] },
  gymnastics:   { drillCategories: ['Floor', 'Vault', 'Balance Beam', 'Bars', 'Conditioning', 'Flexibility'],        positions: [] },
  other:        { drillCategories: ['Conditioning', 'Technique', 'Strategy', 'Teamwork', 'Speed', 'Strength', 'Agility', 'Other'], positions: [] },
}

const SPORT_COLORS = ['#f97316','#10b981','#6366f1','#ec4899','#3b82f6','#8b5cf6','#f59e0b','#ef4444','#14b8a6','#84cc16']

const SESSION_TYPES = [
  { value: 'practice',   label: 'Practice',   color: 'oklch(0.72 0.14 240)' },
  { value: 'game',       label: 'Game',       color: 'oklch(0.72 0.14 150)' },
  { value: 'tournament', label: 'Tournament', color: 'oklch(0.72 0.14 30)'  },
]
const CONDITIONS = [
  { value: 'good',         label: 'Good',        color: 'oklch(0.72 0.14 150)' },
  { value: 'fair',         label: 'Fair',         color: 'oklch(0.74 0.14 65)'  },
  { value: 'needs_repair', label: 'Needs Repair', color: 'oklch(0.72 0.14 30)'  },
  { value: 'replace',      label: 'Replace',      color: 'oklch(0.72 0.16 25)'  },
]

function typeColor(t) { return SESSION_TYPES.find((x) => x.value === t)?.color ?? 'var(--fg-3)' }
function getDrillCategories(sportType) { return SPORT_CONFIGS[sportType]?.drillCategories ?? SPORT_CONFIGS.other.drillCategories }
function getPositions(sportType) { return SPORT_CONFIGS[sportType]?.positions ?? [] }

// ─── YouTube helpers ──────────────────────────────────────────────────────────
function extractYouTubeId(url) {
  if (!url) return null
  const patterns = [/youtube\.com\/watch\?v=([^&\s]+)/, /youtu\.be\/([^?\s]+)/, /youtube\.com\/shorts\/([^?\s]+)/, /youtube\.com\/embed\/([^?\s]+)/]
  for (const pat of patterns) { const m = url.match(pat); if (m) return m[1] }
  return null
}
function isValidYouTubeUrl(url) { return url ? !!extractYouTubeId(url) : true }
function getYouTubeThumbnail(url) { const id = extractYouTubeId(url); return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null }
function getYouTubeWatchUrl(url) { const id = extractYouTubeId(url); return id ? `https://www.youtube.com/watch?v=${id}` : url }

// ─── SportModal ───────────────────────────────────────────────────────────────
function SportModal({ sport, onClose, userId }) {
  const { addSport, updateSport } = useSportsStore()
  const [form, setForm] = useState({
    name:       sport?.name       ?? '',
    sport_type: sport?.sport_type ?? 'other',
    season:     sport?.season     ?? '',
    team_name:  sport?.team_name  ?? '',
    league:     sport?.league     ?? '',
    color:      sport?.color      ?? SPORT_COLORS[0],
    goals:      sport?.goals      ?? '',
  })
  const [saving, setSaving] = useState(false)
  const f = (k) => (v) => setForm((x) => ({ ...x, [k]: typeof v === 'string' ? v : v.target.value }))

  async function save() {
    if (!form.name.trim()) return
    setSaving(true)
    const row = { user_id: userId, ...form, name: form.name.trim(), season: form.season.trim() || null, team_name: form.team_name.trim() || null, league: form.league.trim() || null, goals: form.goals.trim() || null }
    const { error } = sport ? await updateSport(sport.id, row) : await addSport(row)
    setSaving(false)
    if (error) { showToast({ message: 'Save failed', variant: 'error' }); return }
    showToast({ message: sport ? 'Sport updated' : 'Sport created', variant: 'success' })
    onClose()
  }

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center" style={{ zIndex: 500 }} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full sm:max-w-md bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-2xl p-5 space-y-4" style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold" style={{ color: 'var(--fg)' }}>{sport ? 'Edit Sport' : 'New Sport'}</h3>
          <button onClick={onClose} className="p-1 rounded-lg" style={{ color: 'var(--fg-3)' }}><X size={16} /></button>
        </div>

        {/* Color picker */}
        <div>
          <label className="block text-xs font-medium mb-2" style={{ color: 'var(--fg-3)' }}>Color</label>
          <div className="flex gap-2 flex-wrap">
            {SPORT_COLORS.map((c) => (
              <button key={c} type="button" onClick={() => f('color')(c)}
                style={{ width: 26, height: 26, borderRadius: '50%', background: c, border: 0, cursor: 'pointer', outline: form.color === c ? `3px solid ${c}` : 'none', outlineOffset: 2 }}
              />
            ))}
          </div>
        </div>

        <input value={form.name} onChange={f('name')} placeholder="Sport name (e.g. Basketball)" autoFocus
          className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
          style={{ background: 'var(--bg-3)', borderColor: 'var(--border)', color: 'var(--fg)' }}
        />

        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--fg-3)' }}>Sport type</label>
          <select value={form.sport_type} onChange={f('sport_type')}
            className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
            style={{ background: 'var(--bg-3)', borderColor: 'var(--border)', color: 'var(--fg)' }}
          >
            {SPORT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--fg-3)' }}>Season</label>
            <input value={form.season} onChange={f('season')} placeholder="Fall 2025"
              className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
              style={{ background: 'var(--bg-3)', borderColor: 'var(--border)', color: 'var(--fg)' }}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--fg-3)' }}>Team name</label>
            <input value={form.team_name} onChange={f('team_name')} placeholder="The Tigers"
              className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
              style={{ background: 'var(--bg-3)', borderColor: 'var(--border)', color: 'var(--fg)' }}
            />
          </div>
        </div>

        <input value={form.league} onChange={f('league')} placeholder="League / division (optional)"
          className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
          style={{ background: 'var(--bg-3)', borderColor: 'var(--border)', color: 'var(--fg)' }}
        />

        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--fg-3)' }}>Season goals</label>
          <textarea value={form.goals} onChange={f('goals')} rows={2} placeholder="What do you want to achieve this season?"
            className="w-full px-3 py-2 rounded-lg text-sm border outline-none resize-none"
            style={{ background: 'var(--bg-3)', borderColor: 'var(--border)', color: 'var(--fg)' }}
          />
        </div>

        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg text-sm font-medium" style={{ background: 'var(--bg-3)', color: 'var(--fg-2)' }}>Cancel</button>
          <button onClick={save} disabled={!form.name.trim() || saving}
            className="flex-1 py-2 rounded-lg text-sm font-medium disabled:opacity-40"
            style={{ background: form.color, color: '#fff' }}
          >{saving ? 'Saving…' : sport ? 'Save' : 'Create Sport'}</button>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ─── SessionModal ─────────────────────────────────────────────────────────────
function SessionModal({ session, presetDate, sportId, onClose, userId }) {
  const { addSession, updateSession } = useSportsStore()
  const [form, setForm] = useState({
    type:       session?.type       ?? 'practice',
    title:      session?.title      ?? '',
    date:       session?.date       ?? presetDate ?? format(new Date(), 'yyyy-MM-dd'),
    location:   session?.location   ?? '',
    notes:      session?.notes      ?? '',
    score_us:   session?.score_us   ?? '',
    score_them: session?.score_them ?? '',
    attendance: session?.attendance ?? '',
  })
  const [saving, setSaving] = useState(false)
  const isGame = form.type === 'game' || form.type === 'tournament'

  async function save() {
    if (!form.title.trim()) return
    setSaving(true)
    const row = {
      user_id: userId, sport_id: session?.sport_id ?? sportId ?? null,
      type: form.type, title: form.title.trim(),
      date: form.date || null, location: form.location.trim() || null,
      notes: form.notes.trim() || null,
      score_us:   form.score_us   !== '' ? Number(form.score_us)   : null,
      score_them: form.score_them !== '' ? Number(form.score_them) : null,
      attendance: form.attendance !== '' ? Number(form.attendance) : null,
    }
    const { error } = session ? await updateSession(session.id, row) : await addSession(row)
    setSaving(false)
    if (error) { showToast({ message: 'Save failed', variant: 'error' }); return }
    showToast({ message: session ? 'Session updated' : 'Session added', variant: 'success' })
    onClose()
  }

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center" style={{ zIndex: 500 }} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full sm:max-w-md bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-2xl p-5 space-y-4" style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold" style={{ color: 'var(--fg)' }}>{session ? 'Edit Session' : 'Add Session'}</h3>
          <button onClick={onClose} className="p-1" style={{ color: 'var(--fg-3)' }}><X size={16} /></button>
        </div>
        <div className="flex gap-1.5">
          {SESSION_TYPES.map((t) => (
            <button key={t.value} onClick={() => setForm((f) => ({ ...f, type: t.value }))}
              className="flex-1 py-1.5 rounded-lg text-xs font-medium border"
              style={form.type === t.value ? { background: t.color + '25', color: t.color, borderColor: t.color + '60' } : { background: 'var(--bg-3)', color: 'var(--fg-2)', borderColor: 'var(--border)' }}
            >{t.label}</button>
          ))}
        </div>
        <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          placeholder="Session title" autoFocus
          className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
          style={{ background: 'var(--bg-3)', borderColor: 'var(--border)', color: 'var(--fg)' }}
        />
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--fg-3)' }}>Date</label>
            <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
              style={{ background: 'var(--bg-3)', borderColor: 'var(--border)', color: 'var(--fg)' }}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--fg-3)' }}>Location</label>
            <input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} placeholder="Field / gym"
              className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
              style={{ background: 'var(--bg-3)', borderColor: 'var(--border)', color: 'var(--fg)' }}
            />
          </div>
        </div>
        {isGame && (
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--fg-3)' }}>Score</label>
            <div className="flex items-center gap-2">
              <input type="number" value={form.score_us} onChange={(e) => setForm((f) => ({ ...f, score_us: e.target.value }))} placeholder="Us" min="0"
                className="flex-1 px-3 py-2 rounded-lg text-sm border text-center outline-none"
                style={{ background: 'var(--bg-3)', borderColor: 'var(--border)', color: 'var(--fg)' }}
              />
              <span style={{ color: 'var(--fg-3)' }}>—</span>
              <input type="number" value={form.score_them} onChange={(e) => setForm((f) => ({ ...f, score_them: e.target.value }))} placeholder="Them" min="0"
                className="flex-1 px-3 py-2 rounded-lg text-sm border text-center outline-none"
                style={{ background: 'var(--bg-3)', borderColor: 'var(--border)', color: 'var(--fg)' }}
              />
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--fg-3)' }}>Attendance</label>
            <input type="number" value={form.attendance} onChange={(e) => setForm((f) => ({ ...f, attendance: e.target.value }))} placeholder="# players" min="0"
              className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
              style={{ background: 'var(--bg-3)', borderColor: 'var(--border)', color: 'var(--fg)' }}
            />
          </div>
        </div>
        <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          rows={2} placeholder="Strategy, observations, game plan…"
          className="w-full px-3 py-2 rounded-lg text-sm border outline-none resize-none"
          style={{ background: 'var(--bg-3)', borderColor: 'var(--border)', color: 'var(--fg)' }}
        />
        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg text-sm font-medium" style={{ background: 'var(--bg-3)', color: 'var(--fg-2)' }}>Cancel</button>
          <button onClick={save} disabled={!form.title.trim() || saving}
            className="flex-1 py-2 rounded-lg text-sm font-medium disabled:opacity-40"
            style={{ background: 'var(--accent)', color: '#0b1220' }}
          >{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ─── DrillModal ───────────────────────────────────────────────────────────────
function DrillModal({ drill, sportId, drillCategories, onClose, userId }) {
  const { addDrill, updateDrill, drills } = useSportsStore()
  const [form, setForm] = useState({
    name:             drill?.name             ?? '',
    category:         drill?.category         ?? '',
    skill_level:      drill?.skill_level      ?? 'all',
    duration_minutes: drill?.duration_minutes ?? '',
    description:      drill?.description      ?? '',
    youtube_url:      drill?.youtube_url      ?? '',
  })
  const [saving, setSaving]     = useState(false)
  const [ytError, setYtError]   = useState(false)
  const [thumbOk, setThumbOk]   = useState(false)
  const thumb = getYouTubeThumbnail(form.youtube_url)

  function handleYt(val) {
    setForm((f) => ({ ...f, youtube_url: val }))
    setYtError(val.trim() !== '' && !isValidYouTubeUrl(val))
    setThumbOk(false)
  }

  async function save() {
    if (!form.name.trim() || ytError) return
    setSaving(true)
    const row = {
      user_id: userId, sport_id: drill?.sport_id ?? sportId ?? null,
      name: form.name.trim(), category: form.category || null,
      skill_level: form.skill_level,
      duration_minutes: form.duration_minutes !== '' ? Number(form.duration_minutes) : null,
      description: form.description.trim() || null,
      youtube_url: form.youtube_url.trim() || null,
      position: drill ? drill.position : drills.length,
    }
    const { error } = drill ? await updateDrill(drill.id, row) : await addDrill(row)
    setSaving(false)
    if (error) { showToast({ message: 'Save failed', variant: 'error' }); return }
    showToast({ message: drill ? 'Drill updated' : 'Drill added', variant: 'success' })
    onClose()
  }

  const SKILL_LEVELS = [{ value: 'all', label: 'All levels' }, { value: 'beginner', label: 'Beginner' }, { value: 'intermediate', label: 'Intermediate' }, { value: 'advanced', label: 'Advanced' }]

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center" style={{ zIndex: 500 }} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full sm:max-w-md bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-2xl p-5 space-y-4" style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold" style={{ color: 'var(--fg)' }}>{drill ? 'Edit Drill' : 'Add Drill'}</h3>
          <button onClick={onClose} className="p-1" style={{ color: 'var(--fg-3)' }}><X size={16} /></button>
        </div>
        <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Drill name" autoFocus
          className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
          style={{ background: 'var(--bg-3)', borderColor: 'var(--border)', color: 'var(--fg)' }}
        />
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--fg-3)' }}>Category</label>
            <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
              style={{ background: 'var(--bg-3)', borderColor: 'var(--border)', color: 'var(--fg)' }}
            >
              <option value="">— select —</option>
              {drillCategories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--fg-3)' }}>Skill level</label>
            <select value={form.skill_level} onChange={(e) => setForm((f) => ({ ...f, skill_level: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
              style={{ background: 'var(--bg-3)', borderColor: 'var(--border)', color: 'var(--fg)' }}
            >
              {SKILL_LEVELS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--fg-3)' }}>Duration (min)</label>
          <input type="number" value={form.duration_minutes} onChange={(e) => setForm((f) => ({ ...f, duration_minutes: e.target.value }))} placeholder="15" min="1"
            className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
            style={{ background: 'var(--bg-3)', borderColor: 'var(--border)', color: 'var(--fg)' }}
          />
        </div>
        <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} placeholder="Instructions, setup, coaching notes…"
          className="w-full px-3 py-2 rounded-lg text-sm border outline-none resize-none"
          style={{ background: 'var(--bg-3)', borderColor: 'var(--border)', color: 'var(--fg)' }}
        />
        <div>
          <label className="block text-xs font-medium mb-1 flex items-center gap-1" style={{ color: 'var(--fg-3)' }}><Youtube size={11} /> YouTube link (optional)</label>
          <input value={form.youtube_url} onChange={(e) => handleYt(e.target.value)} placeholder="https://youtube.com/watch?v=…"
            className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
            style={{ background: 'var(--bg-3)', borderColor: ytError ? 'oklch(0.72 0.16 25)' : 'var(--border)', color: 'var(--fg)' }}
          />
          {ytError && <p className="text-xs mt-1" style={{ color: 'oklch(0.72 0.16 25)' }}>Not a valid YouTube URL</p>}
          {thumb && !ytError && (
            <div className="mt-2 rounded-lg overflow-hidden relative" style={{ background: '#000', aspectRatio: '16/9' }}>
              <img src={thumb} alt="" className="w-full h-full object-cover" onLoad={() => setThumbOk(true)} style={{ opacity: thumbOk ? 1 : 0 }} />
              {thumbOk && (
                <a href={getYouTubeWatchUrl(form.youtube_url)} target="_blank" rel="noopener noreferrer"
                  className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.35)' }}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,0,0,0.9)' }}>
                    <div style={{ width: 0, height: 0, borderTop: '7px solid transparent', borderBottom: '7px solid transparent', borderLeft: '13px solid #fff', marginLeft: 2 }} />
                  </div>
                </a>
              )}
            </div>
          )}
        </div>
        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg text-sm font-medium" style={{ background: 'var(--bg-3)', color: 'var(--fg-2)' }}>Cancel</button>
          <button onClick={save} disabled={!form.name.trim() || ytError || saving}
            className="flex-1 py-2 rounded-lg text-sm font-medium disabled:opacity-40"
            style={{ background: 'var(--accent)', color: '#0b1220' }}
          >{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ─── EquipmentModal ───────────────────────────────────────────────────────────
function EquipmentModal({ item, sportId, onClose, userId }) {
  const { addEquipment, updateEquipment } = useSportsStore()
  const [form, setForm] = useState({ name: item?.name ?? '', quantity: item?.quantity ?? 1, condition: item?.condition ?? 'good', notes: item?.notes ?? '' })
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!form.name.trim()) return
    setSaving(true)
    const row = { user_id: userId, sport_id: item?.sport_id ?? sportId ?? null, name: form.name.trim(), quantity: Number(form.quantity) || 1, condition: form.condition, notes: form.notes.trim() || null }
    const { error } = item ? await updateEquipment(item.id, row) : await addEquipment(row)
    setSaving(false)
    if (error) { showToast({ message: 'Save failed', variant: 'error' }); return }
    showToast({ message: item ? 'Updated' : 'Equipment added', variant: 'success' })
    onClose()
  }

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center" style={{ zIndex: 500 }} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full sm:max-w-md bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-2xl p-5 space-y-4" style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold" style={{ color: 'var(--fg)' }}>{item ? 'Edit Equipment' : 'Add Equipment'}</h3>
          <button onClick={onClose} className="p-1" style={{ color: 'var(--fg-3)' }}><X size={16} /></button>
        </div>
        <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Equipment name" autoFocus
          className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
          style={{ background: 'var(--bg-3)', borderColor: 'var(--border)', color: 'var(--fg)' }}
        />
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--fg-3)' }}>Quantity</label>
            <input type="number" value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} min="1"
              className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
              style={{ background: 'var(--bg-3)', borderColor: 'var(--border)', color: 'var(--fg)' }}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--fg-3)' }}>Condition</label>
            <select value={form.condition} onChange={(e) => setForm((f) => ({ ...f, condition: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
              style={{ background: 'var(--bg-3)', borderColor: 'var(--border)', color: 'var(--fg)' }}
            >
              {CONDITIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
        </div>
        <input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Notes (optional)"
          className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
          style={{ background: 'var(--bg-3)', borderColor: 'var(--border)', color: 'var(--fg)' }}
        />
        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg text-sm font-medium" style={{ background: 'var(--bg-3)', color: 'var(--fg-2)' }}>Cancel</button>
          <button onClick={save} disabled={!form.name.trim() || saving}
            className="flex-1 py-2 rounded-lg text-sm font-medium disabled:opacity-40"
            style={{ background: 'var(--accent)', color: '#0b1220' }}
          >{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ─── RosterModal ──────────────────────────────────────────────────────────────
function RosterModal({ member, sportId, positions, onClose, userId }) {
  const { addRosterMember, updateRosterMember } = useSportsStore()
  const [form, setForm] = useState({ name: member?.name ?? '', position: member?.position ?? '', number: member?.number ?? '', notes: member?.notes ?? '' })
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!form.name.trim()) return
    setSaving(true)
    const row = { user_id: userId, sport_id: member?.sport_id ?? sportId ?? null, name: form.name.trim(), position: form.position.trim() || null, number: form.number !== '' ? Number(form.number) : null, notes: form.notes.trim() || null }
    const { error } = member ? await updateRosterMember(member.id, row) : await addRosterMember(row)
    setSaving(false)
    if (error) { showToast({ message: 'Save failed', variant: 'error' }); return }
    showToast({ message: member ? 'Updated' : 'Player added', variant: 'success' })
    onClose()
  }

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center" style={{ zIndex: 500 }} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full sm:max-w-md bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-2xl p-5 space-y-4" style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold" style={{ color: 'var(--fg)' }}>{member ? 'Edit Player' : 'Add Player'}</h3>
          <button onClick={onClose} className="p-1" style={{ color: 'var(--fg-3)' }}><X size={16} /></button>
        </div>
        <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Player name" autoFocus
          className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
          style={{ background: 'var(--bg-3)', borderColor: 'var(--border)', color: 'var(--fg)' }}
        />
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--fg-3)' }}>Position</label>
            {positions.length > 0 ? (
              <select value={form.position} onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
                style={{ background: 'var(--bg-3)', borderColor: 'var(--border)', color: 'var(--fg)' }}
              >
                <option value="">— select —</option>
                {positions.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            ) : (
              <input value={form.position} onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))} placeholder="e.g. Forward"
                className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
                style={{ background: 'var(--bg-3)', borderColor: 'var(--border)', color: 'var(--fg)' }}
              />
            )}
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--fg-3)' }}>Jersey #</label>
            <input type="number" value={form.number} onChange={(e) => setForm((f) => ({ ...f, number: e.target.value }))} placeholder="10" min="0"
              className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
              style={{ background: 'var(--bg-3)', borderColor: 'var(--border)', color: 'var(--fg)' }}
            />
          </div>
        </div>
        <input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Notes (optional)"
          className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
          style={{ background: 'var(--bg-3)', borderColor: 'var(--border)', color: 'var(--fg)' }}
        />
        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg text-sm font-medium" style={{ background: 'var(--bg-3)', color: 'var(--fg-2)' }}>Cancel</button>
          <button onClick={save} disabled={!form.name.trim() || saving}
            className="flex-1 py-2 rounded-lg text-sm font-medium disabled:opacity-40"
            style={{ background: 'var(--accent)', color: '#0b1220' }}
          >{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ─── SessionRow ───────────────────────────────────────────────────────────────
function SessionRow({ session, last, accentColor, onEdit, onDelete, onToggle }) {
  const typeInfo = SESSION_TYPES.find((t) => t.value === session.type)
  const hasScore = session.score_us != null && session.score_them != null
  const won = hasScore && session.score_us > session.score_them
  const drew = hasScore && session.score_us === session.score_them

  return (
    <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: last ? 'none' : '1px solid var(--hairline)' }}>
      <button onClick={onToggle} className="flex-shrink-0">
        {session.completed ? <CheckCircle size={18} style={{ color: accentColor }} /> : <Circle size={18} style={{ color: 'var(--fg-4)' }} />}
      </button>
      <div className="w-1 self-stretch rounded-full flex-shrink-0" style={{ background: typeInfo?.color }} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium" style={{ color: session.completed ? 'var(--fg-3)' : 'var(--fg)' }}>{session.title}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ background: typeInfo?.color + '20', color: typeInfo?.color }}>{typeInfo?.label}</span>
          {session.date && <span className="text-[10px]" style={{ color: 'var(--fg-3)' }}>{format(parseISO(session.date), 'MMM d, yyyy')}</span>}
          {session.location && <span className="text-[10px] flex items-center gap-0.5" style={{ color: 'var(--fg-4)' }}><MapPin size={9} />{session.location}</span>}
          {session.attendance != null && <span className="text-[10px] flex items-center gap-0.5" style={{ color: 'var(--fg-4)' }}><Users size={9} />{session.attendance}</span>}
          {hasScore && <span className="text-[10px] font-semibold font-mono" style={{ color: drew ? 'var(--fg-3)' : won ? 'oklch(0.72 0.14 150)' : 'oklch(0.72 0.16 25)' }}>{session.score_us}–{session.score_them} {drew ? 'D' : won ? 'W' : 'L'}</span>}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button onClick={onEdit} className="p-1.5 rounded-lg" style={{ color: 'var(--fg-3)' }}><Edit2 size={12} /></button>
        <button onClick={onDelete} className="p-1.5 rounded-lg" style={{ color: 'var(--fg-3)' }}><Trash2 size={12} /></button>
      </div>
    </div>
  )
}

// ─── DrillCard ────────────────────────────────────────────────────────────────
function DrillCard({ drill, last, accentColor, onEdit, onDelete }) {
  const [thumbOk, setThumbOk] = useState(false)
  const thumb = getYouTubeThumbnail(drill.youtube_url)

  return (
    <div style={{ borderBottom: last ? 'none' : '1px solid var(--hairline)' }}>
      <div className="flex items-start gap-3 px-4 py-3">
        {thumb ? (
          <a href={getYouTubeWatchUrl(drill.youtube_url)} target="_blank" rel="noopener noreferrer"
            className="flex-shrink-0 rounded-lg overflow-hidden relative" style={{ width: 72, height: 48, background: '#000' }}>
            <img src={thumb} alt="" className="w-full h-full object-cover" onLoad={() => setThumbOk(true)} style={{ opacity: thumbOk ? 1 : 0 }} />
            <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.3)' }}>
              <div style={{ width: 0, height: 0, borderTop: '5px solid transparent', borderBottom: '5px solid transparent', borderLeft: '9px solid #fff', marginLeft: 2 }} />
            </div>
          </a>
        ) : (
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: accentColor + '20' }}>
            <Target size={14} style={{ color: accentColor }} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>{drill.name}</p>
          <div className="flex flex-wrap gap-1.5 mt-0.5">
            {drill.category && <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: accentColor + '18', color: accentColor }}>{drill.category}</span>}
            {drill.skill_level && drill.skill_level !== 'all' && <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'var(--fg-2)', color: 'var(--fg-3)' }}>{drill.skill_level}</span>}
            {drill.duration_minutes && <span className="text-[10px]" style={{ color: 'var(--fg-4)' }}>{drill.duration_minutes} min</span>}
          </div>
          {drill.description && <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--fg-3)' }}>{drill.description}</p>}
          {drill.youtube_url && <a href={getYouTubeWatchUrl(drill.youtube_url)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 mt-1 text-xs" style={{ color: '#ff0000' }}><Youtube size={11} /> Watch on YouTube</a>}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={onEdit} className="p-1.5 rounded-lg" style={{ color: 'var(--fg-3)' }}><Edit2 size={12} /></button>
          <button onClick={onDelete} className="p-1.5 rounded-lg" style={{ color: 'var(--fg-3)' }}><Trash2 size={12} /></button>
        </div>
      </div>
    </div>
  )
}

// ─── SportsCalendar ───────────────────────────────────────────────────────────
function SportsCalendar({ sessions, accentColor, onAddSession, onEditSession }) {
  const [month, setMonth] = useState(new Date())
  const [selected, setSelected] = useState(null)
  const days   = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) })
  const blanks = getDay(startOfMonth(month))

  const byDate = sessions.reduce((acc, s) => {
    if (!s.date) return acc
    const k = s.date.slice(0, 10)
    acc[k] = [...(acc[k] ?? []), s]
    return acc
  }, {})

  const selSessions = selected ? (byDate[selected] ?? []) : []

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setMonth((m) => subMonths(m, 1))} className="p-1.5 rounded-lg" style={{ color: 'var(--fg-3)' }}><ChevronLeft size={16} /></button>
        <span className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>{format(month, 'MMMM yyyy')}</span>
        <button onClick={() => setMonth((m) => addMonths(m, 1))} className="p-1.5 rounded-lg" style={{ color: 'var(--fg-3)' }}><ChevronRight size={16} /></button>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {['Su','Mo','Tu','We','Th','Fr','Sa'].map((d) => (
          <div key={d} className="text-center text-[10px] font-semibold py-1" style={{ color: 'var(--fg-4)' }}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px" style={{ background: 'var(--border)' }}>
        {Array.from({ length: blanks }).map((_, i) => <div key={`b${i}`} style={{ background: 'var(--bg-3)', minHeight: 52 }} />)}
        {days.map((day) => {
          const key     = format(day, 'yyyy-MM-dd')
          const daySess = byDate[key] ?? []
          const isT     = isToday(day)
          const isSel   = selected === key
          return (
            <button key={key} onClick={() => setSelected(isSel ? null : key)}
              style={{ background: isSel ? accentColor + '18' : 'var(--bg)', minHeight: 52, padding: '4px', textAlign: 'left', border: 0, cursor: 'pointer' }}>
              <span className="text-xs font-medium flex items-center justify-center w-5 h-5 rounded-full"
                style={{ background: isT ? accentColor : 'transparent', color: isT ? '#fff' : 'var(--fg)' }}>
                {format(day, 'd')}
              </span>
              <div className="mt-0.5 flex flex-col gap-px">
                {daySess.slice(0, 2).map((s) => (
                  <span key={s.id} className="block text-[9px] truncate px-1 rounded"
                    style={{ background: typeColor(s.type) + '25', color: typeColor(s.type) }}>{s.title}</span>
                ))}
                {daySess.length > 2 && <span className="text-[9px]" style={{ color: 'var(--fg-4)' }}>+{daySess.length - 2}</span>}
              </div>
            </button>
          )
        })}
      </div>
      {selected && (
        <div className="mt-4 rounded-xl p-3 space-y-2" style={{ background: 'var(--bg-3)', border: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold" style={{ color: 'var(--fg-3)' }}>{format(parseISO(selected), 'EEEE, MMMM d')}</p>
            <button onClick={() => onAddSession(selected)} className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg" style={{ background: accentColor, color: '#fff' }}>
              <Plus size={11} /> Add
            </button>
          </div>
          {selSessions.length === 0 && <p className="text-xs" style={{ color: 'var(--fg-4)' }}>No sessions — tap Add to schedule one.</p>}
          {selSessions.map((s) => {
            const ti = SESSION_TYPES.find((t) => t.value === s.type)
            const hasScore = s.score_us != null && s.score_them != null
            const won = hasScore && s.score_us > s.score_them
            return (
              <button key={s.id} onClick={() => onEditSession(s)} className="w-full flex items-center gap-2 text-left rounded-lg px-2 py-1.5"
                style={{ background: ti?.color + '15', border: `1px solid ${ti?.color}40` }}>
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: ti?.color }} />
                <span className="text-xs font-medium flex-1 truncate" style={{ color: 'var(--fg)' }}>{s.title}</span>
                {hasScore && <span className="text-[10px] font-mono font-semibold" style={{ color: won ? 'oklch(0.72 0.14 150)' : 'oklch(0.72 0.16 25)' }}>{s.score_us}–{s.score_them}</span>}
                <ChevronRight size={12} style={{ color: 'var(--fg-4)' }} />
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── SportCard (overview dashboard) ──────────────────────────────────────────
function SportCard({ sport, sessions, drills, roster, onSelect, onEdit, onArchive, onDelete }) {
  const sportSessions = sessions.filter((s) => s.sport_id === sport.id)
  const games         = sportSessions.filter((s) => s.type === 'game' || s.type === 'tournament')
  const wins          = games.filter((s) => s.score_us != null && s.score_them != null && s.score_us > s.score_them).length
  const losses        = games.filter((s) => s.score_us != null && s.score_them != null && s.score_us < s.score_them).length
  const draws         = games.filter((s) => s.score_us != null && s.score_them != null && s.score_us === s.score_them).length
  const sportDrills   = drills.filter((d) => d.sport_id === sport.id)
  const sportRoster   = roster.filter((r) => r.sport_id === sport.id)
  const upcomingCount = sportSessions.filter((s) => s.date && (isFuture(parseISO(s.date)) || isToday(parseISO(s.date)))).length
  const typeLabel     = SPORT_TYPES.find((t) => t.value === sport.sport_type)?.label ?? sport.sport_type
  const isArchived    = sport.status === 'archived'

  return (
    <div className="rounded-2xl overflow-hidden border" style={{ borderColor: 'var(--border)', background: 'var(--bg)', opacity: isArchived ? 0.7 : 1 }}>
      {/* Color bar + name */}
      <div className="px-4 py-3 flex items-center justify-between" style={{ background: sport.color + '18', borderBottom: `2px solid ${sport.color}` }}>
        <button className="flex-1 min-w-0 text-left" onClick={() => !isArchived && onSelect(sport.id)}>
          <p className="text-base font-bold truncate" style={{ color: 'var(--fg)' }}>{sport.name}</p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-[10px] font-medium" style={{ color: sport.color }}>{typeLabel}</span>
            {sport.season && <span className="text-[10px]" style={{ color: 'var(--fg-3)' }}>{sport.season}</span>}
            {sport.team_name && <span className="text-[10px]" style={{ color: 'var(--fg-4)' }}>{sport.team_name}</span>}
            {isArchived && <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'var(--fg-3)', color: 'var(--bg)' }}>Archived</span>}
          </div>
        </button>
        <div className="flex items-center gap-1 ml-2 flex-shrink-0">
          <button onClick={() => onEdit(sport)} className="p-1.5 rounded-lg" style={{ color: 'var(--fg-3)' }}><Edit2 size={13} /></button>
          <button onClick={() => onArchive(sport)} className="p-1.5 rounded-lg" title={isArchived ? 'Unarchive' : 'Archive'} style={{ color: 'var(--fg-3)' }}>
            {isArchived ? <RotateCcw size={13} /> : <Archive size={13} />}
          </button>
          <button onClick={() => onDelete(sport)} className="p-1.5 rounded-lg" style={{ color: 'var(--fg-3)' }}><Trash2 size={13} /></button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 divide-x" style={{ divideColor: 'var(--border)' }}>
        {[
          { label: 'Sessions', value: sportSessions.length },
          { label: games.length > 0 ? `${wins}W ${losses}L${draws > 0 ? ` ${draws}D` : ''}` : 'Record', value: games.length > 0 ? null : '—' },
          { label: 'Drills', value: sportDrills.length },
          { label: 'Players', value: sportRoster.length },
        ].map(({ label, value }, i) => (
          <div key={i} className="py-2 px-1 text-center" style={{ borderRight: i < 3 ? '1px solid var(--border)' : 'none' }}>
            <p className="text-sm font-bold" style={{ color: 'var(--fg)' }}>{value ?? ''}</p>
            <p className="text-[10px]" style={{ color: 'var(--fg-3)' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* League + goals */}
      {(sport.league || sport.goals) && (
        <div className="px-4 py-2 border-t" style={{ borderColor: 'var(--border)' }}>
          {sport.league && <p className="text-xs" style={{ color: 'var(--fg-3)' }}>League: {sport.league}</p>}
          {sport.goals  && <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--fg-4)' }}>Goal: {sport.goals}</p>}
        </div>
      )}

      {!isArchived && (
        <button onClick={() => onSelect(sport.id)} className="w-full py-2 text-xs font-medium flex items-center justify-center gap-1 border-t" style={{ borderColor: 'var(--border)', color: sport.color, background: sport.color + '08' }}>
          Open <ChevronRight size={12} />
        </button>
      )}
    </div>
  )
}

// ─── Main Sports page ─────────────────────────────────────────────────────────
export default function Sports() {
  const { user } = useAuthStore()
  const {
    sports, sessions, drills, equipment, roster,
    fetchSports, fetchSessions, fetchDrills, fetchEquipment, fetchRoster,
    updateSport, deleteSport,
    deleteSession, deleteDrill, deleteEquipment, deleteRosterMember,
    toggleEquipment, updateSession,
  } = useSportsStore()

  const [activeSportId, setActiveSportId] = useState(null) // null = overview
  const [showArchived,  setShowArchived]   = useState(false)
  const [tab, setTab]                      = useState('sessions')

  // Modals
  const [sportModal,   setSportModal]   = useState(null)
  const [sessionModal, setSessionModal] = useState(null)
  const [drillModal,   setDrillModal]   = useState(null)
  const [equipModal,   setEquipModal]   = useState(null)
  const [rosterModal,  setRosterModal]  = useState(null)
  const [drillSearch,  setDrillSearch]  = useState('')
  const [drillCat,     setDrillCat]     = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  useEffect(() => {
    if (!user) return
    fetchSports(user.id)
    fetchSessions(user.id)
    fetchDrills(user.id)
    fetchEquipment(user.id)
    fetchRoster(user.id)
  }, [user?.id])

  // Active sport object
  const activeSport      = sports.find((s) => s.id === activeSportId)
  const accentColor      = activeSport?.color ?? '#f97316'
  const drillCategories  = getDrillCategories(activeSport?.sport_type)
  const positions        = getPositions(activeSport?.sport_type)

  // Filtered data for active sport
  const sportSessions  = activeSportId ? sessions.filter((s)  => s.sport_id  === activeSportId) : sessions
  const sportDrills    = activeSportId ? drills.filter((d)    => d.sport_id  === activeSportId) : drills
  const sportEquipment = activeSportId ? equipment.filter((e) => e.sport_id  === activeSportId) : equipment
  const sportRoster    = activeSportId ? roster.filter((r)    => r.sport_id  === activeSportId) : roster

  // Stats for detail view
  const upcoming      = sportSessions.filter((s) => s.date && (isFuture(parseISO(s.date)) || isToday(parseISO(s.date)))).length
  const games         = sportSessions.filter((s) => s.type === 'game' || s.type === 'tournament')
  const wins          = games.filter((s) => s.score_us != null && s.score_them != null && s.score_us > s.score_them).length
  const gearAlerts    = sportEquipment.filter((e) => e.condition === 'needs_repair' || e.condition === 'replace').length

  const grouped = {
    upcoming: sportSessions.filter((s) => s.date && (isFuture(parseISO(s.date)) || isToday(parseISO(s.date)))).sort((a, b) => parseISO(a.date) - parseISO(b.date)),
    past:     sportSessions.filter((s) => !s.date || (isPast(parseISO(s.date)) && !isToday(parseISO(s.date)))).sort((a, b) => parseISO(b.date) - parseISO(a.date)),
  }

  const filteredDrills   = sportDrills.filter((d) => {
    const ms = !drillSearch || d.name.toLowerCase().includes(drillSearch.toLowerCase())
    const mc = !drillCat    || d.category === drillCat
    return ms && mc
  })
  const drillsByCategory = filteredDrills.reduce((acc, d) => {
    const cat = d.category || 'General'; acc[cat] = [...(acc[cat] ?? []), d]; return acc
  }, {})

  const visibleSports = sports.filter((s) => showArchived ? true : s.status === 'active')

  async function handleArchive(sport) {
    const next = sport.status === 'archived' ? 'active' : 'archived'
    const { error } = await updateSport(sport.id, { status: next })
    if (error) showToast({ message: 'Failed to update', variant: 'error' })
    else {
      showToast({ message: next === 'archived' ? 'Season archived' : 'Restored to active', variant: 'success' })
      if (activeSportId === sport.id && next === 'archived') setActiveSportId(null)
    }
  }

  function handleDelete(sport) {
    setDeleteConfirm({ type: 'sport', item: sport })
  }

  const DETAIL_TABS = [
    { value: 'sessions',  label: 'Sessions',  Icon: Calendar },
    { value: 'calendar',  label: 'Calendar',  Icon: Calendar },
    { value: 'drills',    label: 'Drills',    Icon: Target   },
    { value: 'gear',      label: 'Gear',      Icon: Wrench   },
    { value: 'roster',    label: 'Roster',    Icon: Users    },
    { value: 'info',      label: 'Info',      Icon: Settings2 },
  ]

  function detailAddLabel() {
    switch (tab) {
      case 'sessions': case 'calendar': return 'Add session'
      case 'drills':   return 'Add drill'
      case 'gear':     return 'Add gear'
      case 'roster':   return 'Add player'
      default:         return null
    }
  }
  function detailAdd() {
    switch (tab) {
      case 'sessions': case 'calendar': return setSessionModal('new')
      case 'drills':   return setDrillModal('new')
      case 'gear':     return setEquipModal('new')
      case 'roster':   return setRosterModal('new')
    }
  }

  return (
    <div className="max-w-3xl mx-auto w-full h-full flex flex-col overflow-hidden">

      {/* ── Header ── */}
      <div className="px-4 pt-4 pb-3 md:px-8 md:pt-6 border-b flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
        {activeSportId ? (
          /* Detail header */
          <>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 min-w-0">
                <button onClick={() => setActiveSportId(null)} className="flex items-center gap-1 text-xs flex-shrink-0" style={{ color: 'var(--fg-3)' }}>
                  <ChevronLeft size={14} /> All
                </button>
                <div className="w-px h-4 flex-shrink-0" style={{ background: 'var(--border)' }} />
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: accentColor }} />
                <div className="min-w-0">
                  <p className="text-base font-bold truncate leading-tight" style={{ color: 'var(--fg)' }}>{activeSport?.name}</p>
                  {activeSport?.season && <p className="text-[11px] leading-tight" style={{ color: 'var(--fg-3)' }}>{activeSport.season}{activeSport.team_name ? ` · ${activeSport.team_name}` : ''}</p>}
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                {detailAddLabel() && (
                  <button onClick={detailAdd}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium"
                    style={{ background: accentColor, color: '#fff' }}
                  ><Plus size={12} /> {detailAddLabel()}</button>
                )}
                <button onClick={() => setSportModal(activeSport)} className="p-1.5 rounded-lg" style={{ color: 'var(--fg-3)' }}><Settings2 size={14} /></button>
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-4 gap-2 mb-3">
              {[
                { label: 'Sessions', value: sportSessions.length, color: accentColor },
                { label: 'Wins', value: wins, color: 'oklch(0.72 0.14 150)' },
                { label: 'Upcoming', value: upcoming, color: 'oklch(0.74 0.14 65)' },
                { label: 'Gear alerts', value: gearAlerts, color: gearAlerts > 0 ? 'oklch(0.72 0.16 25)' : 'var(--fg-3)' },
              ].map(({ label, value, color }) => (
                <div key={label} className="rounded-xl p-2.5 text-center" style={{ background: 'var(--bg-3)' }}>
                  <div className="text-lg font-bold tabular-nums" style={{ color }}>{value}</div>
                  <div className="text-[10px] mt-0.5" style={{ color: 'var(--fg-3)' }}>{label}</div>
                </div>
              ))}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
              {DETAIL_TABS.map(({ value, label, Icon }) => (
                <button key={value} onClick={() => setTab(value)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap flex-shrink-0"
                  style={tab === value ? { background: accentColor + '20', color: accentColor } : { color: 'var(--fg-3)' }}
                ><Icon size={12} />{label}</button>
              ))}
            </div>
          </>
        ) : (
          /* Overview header */
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#f97316' + '25' }}>
                <Trophy size={15} style={{ color: '#f97316' }} />
              </div>
              <h1 className="text-xl font-bold" style={{ color: 'var(--fg)' }}>Sports</h1>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowArchived((v) => !v)} className="text-xs px-2.5 py-1.5 rounded-lg border"
                style={{ borderColor: 'var(--border)', color: showArchived ? 'var(--accent)' : 'var(--fg-3)', background: showArchived ? 'var(--accent)' + '15' : 'transparent' }}>
                {showArchived ? 'Hide archived' : 'Show archived'}
              </button>
              <button onClick={() => setSportModal('new')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                style={{ background: '#f97316', color: '#fff' }}
              ><Plus size={13} /> New Sport</button>
            </div>
          </div>
        )}
      </div>

      {/* ── Body ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 md:px-8 space-y-3">

        {/* ── Overview ── */}
        {!activeSportId && (
          <>
            {visibleSports.length === 0 && (
              <div className="text-center py-20 space-y-3">
                <Trophy size={40} className="mx-auto opacity-20" />
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--fg-2)' }}>No sports yet</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--fg-3)' }}>Create a sport to start tracking sessions, drills and your team.</p>
                </div>
                <button onClick={() => setSportModal('new')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium"
                  style={{ background: '#f97316', color: '#fff' }}
                ><Plus size={14} /> Create your first sport</button>
              </div>
            )}
            {visibleSports.map((sport) => (
              <SportCard key={sport.id}
                sport={sport} sessions={sessions} drills={drills} roster={roster}
                onSelect={setActiveSportId}
                onEdit={(s) => setSportModal(s)}
                onArchive={handleArchive}
                onDelete={handleDelete}
              />
            ))}
          </>
        )}

        {/* ── Detail: Sessions ── */}
        {activeSportId && tab === 'sessions' && (
          <div className="space-y-4">
            {sportSessions.length === 0 && (
              <div className="text-center py-16">
                <Calendar size={32} className="mx-auto opacity-20" />
                <p className="text-sm mt-2" style={{ color: 'var(--fg-3)' }}>No sessions yet.</p>
              </div>
            )}
            {grouped.upcoming.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--fg-3)' }}>Upcoming</p>
                <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-3)', border: '1px solid var(--border)' }}>
                  {grouped.upcoming.map((s, i) => (
                    <SessionRow key={s.id} session={s} last={i === grouped.upcoming.length - 1} accentColor={accentColor}
                      onEdit={() => setSessionModal(s)} onDelete={() => setDeleteConfirm({ type: 'session', item: s })} onToggle={() => updateSession(s.id, { completed: !s.completed })} />
                  ))}
                </div>
              </div>
            )}
            {grouped.past.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--fg-3)' }}>Past</p>
                <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-3)', border: '1px solid var(--border)' }}>
                  {grouped.past.map((s, i) => (
                    <SessionRow key={s.id} session={s} last={i === grouped.past.length - 1} accentColor={accentColor}
                      onEdit={() => setSessionModal(s)} onDelete={() => setDeleteConfirm({ type: 'session', item: s })} onToggle={() => updateSession(s.id, { completed: !s.completed })} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Detail: Calendar ── */}
        {activeSportId && tab === 'calendar' && (
          <SportsCalendar
            sessions={sportSessions}
            accentColor={accentColor}
            onAddSession={(date) => setSessionModal({ _preset_date: date })}
            onEditSession={(s) => setSessionModal(s)}
          />
        )}

        {/* ── Detail: Drills ── */}
        {activeSportId && tab === 'drills' && (
          <div>
            <div className="flex gap-2 mb-4">
              <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg border" style={{ background: 'var(--bg-3)', borderColor: 'var(--border)' }}>
                <Search size={13} style={{ color: 'var(--fg-4)', flexShrink: 0 }} />
                <input value={drillSearch} onChange={(e) => setDrillSearch(e.target.value)} placeholder="Search drills…"
                  className="flex-1 bg-transparent text-sm outline-none" style={{ color: 'var(--fg)' }} />
              </div>
              <select value={drillCat} onChange={(e) => setDrillCat(e.target.value)}
                className="px-2 py-2 rounded-lg text-xs border outline-none"
                style={{ background: 'var(--bg-3)', borderColor: 'var(--border)', color: 'var(--fg-2)' }}>
                <option value="">All</option>
                {drillCategories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            {filteredDrills.length === 0 && (
              <div className="text-center py-16">
                <Target size={32} className="mx-auto opacity-20" />
                <p className="text-sm mt-2" style={{ color: 'var(--fg-3)' }}>{drillSearch || drillCat ? 'No drills match.' : 'No drills yet.'}</p>
              </div>
            )}
            {Object.entries(drillsByCategory).map(([cat, items]) => (
              <div key={cat} className="mb-4">
                <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--fg-3)' }}>{cat}</p>
                <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-3)', border: '1px solid var(--border)' }}>
                  {items.map((d, i) => (
                    <DrillCard key={d.id} drill={d} last={i === items.length - 1} accentColor={accentColor}
                      onEdit={() => setDrillModal(d)} onDelete={() => setDeleteConfirm({ type: 'drill', item: d })} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Detail: Gear ── */}
        {activeSportId && tab === 'gear' && (
          <div>
            {sportEquipment.length === 0 && (
              <div className="text-center py-16">
                <Wrench size={32} className="mx-auto opacity-20" />
                <p className="text-sm mt-2" style={{ color: 'var(--fg-3)' }}>No equipment tracked.</p>
              </div>
            )}
            {sportEquipment.length > 0 && (
              <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-3)', border: '1px solid var(--border)' }}>
                {sportEquipment.map((e, i) => {
                  const cond = CONDITIONS.find((c) => c.value === e.condition)
                  return (
                    <div key={e.id} className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: i < sportEquipment.length - 1 ? '1px solid var(--hairline)' : 'none' }}>
                      <button onClick={() => toggleEquipment(e.id, !e.checked)} className="flex-shrink-0">
                        {e.checked ? <CheckCircle size={18} style={{ color: accentColor }} /> : <Circle size={18} style={{ color: 'var(--fg-4)' }} />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium" style={{ color: e.checked ? 'var(--fg-3)' : 'var(--fg)', textDecoration: e.checked ? 'line-through' : 'none' }}>{e.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {e.quantity > 1 && <span className="text-[10px]" style={{ color: 'var(--fg-4)' }}>×{e.quantity}</span>}
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: cond?.color + '20', color: cond?.color }}>{cond?.label}</span>
                          {e.notes && <span className="text-[10px] truncate" style={{ color: 'var(--fg-4)' }}>{e.notes}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setEquipModal(e)} className="p-1.5 rounded-lg" style={{ color: 'var(--fg-3)' }}><Edit2 size={12} /></button>
                        <button onClick={() => setDeleteConfirm({ type: 'equipment', item: e })} className="p-1.5 rounded-lg" style={{ color: 'var(--fg-3)' }}><Trash2 size={12} /></button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Detail: Roster ── */}
        {activeSportId && tab === 'roster' && (
          <div>
            {sportRoster.length === 0 && (
              <div className="text-center py-16">
                <Users size={32} className="mx-auto opacity-20" />
                <p className="text-sm mt-2" style={{ color: 'var(--fg-3)' }}>No players yet.</p>
              </div>
            )}
            {sportRoster.length > 0 && (
              <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-3)', border: '1px solid var(--border)' }}>
                {sportRoster.map((m, i) => (
                  <div key={m.id} className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: i < sportRoster.length - 1 ? '1px solid var(--hairline)' : 'none' }}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                      style={{ background: accentColor + '20', color: accentColor }}>
                      {m.number != null ? `#${m.number}` : <User size={14} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>{m.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {m.position && <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'var(--fg-2)', color: 'var(--fg-3)' }}>{m.position}</span>}
                        {m.notes && <span className="text-[10px] truncate" style={{ color: 'var(--fg-4)' }}>{m.notes}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setRosterModal(m)} className="p-1.5 rounded-lg" style={{ color: 'var(--fg-3)' }}><Edit2 size={12} /></button>
                      <button onClick={() => setDeleteConfirm({ type: 'roster', item: m })} className="p-1.5 rounded-lg" style={{ color: 'var(--fg-3)' }}><Trash2 size={12} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Detail: Info ── */}
        {activeSportId && tab === 'info' && activeSport && (
          <div className="rounded-xl overflow-hidden border" style={{ background: 'var(--bg-3)', borderColor: 'var(--border)' }}>
            {[
              { label: 'Sport type', value: SPORT_TYPES.find((t) => t.value === activeSport.sport_type)?.label },
              { label: 'Season',     value: activeSport.season },
              { label: 'Team',       value: activeSport.team_name },
              { label: 'League',     value: activeSport.league },
              { label: 'Status',     value: activeSport.status === 'archived' ? 'Archived' : 'Active' },
            ].filter((r) => r.value).map(({ label, value }, i, arr) => (
              <div key={label} className="flex items-center justify-between px-4 py-3" style={{ borderBottom: i < arr.length - 1 ? '1px solid var(--hairline)' : 'none' }}>
                <span className="text-sm" style={{ color: 'var(--fg-3)' }}>{label}</span>
                <span className="text-sm font-medium" style={{ color: 'var(--fg)' }}>{value}</span>
              </div>
            ))}
            {activeSport.goals && (
              <div className="px-4 py-3 border-t" style={{ borderColor: 'var(--hairline)' }}>
                <p className="text-xs font-medium mb-1" style={{ color: 'var(--fg-3)' }}>Season goals</p>
                <p className="text-sm" style={{ color: 'var(--fg)' }}>{activeSport.goals}</p>
              </div>
            )}
            <div className="px-4 py-3 border-t flex gap-2" style={{ borderColor: 'var(--hairline)' }}>
              <button onClick={() => handleArchive(activeSport)}
                className="flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--fg-2)' }}>
                {activeSport.status === 'archived' ? <><RotateCcw size={13} /> Restore</> : <><Archive size={13} /> Archive season</>}
              </button>
              <button onClick={() => handleDelete(activeSport)}
                className="py-2 px-4 rounded-lg text-sm font-medium flex items-center gap-1.5"
                style={{ background: 'oklch(0.72 0.16 25 / 0.12)', color: 'oklch(0.55 0.16 25)' }}>
                <Trash2 size={13} /> Delete
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {sportModal && (
        <SportModal
          sport={sportModal === 'new' ? null : sportModal}
          userId={user.id}
          onClose={() => setSportModal(null)}
        />
      )}
      {sessionModal && (
        <SessionModal
          session={sessionModal === 'new' ? null : (sessionModal._preset_date ? null : sessionModal)}
          presetDate={sessionModal._preset_date ?? null}
          sportId={activeSportId}
          userId={user.id}
          onClose={() => setSessionModal(null)}
        />
      )}
      {drillModal && (
        <DrillModal
          drill={drillModal === 'new' ? null : drillModal}
          sportId={activeSportId}
          drillCategories={drillCategories}
          userId={user.id}
          onClose={() => setDrillModal(null)}
        />
      )}
      {equipModal && (
        <EquipmentModal
          item={equipModal === 'new' ? null : equipModal}
          sportId={activeSportId}
          userId={user.id}
          onClose={() => setEquipModal(null)}
        />
      )}
      {rosterModal && (
        <RosterModal
          member={rosterModal === 'new' ? null : rosterModal}
          sportId={activeSportId}
          positions={positions}
          userId={user.id}
          onClose={() => setRosterModal(null)}
        />
      )}

      <ConfirmDeleteModal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => {
          const dc = deleteConfirm
          if (dc.type === 'sport') {
            if (activeSportId === dc.item.id) setActiveSportId(null)
            deleteSport(dc.item.id).then(({ error }) => {
              if (error) showToast({ message: 'Delete failed', variant: 'error' })
              else showToast({ message: 'Sport deleted', variant: 'success' })
            })
          } else if (dc.type === 'session') {
            deleteSession(dc.item.id)
          } else if (dc.type === 'drill') {
            deleteDrill(dc.item.id)
          } else if (dc.type === 'equipment') {
            deleteEquipment(dc.item.id)
          } else if (dc.type === 'roster') {
            deleteRosterMember(dc.item.id)
          }
        }}
        title={
          deleteConfirm?.type === 'sport'     ? `Delete "${deleteConfirm.item?.name}"?` :
          deleteConfirm?.type === 'session'   ? 'Delete session?' :
          deleteConfirm?.type === 'drill'     ? `Delete "${deleteConfirm.item?.name}"?` :
          deleteConfirm?.type === 'equipment' ? `Delete "${deleteConfirm.item?.name}"?` :
          deleteConfirm?.type === 'roster'    ? `Remove ${deleteConfirm.item?.name}?` : 'Delete?'
        }
        description={
          deleteConfirm?.type === 'sport'     ? 'This will also remove all its sessions, drills, gear and roster.' :
          deleteConfirm?.type === 'session'   ? 'This session will be permanently removed.' :
          deleteConfirm?.type === 'drill'     ? 'This drill will be permanently removed.' :
          deleteConfirm?.type === 'equipment' ? 'This gear item will be permanently removed.' :
          'This player will be removed from the roster.'
        }
        confirmLabel={deleteConfirm?.type === 'roster' ? 'Remove' : 'Delete'}
      />
    </div>
  )
}
