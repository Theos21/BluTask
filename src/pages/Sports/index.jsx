import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { format, isPast, isToday, isFuture, parseISO } from 'date-fns'
import {
  Trophy, Dumbbell, Package, Plus, X, Calendar, MapPin,
  ChevronRight, Check, Trash2, Edit2, CheckCircle, Circle,
  Swords, Target, Wrench,
} from 'lucide-react'
import { useSportsStore } from '../../stores/useSportsStore'
import { useAuthStore } from '../../stores/useAuthStore'
import { showToast } from '../../lib/toast'

// ─── helpers ──────────────────────────────────────────────────────────────────
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
function condColor(c) { return CONDITIONS.find((x) => x.value === c)?.color ?? 'var(--fg-3)' }

// ─── Session Modal ────────────────────────────────────────────────────────────
function SessionModal({ session, onClose, userId }) {
  const { addSession, updateSession } = useSportsStore()
  const [form, setForm] = useState({
    type: session?.type ?? 'practice',
    title: session?.title ?? '',
    date: session?.date ?? format(new Date(), 'yyyy-MM-dd'),
    location: session?.location ?? '',
    notes: session?.notes ?? '',
    score_us: session?.score_us ?? '',
    score_them: session?.score_them ?? '',
  })
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!form.title.trim()) return
    setSaving(true)
    const row = {
      user_id: userId,
      type: form.type,
      title: form.title.trim(),
      date: form.date || null,
      location: form.location.trim() || null,
      notes: form.notes.trim() || null,
      score_us: form.score_us !== '' ? Number(form.score_us) : null,
      score_them: form.score_them !== '' ? Number(form.score_them) : null,
    }
    const { error } = session
      ? await updateSession(session.id, row)
      : await addSession(row)
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
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400"><X size={16} /></button>
        </div>

        {/* Type */}
        <div className="flex gap-1.5">
          {SESSION_TYPES.map((t) => (
            <button key={t.value} onClick={() => setForm((f) => ({ ...f, type: t.value }))}
              className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-all border"
              style={form.type === t.value
                ? { background: t.color + '25', color: t.color, borderColor: t.color + '60' }
                : { background: 'var(--bg-3)', color: 'var(--fg-2)', borderColor: 'var(--border)' }
              }
            >{t.label}</button>
          ))}
        </div>

        <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          placeholder="Session title"
          className="w-full px-3 py-2 rounded-lg text-sm border outline-none focus:ring-2 focus:ring-[color:var(--accent)]/30"
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

        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--fg-3)' }}>Notes</label>
          <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            rows={3} placeholder="Strategy, observations…"
            className="w-full px-3 py-2 rounded-lg text-sm border outline-none resize-none"
            style={{ background: 'var(--bg-3)', borderColor: 'var(--border)', color: 'var(--fg)' }}
          />
        </div>

        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg text-sm font-medium" style={{ background: 'var(--bg-3)', color: 'var(--fg-2)' }}>Cancel</button>
          <button onClick={save} disabled={!form.title.trim() || saving}
            className="flex-1 py-2 rounded-lg text-sm font-medium disabled:opacity-40 transition-opacity"
            style={{ background: 'var(--accent)', color: '#0b1220' }}
          >{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ─── Drill Modal ──────────────────────────────────────────────────────────────
function DrillModal({ drill, onClose, userId }) {
  const { addDrill, updateDrill, drills } = useSportsStore()
  const [form, setForm] = useState({
    name: drill?.name ?? '',
    category: drill?.category ?? '',
    duration_minutes: drill?.duration_minutes ?? '',
    description: drill?.description ?? '',
  })
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!form.name.trim()) return
    setSaving(true)
    const row = {
      user_id: userId,
      name: form.name.trim(),
      category: form.category.trim() || null,
      duration_minutes: form.duration_minutes !== '' ? Number(form.duration_minutes) : null,
      description: form.description.trim() || null,
      position: drill ? drill.position : drills.length,
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
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400"><X size={16} /></button>
        </div>
        <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="Drill name" autoFocus
          className="w-full px-3 py-2 rounded-lg text-sm border outline-none focus:ring-2 focus:ring-[color:var(--accent)]/30"
          style={{ background: 'var(--bg-3)', borderColor: 'var(--border)', color: 'var(--fg)' }}
        />
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--fg-3)' }}>Category</label>
            <input value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              placeholder="e.g. Shooting"
              className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
              style={{ background: 'var(--bg-3)', borderColor: 'var(--border)', color: 'var(--fg)' }}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--fg-3)' }}>Duration (min)</label>
            <input type="number" value={form.duration_minutes} onChange={(e) => setForm((f) => ({ ...f, duration_minutes: e.target.value }))}
              placeholder="15" min="1"
              className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
              style={{ background: 'var(--bg-3)', borderColor: 'var(--border)', color: 'var(--fg)' }}
            />
          </div>
        </div>
        <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          rows={3} placeholder="Drill description, instructions…"
          className="w-full px-3 py-2 rounded-lg text-sm border outline-none resize-none"
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

// ─── Equipment Modal ──────────────────────────────────────────────────────────
function EquipmentModal({ item, onClose, userId }) {
  const { addEquipment, updateEquipment } = useSportsStore()
  const [form, setForm] = useState({
    name: item?.name ?? '',
    quantity: item?.quantity ?? 1,
    condition: item?.condition ?? 'good',
    notes: item?.notes ?? '',
  })
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!form.name.trim()) return
    setSaving(true)
    const row = {
      user_id: userId,
      name: form.name.trim(),
      quantity: Number(form.quantity) || 1,
      condition: form.condition,
      notes: form.notes.trim() || null,
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
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400"><X size={16} /></button>
        </div>
        <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="Equipment name" autoFocus
          className="w-full px-3 py-2 rounded-lg text-sm border outline-none focus:ring-2 focus:ring-[color:var(--accent)]/30"
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

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Sports() {
  const { user } = useAuthStore()
  const { sessions, drills, equipment, fetchSessions, fetchDrills, fetchEquipment, deleteSession, deleteDrill, deleteEquipment, toggleEquipment, updateSession } = useSportsStore()
  const [tab, setTab] = useState('sessions')
  const [sessionModal, setSessionModal] = useState(null) // null | 'new' | session object
  const [drillModal, setDrillModal] = useState(null)
  const [equipModal, setEquipModal] = useState(null)

  useEffect(() => {
    if (!user) return
    fetchSessions(user.id)
    fetchDrills(user.id)
    fetchEquipment(user.id)
  }, [user])

  // ── stats ──
  const totalSessions = sessions.length
  const wins = sessions.filter((s) => (s.score_us ?? 0) > (s.score_them ?? 0)).length
  const upcoming = sessions.filter((s) => s.date && isFuture(parseISO(s.date)) && !isToday(parseISO(s.date))).length
  const needsAttention = equipment.filter((e) => e.condition === 'needs_repair' || e.condition === 'replace').length

  const grouped = {
    upcoming: sessions.filter((s) => s.date && (isFuture(parseISO(s.date)) || isToday(parseISO(s.date)))).sort((a, b) => parseISO(a.date) - parseISO(b.date)),
    past: sessions.filter((s) => !s.date || (isPast(parseISO(s.date)) && !isToday(parseISO(s.date)))).sort((a, b) => parseISO(b.date) - parseISO(a.date)),
  }

  return (
    <div className="max-w-3xl mx-auto w-full h-full flex flex-col overflow-hidden">

      {/* Header */}
      <div className="px-4 pt-4 pb-3 md:px-8 md:pt-6 border-b flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'oklch(0.72 0.14 200 / 0.15)' }}>
              <Trophy size={15} style={{ color: 'oklch(0.72 0.14 200)' }} />
            </div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--fg)' }}>Sports</h1>
          </div>
          <button onClick={() => {
            if (tab === 'sessions') setSessionModal('new')
            else if (tab === 'drills') setDrillModal('new')
            else setEquipModal('new')
          }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: 'var(--bg-3)', color: 'var(--fg-2)' }}>
            <Plus size={13} /> Add {tab === 'sessions' ? 'session' : tab === 'drills' ? 'drill' : 'item'}
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[
            { label: 'Sessions', value: totalSessions, color: 'oklch(0.72 0.14 200)' },
            { label: 'Wins', value: wins, color: 'oklch(0.72 0.14 150)' },
            { label: 'Upcoming', value: upcoming, color: 'oklch(0.74 0.14 65)' },
            { label: 'Gear alerts', value: needsAttention, color: needsAttention > 0 ? 'oklch(0.72 0.16 25)' : 'var(--fg-3)' },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-xl p-3 text-center" style={{ background: 'var(--bg-3)' }}>
              <div className="text-xl font-bold tabular-nums" style={{ color }}>{value}</div>
              <div className="text-[10px] mt-0.5" style={{ color: 'var(--fg-3)' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1">
          {[
            { value: 'sessions', label: 'Sessions', Icon: Calendar },
            { value: 'drills',   label: 'Drills',   Icon: Target   },
            { value: 'gear',     label: 'Gear',      Icon: Wrench   },
          ].map(({ value, label, Icon }) => (
            <button key={value} onClick={() => setTab(value)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={tab === value
                ? { background: 'oklch(0.72 0.14 200 / 0.15)', color: 'oklch(0.72 0.14 200)' }
                : { color: 'var(--fg-3)' }
              }
            ><Icon size={12} />{label}</button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-4 md:px-8 space-y-4">

        {/* ── Sessions ── */}
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

        {/* ── Drills ── */}
        {tab === 'drills' && (
          <div>
            {drills.length === 0 && (
              <div className="text-center py-16 space-y-2">
                <Target size={32} className="mx-auto opacity-20" />
                <p className="text-sm" style={{ color: 'var(--fg-3)' }}>No drills yet. Build your drill library.</p>
              </div>
            )}
            {Object.entries(
              drills.reduce((acc, d) => {
                const cat = d.category || 'General'
                acc[cat] = [...(acc[cat] || []), d]
                return acc
              }, {})
            ).map(([cat, items]) => (
              <div key={cat} className="mb-4">
                <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--fg-3)' }}>{cat}</p>
                <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-3)', border: '1px solid var(--border)' }}>
                  {items.map((d, i) => (
                    <div key={d.id} className="flex items-start gap-3 px-4 py-3" style={{ borderBottom: i < items.length - 1 ? '1px solid var(--hairline)' : 'none' }}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: 'oklch(0.72 0.14 200 / 0.12)' }}>
                        <Target size={14} style={{ color: 'oklch(0.72 0.14 200)' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>{d.name}</p>
                        {d.description && <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--fg-3)' }}>{d.description}</p>}
                        {d.duration_minutes && <p className="text-xs mt-1" style={{ color: 'var(--fg-4)' }}>{d.duration_minutes} min</p>}
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setDrillModal(d)} className="p-1.5 rounded-lg" style={{ color: 'var(--fg-3)' }}><Edit2 size={12} /></button>
                        <button onClick={() => deleteDrill(d.id)} className="p-1.5 rounded-lg hover:text-rose-500" style={{ color: 'var(--fg-3)' }}><Trash2 size={12} /></button>
                      </div>
                    </div>
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
                      <button onClick={() => deleteEquipment(e.id)} className="p-1.5 rounded-lg hover:text-rose-500" style={{ color: 'var(--fg-3)' }}><Trash2 size={12} /></button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {sessionModal && (
        <SessionModal
          session={sessionModal === 'new' ? null : sessionModal}
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
    </div>
  )
}

function SessionRow({ session, last, onEdit, onDelete, onToggle }) {
  const typeInfo = SESSION_TYPES.find((t) => t.value === session.type)
  const hasScore = session.score_us != null && session.score_them != null
  const won = hasScore && session.score_us > session.score_them

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
          {hasScore && (
            <span className="text-[10px] font-semibold font-mono" style={{ color: won ? 'oklch(0.72 0.14 150)' : 'oklch(0.72 0.16 25)' }}>
              {session.score_us}–{session.score_them} {won ? 'W' : 'L'}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button onClick={onEdit} className="p-1.5 rounded-lg" style={{ color: 'var(--fg-3)' }}><Edit2 size={12} /></button>
        <button onClick={onDelete} className="p-1.5 rounded-lg hover:text-rose-500" style={{ color: 'var(--fg-3)' }}><Trash2 size={12} /></button>
      </div>
    </div>
  )
}
