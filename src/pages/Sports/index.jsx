import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  format, isPast, isToday, isFuture, parseISO,
  startOfMonth, endOfMonth, eachDayOfInterval, getDay,
  addMonths, subMonths, isSameDay, isSameMonth,
} from 'date-fns'
import {
  Trophy, Package, Plus, X, Calendar, MapPin,
  Check, Trash2, Edit2, CheckCircle, Circle,
  Target, Wrench, Search, Youtube, ExternalLink,
  ChevronLeft, ChevronRight, Users, User,
} from 'lucide-react'
import { useSportsStore } from '../../stores/useSportsStore'
import { useAuthStore } from '../../stores/useAuthStore'
import { showToast } from '../../lib/toast'

// ─── constants ────────────────────────────────────────────────────────────────
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
const DRILL_CATEGORIES = ['Conditioning', 'Technique', 'Strategy', 'Teamwork', 'Speed', 'Strength', 'Agility', 'Other']
const SKILL_LEVELS = [
  { value: 'all',          label: 'All levels' },
  { value: 'beginner',     label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced',     label: 'Advanced' },
]

function typeColor(t) { return SESSION_TYPES.find((x) => x.value === t)?.color ?? 'var(--fg-3)' }
function condColor(c) { return CONDITIONS.find((x) => x.value === c)?.color ?? 'var(--fg-3)' }

// ─── YouTube helpers ──────────────────────────────────────────────────────────
function extractYouTubeId(url) {
  if (!url) return null
  const patterns = [
    /youtube\.com\/watch\?v=([^&\s]+)/,
    /youtu\.be\/([^?\s]+)/,
    /youtube\.com\/shorts\/([^?\s]+)/,
    /youtube\.com\/embed\/([^?\s]+)/,
  ]
  for (const pat of patterns) {
    const m = url.match(pat)
    if (m) return m[1]
  }
  return null
}
function isValidYouTubeUrl(url) { return url ? !!extractYouTubeId(url) : true }
function getYouTubeThumbnail(url) {
  const id = extractYouTubeId(url)
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null
}
function getYouTubeWatchUrl(url) {
  const id = extractYouTubeId(url)
  return id ? `https://www.youtube.com/watch?v=${id}` : url
}

// ─── SessionModal ─────────────────────────────────────────────────────────────
function SessionModal({ session, presetDate, onClose, userId }) {
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

  async function save() {
    if (!form.title.trim()) return
    setSaving(true)
    const row = {
      user_id:    userId,
      type:       form.type,
      title:      form.title.trim(),
      date:       form.date || null,
      location:   form.location.trim() || null,
      notes:      form.notes.trim() || null,
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

  const isGame = form.type === 'game' || form.type === 'tournament'

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center" style={{ zIndex: 500 }} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full sm:max-w-md bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-2xl p-5 space-y-4" style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold" style={{ color: 'var(--fg)' }}>{session ? 'Edit Session' : 'Add Session'}</h3>
          <button onClick={onClose} className="p-1 rounded-lg" style={{ color: 'var(--fg-3)' }}><X size={16} /></button>
        </div>

        <div className="flex gap-1.5">
          {SESSION_TYPES.map((t) => (
            <button key={t.value} onClick={() => setForm((f) => ({ ...f, type: t.value }))}
              className="flex-1 py-1.5 rounded-lg text-xs font-medium border"
              style={form.type === t.value
                ? { background: t.color + '25', color: t.color, borderColor: t.color + '60' }
                : { background: 'var(--bg-3)', color: 'var(--fg-2)', borderColor: 'var(--border)' }
              }
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
            <input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
              placeholder="Field / gym"
              className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
              style={{ background: 'var(--bg-3)', borderColor: 'var(--border)', color: 'var(--fg)' }}
            />
          </div>
        </div>

        {isGame && (
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--fg-3)' }}>Score</label>
            <div className="flex items-center gap-2">
              <input type="number" value={form.score_us} onChange={(e) => setForm((f) => ({ ...f, score_us: e.target.value }))}
                placeholder="Us" min="0"
                className="flex-1 px-3 py-2 rounded-lg text-sm border text-center outline-none"
                style={{ background: 'var(--bg-3)', borderColor: 'var(--border)', color: 'var(--fg)' }}
              />
              <span style={{ color: 'var(--fg-3)' }}>—</span>
              <input type="number" value={form.score_them} onChange={(e) => setForm((f) => ({ ...f, score_them: e.target.value }))}
                placeholder="Them" min="0"
                className="flex-1 px-3 py-2 rounded-lg text-sm border text-center outline-none"
                style={{ background: 'var(--bg-3)', borderColor: 'var(--border)', color: 'var(--fg)' }}
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--fg-3)' }}>Attendance</label>
            <input type="number" value={form.attendance} onChange={(e) => setForm((f) => ({ ...f, attendance: e.target.value }))}
              placeholder="# players" min="0"
              className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
              style={{ background: 'var(--bg-3)', borderColor: 'var(--border)', color: 'var(--fg)' }}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--fg-3)' }}>Notes / Strategy</label>
          <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            rows={3} placeholder="Strategy, observations, game plan…"
            className="w-full px-3 py-2 rounded-lg text-sm border outline-none resize-none"
            style={{ background: 'var(--bg-3)', borderColor: 'var(--border)', color: 'var(--fg)' }}
          />
        </div>

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
function DrillModal({ drill, onClose, userId }) {
  const { addDrill, updateDrill, drills } = useSportsStore()
  const [form, setForm] = useState({
    name:             drill?.name             ?? '',
    category:         drill?.category         ?? '',
    skill_level:      drill?.skill_level      ?? 'all',
    duration_minutes: drill?.duration_minutes ?? '',
    description:      drill?.description      ?? '',
    youtube_url:      drill?.youtube_url      ?? '',
  })
  const [saving, setSaving]         = useState(false)
  const [ytError, setYtError]       = useState(false)
  const [thumbLoaded, setThumbLoaded] = useState(false)

  const thumbUrl = getYouTubeThumbnail(form.youtube_url)

  function handleYtChange(val) {
    setForm((f) => ({ ...f, youtube_url: val }))
    setYtError(val.trim() !== '' && !isValidYouTubeUrl(val))
    setThumbLoaded(false)
  }

  async function save() {
    if (!form.name.trim() || ytError) return
    setSaving(true)
    const row = {
      user_id:          userId,
      name:             form.name.trim(),
      category:         form.category || null,
      skill_level:      form.skill_level,
      duration_minutes: form.duration_minutes !== '' ? Number(form.duration_minutes) : null,
      description:      form.description.trim() || null,
      youtube_url:      form.youtube_url.trim() || null,
      position:         drill ? drill.position : drills.length,
    }
    const { error } = drill ? await updateDrill(drill.id, row) : await addDrill(row)
    setSaving(false)
    if (error) { showToast({ message: 'Save failed', variant: 'error' }); return }
    showToast({ message: drill ? 'Drill updated' : 'Drill added', variant: 'success' })
    onClose()
  }

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center" style={{ zIndex: 500 }} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full sm:max-w-md bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-2xl p-5 space-y-4" style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold" style={{ color: 'var(--fg)' }}>{drill ? 'Edit Drill' : 'Add Drill'}</h3>
          <button onClick={onClose} className="p-1 rounded-lg" style={{ color: 'var(--fg-3)' }}><X size={16} /></button>
        </div>

        <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="Drill name" autoFocus
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
              {DRILL_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--fg-3)' }}>Skill Level</label>
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
          <input type="number" value={form.duration_minutes} onChange={(e) => setForm((f) => ({ ...f, duration_minutes: e.target.value }))}
            placeholder="15" min="1"
            className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
            style={{ background: 'var(--bg-3)', borderColor: 'var(--border)', color: 'var(--fg)' }}
          />
        </div>

        <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          rows={3} placeholder="Instructions, setup, coaching notes…"
          className="w-full px-3 py-2 rounded-lg text-sm border outline-none resize-none"
          style={{ background: 'var(--bg-3)', borderColor: 'var(--border)', color: 'var(--fg)' }}
        />

        {/* YouTube URL */}
        <div>
          <label className="block text-xs font-medium mb-1 flex items-center gap-1" style={{ color: 'var(--fg-3)' }}>
            <Youtube size={11} /> YouTube video link (optional)
          </label>
          <input
            value={form.youtube_url}
            onChange={(e) => handleYtChange(e.target.value)}
            placeholder="https://youtube.com/watch?v=…"
            className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
            style={{
              background: 'var(--bg-3)',
              borderColor: ytError ? 'oklch(0.72 0.16 25)' : 'var(--border)',
              color: 'var(--fg)',
            }}
          />
          {ytError && <p className="text-xs mt-1" style={{ color: 'oklch(0.72 0.16 25)' }}>Not a valid YouTube URL</p>}

          {/* Thumbnail preview */}
          {thumbUrl && !ytError && (
            <div className="mt-2 rounded-lg overflow-hidden relative" style={{ background: '#000', aspectRatio: '16/9' }}>
              <img
                src={thumbUrl}
                alt="Video thumbnail"
                className="w-full h-full object-cover"
                onLoad={() => setThumbLoaded(true)}
                onError={() => setThumbLoaded(false)}
                style={{ opacity: thumbLoaded ? 1 : 0 }}
              />
              {thumbLoaded && (
                <a
                  href={getYouTubeWatchUrl(form.youtube_url)}
                  target="_blank" rel="noopener noreferrer"
                  className="absolute inset-0 flex items-center justify-center"
                  style={{ background: 'rgba(0,0,0,0.35)' }}
                >
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
function EquipmentModal({ item, onClose, userId }) {
  const { addEquipment, updateEquipment } = useSportsStore()
  const [form, setForm] = useState({
    name:      item?.name      ?? '',
    quantity:  item?.quantity  ?? 1,
    condition: item?.condition ?? 'good',
    notes:     item?.notes     ?? '',
  })
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!form.name.trim()) return
    setSaving(true)
    const row = {
      user_id:   userId,
      name:      form.name.trim(),
      quantity:  Number(form.quantity) || 1,
      condition: form.condition,
      notes:     form.notes.trim() || null,
    }
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
          <button onClick={onClose} className="p-1 rounded-lg" style={{ color: 'var(--fg-3)' }}><X size={16} /></button>
        </div>
        <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="Equipment name" autoFocus
          className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
          style={{ background: 'var(--bg-3)', borderColor: 'var(--border)', color: 'var(--fg)' }}
        />
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--fg-3)' }}>Quantity</label>
            <input type="number" value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
              min="1"
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
        <input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          placeholder="Notes (optional)"
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
function RosterModal({ member, onClose, userId }) {
  const { addRosterMember, updateRosterMember } = useSportsStore()
  const [form, setForm] = useState({
    name:     member?.name     ?? '',
    position: member?.position ?? '',
    number:   member?.number   ?? '',
    notes:    member?.notes    ?? '',
  })
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!form.name.trim()) return
    setSaving(true)
    const row = {
      user_id:  userId,
      name:     form.name.trim(),
      position: form.position.trim() || null,
      number:   form.number !== '' ? Number(form.number) : null,
      notes:    form.notes.trim() || null,
    }
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
          <button onClick={onClose} className="p-1 rounded-lg" style={{ color: 'var(--fg-3)' }}><X size={16} /></button>
        </div>
        <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="Player name" autoFocus
          className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
          style={{ background: 'var(--bg-3)', borderColor: 'var(--border)', color: 'var(--fg)' }}
        />
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--fg-3)' }}>Position</label>
            <input value={form.position} onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))}
              placeholder="e.g. Forward"
              className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
              style={{ background: 'var(--bg-3)', borderColor: 'var(--border)', color: 'var(--fg)' }}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--fg-3)' }}>Jersey #</label>
            <input type="number" value={form.number} onChange={(e) => setForm((f) => ({ ...f, number: e.target.value }))}
              placeholder="10" min="0"
              className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
              style={{ background: 'var(--bg-3)', borderColor: 'var(--border)', color: 'var(--fg)' }}
            />
          </div>
        </div>
        <input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          placeholder="Notes (optional)"
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
function SessionRow({ session, last, onEdit, onDelete, onToggle }) {
  const typeInfo = SESSION_TYPES.find((t) => t.value === session.type)
  const hasScore = session.score_us != null && session.score_them != null
  const won      = hasScore && session.score_us > session.score_them
  const drew     = hasScore && session.score_us === session.score_them

  return (
    <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: last ? 'none' : '1px solid var(--hairline)' }}>
      <button onClick={onToggle} className="flex-shrink-0">
        {session.completed
          ? <CheckCircle size={18} style={{ color: 'oklch(0.72 0.14 150)' }} />
          : <Circle size={18} style={{ color: 'var(--fg-4)' }} />
        }
      </button>
      <div className="w-1 self-stretch rounded-full flex-shrink-0" style={{ background: typeInfo?.color }} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium" style={{ color: session.completed ? 'var(--fg-3)' : 'var(--fg)' }}>{session.title}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ background: typeInfo?.color + '20', color: typeInfo?.color }}>{typeInfo?.label}</span>
          {session.date && <span className="text-[10px]" style={{ color: 'var(--fg-3)' }}>{format(parseISO(session.date), 'MMM d, yyyy')}</span>}
          {session.location && <span className="text-[10px] flex items-center gap-0.5" style={{ color: 'var(--fg-4)' }}><MapPin size={9} />{session.location}</span>}
          {session.attendance != null && <span className="text-[10px] flex items-center gap-0.5" style={{ color: 'var(--fg-4)' }}><Users size={9} />{session.attendance}</span>}
          {hasScore && (
            <span className="text-[10px] font-semibold font-mono" style={{ color: drew ? 'var(--fg-3)' : won ? 'oklch(0.72 0.14 150)' : 'oklch(0.72 0.16 25)' }}>
              {session.score_us}–{session.score_them} {drew ? 'D' : won ? 'W' : 'L'}
            </span>
          )}
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
function DrillCard({ drill, last, onEdit, onDelete }) {
  const [thumbOk, setThumbOk] = useState(false)
  const thumb = getYouTubeThumbnail(drill.youtube_url)

  return (
    <div style={{ borderBottom: last ? 'none' : '1px solid var(--hairline)' }}>
      <div className="flex items-start gap-3 px-4 py-3">
        {/* Thumbnail */}
        {thumb ? (
          <a
            href={getYouTubeWatchUrl(drill.youtube_url)}
            target="_blank" rel="noopener noreferrer"
            className="flex-shrink-0 rounded-lg overflow-hidden relative"
            style={{ width: 72, height: 48, background: '#000' }}
          >
            <img
              src={thumb}
              alt=""
              className="w-full h-full object-cover"
              onLoad={() => setThumbOk(true)}
              style={{ opacity: thumbOk ? 1 : 0 }}
            />
            {thumbOk && (
              <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.3)' }}>
                <div style={{ width: 0, height: 0, borderTop: '5px solid transparent', borderBottom: '5px solid transparent', borderLeft: '9px solid #fff', marginLeft: 2 }} />
              </div>
            )}
            {!thumbOk && <div className="absolute inset-0 flex items-center justify-center"><Youtube size={18} color="#fff" /></div>}
          </a>
        ) : (
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: 'oklch(0.72 0.14 25 / 0.12)' }}>
            <Target size={14} style={{ color: 'oklch(0.72 0.14 25)' }} />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>{drill.name}</p>
          <div className="flex flex-wrap gap-1.5 mt-0.5">
            {drill.category && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'oklch(0.72 0.14 25 / 0.12)', color: 'oklch(0.55 0.14 25)' }}>{drill.category}</span>
            )}
            {drill.skill_level && drill.skill_level !== 'all' && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'var(--fg-2)', color: 'var(--fg-3)' }}>{drill.skill_level}</span>
            )}
            {drill.duration_minutes && (
              <span className="text-[10px]" style={{ color: 'var(--fg-4)' }}>{drill.duration_minutes} min</span>
            )}
          </div>
          {drill.description && <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--fg-3)' }}>{drill.description}</p>}
          {drill.youtube_url && (
            <a
              href={getYouTubeWatchUrl(drill.youtube_url)}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 mt-1 text-xs"
              style={{ color: '#ff0000' }}
            >
              <Youtube size={11} /> Watch on YouTube
            </a>
          )}
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
function SportsCalendar({ sessions, onAddSession, onEditSession }) {
  const [month, setMonth] = useState(new Date())
  const start  = startOfMonth(month)
  const end    = endOfMonth(month)
  const days   = eachDayOfInterval({ start, end })
  const blanks = getDay(start) // 0=Sun

  const sessionsByDate = sessions.reduce((acc, s) => {
    if (!s.date) return acc
    const key = s.date.slice(0, 10)
    acc[key] = [...(acc[key] ?? []), s]
    return acc
  }, {})

  const [selected, setSelected] = useState(null)
  const selectedSessions = selected ? (sessionsByDate[selected] ?? []) : []

  return (
    <div>
      {/* Month nav */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setMonth((m) => subMonths(m, 1))} className="p-1.5 rounded-lg" style={{ color: 'var(--fg-3)' }}><ChevronLeft size={16} /></button>
        <span className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>{format(month, 'MMMM yyyy')}</span>
        <button onClick={() => setMonth((m) => addMonths(m, 1))} className="p-1.5 rounded-lg" style={{ color: 'var(--fg-3)' }}><ChevronRight size={16} /></button>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 mb-1">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
          <div key={d} className="text-center text-[10px] font-semibold py-1" style={{ color: 'var(--fg-4)' }}>{d}</div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-px" style={{ background: 'var(--border)' }}>
        {/* blank leading cells */}
        {Array.from({ length: blanks }).map((_, i) => (
          <div key={`b${i}`} style={{ background: 'var(--bg-3)', minHeight: 52 }} />
        ))}
        {days.map((day) => {
          const key      = format(day, 'yyyy-MM-dd')
          const daySess  = sessionsByDate[key] ?? []
          const isT      = isToday(day)
          const isSel    = selected === key
          return (
            <button
              key={key}
              onClick={() => setSelected(isSel ? null : key)}
              style={{
                background:  isSel ? 'oklch(0.72 0.14 25 / 0.12)' : 'var(--bg)',
                minHeight:   52,
                padding:     '4px',
                textAlign:   'left',
                verticalAlign: 'top',
                border:      0,
                cursor:      'pointer',
              }}
            >
              <span
                className="text-xs font-medium flex items-center justify-center w-5 h-5 rounded-full"
                style={{
                  background: isT ? 'oklch(0.72 0.14 25)' : 'transparent',
                  color:      isT ? '#fff' : isSameMonth(day, month) ? 'var(--fg)' : 'var(--fg-4)',
                }}
              >
                {format(day, 'd')}
              </span>
              <div className="mt-0.5 flex flex-col gap-px">
                {daySess.slice(0, 2).map((s) => (
                  <span
                    key={s.id}
                    className="block text-[9px] truncate px-1 rounded"
                    style={{ background: typeColor(s.type) + '25', color: typeColor(s.type) }}
                  >
                    {s.title}
                  </span>
                ))}
                {daySess.length > 2 && (
                  <span className="text-[9px]" style={{ color: 'var(--fg-4)' }}>+{daySess.length - 2}</span>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Selected day detail */}
      {selected && (
        <div className="mt-4 rounded-xl p-3 space-y-2" style={{ background: 'var(--bg-3)', border: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold" style={{ color: 'var(--fg-3)' }}>{format(parseISO(selected), 'EEEE, MMMM d')}</p>
            <button
              onClick={() => onAddSession(selected)}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg"
              style={{ background: 'var(--accent)', color: '#0b1220' }}
            >
              <Plus size={11} /> Add
            </button>
          </div>
          {selectedSessions.length === 0 && (
            <p className="text-xs" style={{ color: 'var(--fg-4)' }}>No sessions — tap Add to schedule one.</p>
          )}
          {selectedSessions.map((s) => {
            const ti = SESSION_TYPES.find((t) => t.value === s.type)
            const hasScore = s.score_us != null && s.score_them != null
            const won = hasScore && s.score_us > s.score_them
            return (
              <button
                key={s.id}
                onClick={() => onEditSession(s)}
                className="w-full flex items-center gap-2 text-left rounded-lg px-2 py-1.5"
                style={{ background: ti?.color + '15', border: `1px solid ${ti?.color}40` }}
              >
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

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Sports() {
  const { user } = useAuthStore()
  const {
    sessions, drills, equipment, roster,
    fetchSessions, fetchDrills, fetchEquipment, fetchRoster,
    deleteSession, deleteDrill, deleteEquipment, deleteRosterMember,
    toggleEquipment, updateSession,
  } = useSportsStore()

  const [tab, setTab] = useState('sessions')
  const [sessionModal, setSessionModal] = useState(null)
  const [drillModal, setDrillModal]     = useState(null)
  const [equipModal, setEquipModal]     = useState(null)
  const [rosterModal, setRosterModal]   = useState(null)
  const [drillSearch, setDrillSearch]   = useState('')
  const [drillCat, setDrillCat]         = useState('')

  useEffect(() => {
    if (!user) return
    fetchSessions(user.id)
    fetchDrills(user.id)
    fetchEquipment(user.id)
    fetchRoster(user.id)
  }, [user?.id])

  // ── stats ──
  const totalSessions    = sessions.length
  const wins             = sessions.filter((s) => s.score_us != null && s.score_them != null && s.score_us > s.score_them).length
  const upcoming         = sessions.filter((s) => s.date && (isFuture(parseISO(s.date)) || isToday(parseISO(s.date)))).length
  const needsAttention   = equipment.filter((e) => e.condition === 'needs_repair' || e.condition === 'replace').length

  const grouped = {
    upcoming: sessions.filter((s) => s.date && (isFuture(parseISO(s.date)) || isToday(parseISO(s.date)))).sort((a, b) => parseISO(a.date) - parseISO(b.date)),
    past:     sessions.filter((s) => !s.date || (isPast(parseISO(s.date)) && !isToday(parseISO(s.date)))).sort((a, b) => parseISO(b.date) - parseISO(a.date)),
  }

  // Filtered drills
  const filteredDrills = drills.filter((d) => {
    const matchSearch = !drillSearch || d.name.toLowerCase().includes(drillSearch.toLowerCase()) || (d.description ?? '').toLowerCase().includes(drillSearch.toLowerCase())
    const matchCat    = !drillCat || d.category === drillCat
    return matchSearch && matchCat
  })

  const drillsByCategory = filteredDrills.reduce((acc, d) => {
    const cat = d.category || 'General'
    acc[cat] = [...(acc[cat] ?? []), d]
    return acc
  }, {})

  const TABS = [
    { value: 'sessions',  label: 'Sessions',  Icon: Calendar },
    { value: 'calendar',  label: 'Calendar',  Icon: Calendar },
    { value: 'drills',    label: 'Drills',    Icon: Target   },
    { value: 'gear',      label: 'Gear',      Icon: Wrench   },
    { value: 'roster',    label: 'Roster',    Icon: Users    },
  ]

  function addButtonLabel() {
    switch (tab) {
      case 'sessions':  return 'Add session'
      case 'calendar':  return 'Add session'
      case 'drills':    return 'Add drill'
      case 'gear':      return 'Add gear'
      case 'roster':    return 'Add player'
      default:          return 'Add'
    }
  }

  function handleAdd() {
    switch (tab) {
      case 'sessions': case 'calendar': return setSessionModal('new')
      case 'drills':   return setDrillModal('new')
      case 'gear':     return setEquipModal('new')
      case 'roster':   return setRosterModal('new')
    }
  }

  return (
    <div className="max-w-3xl mx-auto w-full h-full flex flex-col overflow-hidden">

      {/* Header */}
      <div className="px-4 pt-4 pb-3 md:px-8 md:pt-6 border-b flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'oklch(0.72 0.14 25 / 0.15)' }}>
              <Trophy size={15} style={{ color: 'oklch(0.72 0.14 25)' }} />
            </div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--fg)' }}>Sports</h1>
          </div>
          <button onClick={handleAdd}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ background: 'oklch(0.72 0.14 25)', color: '#fff' }}
          >
            <Plus size={13} /> {addButtonLabel()}
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[
            { label: 'Sessions',    value: totalSessions,  color: 'oklch(0.72 0.14 25)'  },
            { label: 'Wins',        value: wins,           color: 'oklch(0.72 0.14 150)' },
            { label: 'Upcoming',    value: upcoming,       color: 'oklch(0.74 0.14 65)'  },
            { label: 'Gear alerts', value: needsAttention, color: needsAttention > 0 ? 'oklch(0.72 0.16 25)' : 'var(--fg-3)' },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-xl p-3 text-center" style={{ background: 'var(--bg-3)' }}>
              <div className="text-xl font-bold tabular-nums" style={{ color }}>{value}</div>
              <div className="text-[10px] mt-0.5" style={{ color: 'var(--fg-3)' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {TABS.map(({ value, label, Icon }) => (
            <button key={value} onClick={() => setTab(value)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap flex-shrink-0 transition-colors"
              style={tab === value
                ? { background: 'oklch(0.72 0.14 25 / 0.15)', color: 'oklch(0.55 0.14 25)' }
                : { color: 'var(--fg-3)' }
              }
            ><Icon size={12} />{label}</button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-4 md:px-8 space-y-4">

        {/* ── Sessions list ── */}
        {tab === 'sessions' && (
          <div className="space-y-4">
            {sessions.length === 0 && (
              <div className="text-center py-16 space-y-2">
                <Calendar size={32} className="mx-auto opacity-20" />
                <p className="text-sm" style={{ color: 'var(--fg-3)' }}>No sessions yet. Add a practice or game.</p>
              </div>
            )}
            {grouped.upcoming.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--fg-3)' }}>Upcoming</p>
                <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-3)', border: '1px solid var(--border)' }}>
                  {grouped.upcoming.map((s, i) => (
                    <SessionRow key={s.id} session={s} last={i === grouped.upcoming.length - 1}
                      onEdit={() => setSessionModal(s)}
                      onDelete={() => deleteSession(s.id)}
                      onToggle={() => updateSession(s.id, { completed: !s.completed })}
                    />
                  ))}
                </div>
              </div>
            )}
            {grouped.past.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--fg-3)' }}>Past</p>
                <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-3)', border: '1px solid var(--border)' }}>
                  {grouped.past.map((s, i) => (
                    <SessionRow key={s.id} session={s} last={i === grouped.past.length - 1}
                      onEdit={() => setSessionModal(s)}
                      onDelete={() => deleteSession(s.id)}
                      onToggle={() => updateSession(s.id, { completed: !s.completed })}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Calendar ── */}
        {tab === 'calendar' && (
          <SportsCalendar
            sessions={sessions}
            onAddSession={(date) => setSessionModal({ _preset_date: date })}
            onEditSession={(s) => setSessionModal(s)}
          />
        )}

        {/* ── Drills ── */}
        {tab === 'drills' && (
          <div>
            {/* Search + filter */}
            <div className="flex gap-2 mb-4">
              <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg border" style={{ background: 'var(--bg-3)', borderColor: 'var(--border)' }}>
                <Search size={13} style={{ color: 'var(--fg-4)', flexShrink: 0 }} />
                <input
                  value={drillSearch}
                  onChange={(e) => setDrillSearch(e.target.value)}
                  placeholder="Search drills…"
                  className="flex-1 bg-transparent text-sm outline-none"
                  style={{ color: 'var(--fg)' }}
                />
              </div>
              <select
                value={drillCat}
                onChange={(e) => setDrillCat(e.target.value)}
                className="px-2 py-2 rounded-lg text-xs border outline-none"
                style={{ background: 'var(--bg-3)', borderColor: 'var(--border)', color: 'var(--fg-2)' }}
              >
                <option value="">All categories</option>
                {DRILL_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {filteredDrills.length === 0 && (
              <div className="text-center py-16 space-y-2">
                <Target size={32} className="mx-auto opacity-20" />
                <p className="text-sm" style={{ color: 'var(--fg-3)' }}>{drillSearch || drillCat ? 'No drills match your filter.' : 'No drills yet. Build your drill library.'}</p>
              </div>
            )}

            {Object.entries(drillsByCategory).map(([cat, items]) => (
              <div key={cat} className="mb-4">
                <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--fg-3)' }}>{cat}</p>
                <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-3)', border: '1px solid var(--border)' }}>
                  {items.map((d, i) => (
                    <DrillCard key={d.id} drill={d} last={i === items.length - 1}
                      onEdit={() => setDrillModal(d)}
                      onDelete={() => deleteDrill(d.id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Gear ── */}
        {tab === 'gear' && (
          <div>
            {equipment.length === 0 && (
              <div className="text-center py-16 space-y-2">
                <Wrench size={32} className="mx-auto opacity-20" />
                <p className="text-sm" style={{ color: 'var(--fg-3)' }}>No equipment tracked. Add your gear.</p>
              </div>
            )}
            {equipment.length > 0 && (
              <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-3)', border: '1px solid var(--border)' }}>
                {equipment.map((e, i) => {
                  const cond = CONDITIONS.find((c) => c.value === e.condition)
                  return (
                    <div key={e.id} className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: i < equipment.length - 1 ? '1px solid var(--hairline)' : 'none' }}>
                      <button onClick={() => toggleEquipment(e.id, !e.checked)} className="flex-shrink-0">
                        {e.checked
                          ? <CheckCircle size={18} style={{ color: 'oklch(0.72 0.14 150)' }} />
                          : <Circle size={18} style={{ color: 'var(--fg-4)' }} />
                        }
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
                        <button onClick={() => deleteEquipment(e.id)} className="p-1.5 rounded-lg" style={{ color: 'var(--fg-3)' }}><Trash2 size={12} /></button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Roster ── */}
        {tab === 'roster' && (
          <div>
            {roster.length === 0 && (
              <div className="text-center py-16 space-y-2">
                <Users size={32} className="mx-auto opacity-20" />
                <p className="text-sm" style={{ color: 'var(--fg-3)' }}>No players yet. Add your team roster.</p>
              </div>
            )}
            {roster.length > 0 && (
              <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-3)', border: '1px solid var(--border)' }}>
                {roster.map((m, i) => (
                  <div key={m.id} className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: i < roster.length - 1 ? '1px solid var(--hairline)' : 'none' }}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold" style={{ background: 'oklch(0.72 0.14 25 / 0.15)', color: 'oklch(0.55 0.14 25)' }}>
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
                      <button onClick={() => deleteRosterMember(m.id)} className="p-1.5 rounded-lg" style={{ color: 'var(--fg-3)' }}><Trash2 size={12} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {sessionModal && (
        <SessionModal
          session={sessionModal === 'new' ? null : (sessionModal._preset_date ? null : sessionModal)}
          presetDate={sessionModal._preset_date ?? null}
          userId={user.id}
          onClose={() => setSessionModal(null)}
        />
      )}
      {drillModal && (
        <DrillModal
          drill={drillModal === 'new' ? null : drillModal}
          userId={user.id}
          onClose={() => setDrillModal(null)}
        />
      )}
      {equipModal && (
        <EquipmentModal
          item={equipModal === 'new' ? null : equipModal}
          userId={user.id}
          onClose={() => setEquipModal(null)}
        />
      )}
      {rosterModal && (
        <RosterModal
          member={rosterModal === 'new' ? null : rosterModal}
          userId={user.id}
          onClose={() => setRosterModal(null)}
        />
      )}
    </div>
  )
}
