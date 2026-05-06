import { useState } from 'react'
import Modal from '../../components/ui/Modal'
import ColorPicker from '../../components/ui/ColorPicker'
import { useRoutineStore } from '../../stores/useRoutineStore'
import { useAuthStore } from '../../stores/useAuthStore'
import { CLASS_COLORS, DAYS_OF_WEEK } from '../../lib/constants'

export default function RoutineBlockModal({ isOpen, onClose, editBlock = null, defaultDay = null }) {
  const { user } = useAuthStore()
  const { addRoutineBlock, updateRoutineBlock } = useRoutineStore()

  const init = editBlock || {}
  const [name, setName] = useState(init.name || '')
  const [color, setColor] = useState(init.color || CLASS_COLORS[1].value)
  const [days, setDays] = useState(
    init.days_of_week || (defaultDay != null ? [defaultDay] : [])
  )
  const [startTime, setStartTime] = useState(
    init.start_time ? init.start_time.slice(0, 5) : '09:00'
  )
  const [endTime, setEndTime] = useState(
    init.end_time ? init.end_time.slice(0, 5) : '10:00'
  )
  const [notes, setNotes] = useState(init.notes || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function toggleDay(d) {
    setDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()
    )
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    if (days.length === 0) { setError('Select at least one day.'); return }
    if (startTime >= endTime) { setError('End time must be after start time.'); return }
    setSaving(true)
    setError('')
    const payload = {
      name: name.trim(),
      color,
      days_of_week: days,
      start_time: startTime,
      end_time: endTime,
      notes: notes.trim() || null,
    }
    let err
    if (editBlock) {
      ;({ error: err } = await updateRoutineBlock(editBlock.id, payload))
    } else {
      ;({ error: err } = await addRoutineBlock({ ...payload, user_id: user.id }))
    }
    setSaving(false)
    if (err) setError(err.message)
    else onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editBlock ? 'Edit block' : 'New routine block'} size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Block name</label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Morning workout"
            required
            className="input-base"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Color</label>
          <ColorPicker value={color} onChange={setColor} />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Days</label>
          <div className="flex gap-1.5">
            {DAYS_OF_WEEK.map((day, i) => (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(i)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  days.includes(i)
                    ? 'bg-amber-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {day[0]}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Start</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
              className="input-base"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">End</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              required
              className="input-base"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional…"
            rows={2}
            className="input-base resize-none"
          />
        </div>

        {error && <p className="text-xs text-rose-500">{error}</p>}
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
            {saving ? 'Saving…' : editBlock ? 'Save' : 'Create block'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
