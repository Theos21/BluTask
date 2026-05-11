import { useState, useEffect } from 'react'
import { Plus, Trash2, Check, ChevronDown, Calendar as CalendarIcon, X } from 'lucide-react'
import { format } from 'date-fns'
import * as RadixPopover from '@radix-ui/react-popover'
import * as RadixSelect from '@radix-ui/react-select'
import Modal from '../../components/ui/Modal'
import { Calendar } from '../../components/ui/calendar'
import { useSchoolStore } from '../../stores/useSchoolStore'
import { useAuthStore } from '../../stores/useAuthStore'
import { ASSIGNMENT_TYPES, ASSIGNMENT_STATUSES, PRIORITIES } from '../../lib/constants'
import { showToast } from '../../lib/toast'

function uid() {
  return Math.random().toString(36).slice(2, 10)
}

const HOURS = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'))
const MINUTES = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'))

// Reusable Radix Select styled to match the form
function FormSelect({ value, onChange, children }) {
  return (
    <RadixSelect.Root value={value} onValueChange={onChange}>
      <RadixSelect.Trigger className="flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-white/[0.05] px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-400/30 data-[placeholder]:text-gray-400">
        <RadixSelect.Value />
        <RadixSelect.Icon asChild>
          <ChevronDown size={14} className="text-gray-400 flex-shrink-0" />
        </RadixSelect.Icon>
      </RadixSelect.Trigger>
      <RadixSelect.Portal>
        <RadixSelect.Content
          position="popper"
          sideOffset={4}
          style={{ zIndex: 9999, background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
          className="w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg shadow-xl"
        >
          <RadixSelect.Viewport className="p-1">
            {children}
          </RadixSelect.Viewport>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  )
}

function FormSelectItem({ value, children }) {
  return (
    <RadixSelect.Item
      value={value}
      style={{ outline: 'none' }}
      className="relative flex items-center rounded-md px-3 py-1.5 text-sm text-gray-800 dark:text-gray-200 cursor-default select-none data-[highlighted]:bg-indigo-50 dark:data-[highlighted]:bg-indigo-900/30 data-[highlighted]:text-gray-900 dark:data-[highlighted]:text-white data-[state=checked]:font-medium"
    >
      <RadixSelect.ItemText>{children}</RadixSelect.ItemText>
    </RadixSelect.Item>
  )
}

export default function AssignmentModal({ isOpen, onClose, editAssignment = null, defaultClassId = null }) {
  const { user } = useAuthStore()
  const { classes, addAssignment, updateAssignment } = useSchoolStore()

  // Form state - all reset via useEffect when modal opens
  const [title, setTitle] = useState('')
  const [classId, setClassId] = useState('')
  const [type, setType] = useState('homework')
  const [priority, setPriority] = useState('normal')
  const [status, setStatus] = useState('todo')
  const [notes, setNotes] = useState('')
  const [checklist, setChecklist] = useState([])
  const [newCheckItem, setNewCheckItem] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Inline date picker state
  const [pickerOpen, setPickerOpen] = useState(false)
  const [calDate, setCalDate] = useState(undefined)
  const [pickerHour, setPickerHour] = useState('11')
  const [pickerMinute, setPickerMinute] = useState('59')
  const [pickerAmPm, setPickerAmPm] = useState('PM')
  const [endOfPeriod, setEndOfPeriod] = useState(false)

  const isClassworkType = type === 'classwork'
  const showTimePicker = !(isClassworkType && endOfPeriod)

  // Reset every field when the modal opens or the target assignment changes
  useEffect(() => {
    if (!isOpen) return
    const ea = editAssignment || {}

    setTitle(ea.title || '')
    setClassId(ea.class_id || defaultClassId || classes[0]?.id || '')
    setType(ea.type || 'homework')
    setPriority(ea.priority || 'normal')
    setStatus(ea.status || 'todo')
    setNotes(ea.notes || '')
    setChecklist(ea.checklist || [])
    setNewCheckItem('')
    setError('')
    setPickerOpen(false)
    setEndOfPeriod(false)

    if (ea.due_date) {
      const d = new Date(ea.due_date)
      setCalDate(d)
      // Classwork stored at midnight = "end of period" sentinel
      if (ea.type === 'classwork' && d.getHours() === 0 && d.getMinutes() === 0) {
        setEndOfPeriod(true)
        setPickerHour('11')
        setPickerMinute('59')
        setPickerAmPm('PM')
      } else {
        const rawHour = d.getHours()
        const h = rawHour % 12 || 12
        setPickerHour(h.toString().padStart(2, '0'))
        setPickerMinute(d.getMinutes().toString().padStart(2, '0'))
        setPickerAmPm(rawHour >= 12 ? 'PM' : 'AM')
      }
    } else {
      setCalDate(undefined)
      setPickerHour('11')
      setPickerMinute('59')
      setPickerAmPm('PM')
    }
  }, [isOpen, editAssignment?.id])

  function buildDueDate() {
    if (!calDate) return null
    const d = new Date(calDate)
    if (isClassworkType && endOfPeriod) {
      d.setHours(0, 0, 0, 0) // midnight sentinel = end of period
      return d.toISOString()
    }
    let h = parseInt(pickerHour)
    if (pickerAmPm === 'PM' && h < 12) h += 12
    if (pickerAmPm === 'AM' && h === 12) h = 0
    d.setHours(h, parseInt(pickerMinute), 0, 0)
    return d.toISOString()
  }

  const displayDateValue = calDate
    ? isClassworkType && endOfPeriod
        ? `${format(calDate, 'MMM d, yyyy')} · End of period`
        : `${format(calDate, 'MMM d, yyyy')} · ${pickerHour}:${pickerMinute} ${pickerAmPm}`
    : null

  function addCheckItem() {
    if (!newCheckItem.trim()) return
    setChecklist((prev) => [...prev, { id: uid(), title: newCheckItem.trim(), completed: false }])
    setNewCheckItem('')
  }

  function toggleCheckItem(id) {
    setChecklist((prev) =>
      prev.map((item) => item.id === id ? { ...item, completed: !item.completed } : item)
    )
  }

  function removeCheckItem(id) {
    setChecklist((prev) => prev.filter((item) => item.id !== id))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    setError('')
    const payload = {
      title: title.trim(),
      class_id: classId,
      type,
      due_date: buildDueDate(),
      priority,
      status,
      notes: notes.trim(),
      checklist,
    }
    let err
    if (editAssignment) {
      ;({ error: err } = await updateAssignment(editAssignment.id, payload))
    } else {
      ;({ error: err } = await addAssignment({ ...payload, user_id: user.id }))
    }
    setSaving(false)
    if (err) setError(err.message)
    else {
      showToast({ message: editAssignment ? 'Assignment updated' : 'Assignment added', variant: 'success' })
      onClose()
    }
  }

  const completedCount = checklist.filter((i) => i.completed).length

  const timeSelectClass = "h-8 rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 px-2 focus:outline-none focus:ring-1 focus:ring-indigo-400 cursor-pointer"

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editAssignment ? 'Edit assignment' : 'New assignment'}>
      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Title */}
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Title</label>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Assignment title"
            required
            className="input-base"
          />
        </div>

        {/* Class + Type */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Class</label>
            <select value={classId} onChange={(e) => setClassId(e.target.value)} className="input-base">
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Type</label>
            <FormSelect value={type} onChange={setType}>
              {ASSIGNMENT_TYPES.map((t) => (
                <FormSelectItem key={t.value} value={t.value}>{t.label}</FormSelectItem>
              ))}
            </FormSelect>
          </div>
        </div>

        {/* Date / time picker */}
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
            Due date & time
          </label>
          <RadixPopover.Root open={pickerOpen} onOpenChange={setPickerOpen}>
            <RadixPopover.Trigger asChild>
              <button
                type="button"
                className="input-base flex items-center gap-2 text-left w-full"
              >
                <CalendarIcon size={14} className="text-gray-400 flex-shrink-0" />
                <span className={displayDateValue ? 'text-gray-900 dark:text-gray-100 flex-1' : 'text-gray-400 dark:text-gray-600 flex-1'}>
                  {displayDateValue || 'Pick a date & time'}
                </span>
                {displayDateValue && (
                  <span
                    role="button"
                    tabIndex={-1}
                    onClick={(e) => { e.stopPropagation(); setCalDate(undefined); setEndOfPeriod(false) }}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0"
                  >
                    <X size={12} />
                  </span>
                )}
              </button>
            </RadixPopover.Trigger>
            <RadixPopover.Portal>
              <RadixPopover.Content
                side="top"
                align="start"
                sideOffset={6}
                style={{ zIndex: 9999 }}
                className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#131b24] shadow-2xl p-3 w-fit"
              >
                <Calendar
                  mode="single"
                  selected={calDate}
                  onSelect={(d) => setCalDate(d)}
                  initialFocus
                />
                {/* Classwork: "Due at end of period" checkbox + optional time */}
                {isClassworkType && (
                  <div className="pt-3 mt-1 border-t border-gray-100 dark:border-gray-800 space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={endOfPeriod}
                        onChange={(e) => setEndOfPeriod(e.target.checked)}
                        className="accent-indigo-500"
                      />
                      <span className="text-xs text-gray-600 dark:text-gray-400">Due at end of period</span>
                    </label>
                    {!endOfPeriod && (
                      <div className="flex items-center gap-2">
                        <select value={pickerHour} onChange={(e) => setPickerHour(e.target.value)} className={timeSelectClass}>
                          {HOURS.map((h) => <option key={h} value={h}>{h}</option>)}
                        </select>
                        <span className="text-gray-400 text-sm font-medium select-none">:</span>
                        <select value={pickerMinute} onChange={(e) => setPickerMinute(e.target.value)} className={timeSelectClass}>
                          {MINUTES.map((m) => <option key={m} value={m}>{m}</option>)}
                        </select>
                        <select value={pickerAmPm} onChange={(e) => setPickerAmPm(e.target.value)} className={timeSelectClass}>
                          <option value="AM">AM</option>
                          <option value="PM">PM</option>
                        </select>
                        <button type="button" onClick={() => setPickerOpen(false)} className="ml-auto text-xs font-medium text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 px-2 py-1 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">Done</button>
                      </div>
                    )}
                    {endOfPeriod && (
                      <button type="button" onClick={() => setPickerOpen(false)} className="text-xs font-medium text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 px-2 py-1 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">Done</button>
                    )}
                  </div>
                )}
                {/* Time picker for all non-classwork types */}
                {!isClassworkType && (
                  <div className="flex items-center gap-2 pt-3 mt-1 border-t border-gray-100 dark:border-gray-800">
                    <select value={pickerHour} onChange={(e) => setPickerHour(e.target.value)} className={timeSelectClass}>
                      {HOURS.map((h) => <option key={h} value={h}>{h}</option>)}
                    </select>
                    <span className="text-gray-400 text-sm font-medium select-none">:</span>
                    <select value={pickerMinute} onChange={(e) => setPickerMinute(e.target.value)} className={timeSelectClass}>
                      {MINUTES.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <select value={pickerAmPm} onChange={(e) => setPickerAmPm(e.target.value)} className={timeSelectClass}>
                      <option value="AM">AM</option>
                      <option value="PM">PM</option>
                    </select>
                    <button type="button" onClick={() => setPickerOpen(false)} className="ml-auto text-xs font-medium text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 px-2 py-1 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">Done</button>
                  </div>
                )}
              </RadixPopover.Content>
            </RadixPopover.Portal>
          </RadixPopover.Root>
        </div>

        {/* Priority + Status */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Priority</label>
            <FormSelect value={priority} onChange={setPriority}>
              {PRIORITIES.map((p) => (
                <FormSelectItem key={p.value} value={p.value}>{p.label}</FormSelectItem>
              ))}
            </FormSelect>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Status</label>
            <FormSelect value={status} onChange={setStatus}>
              {ASSIGNMENT_STATUSES.map((s) => (
                <FormSelectItem key={s.value} value={s.value}>{s.label}</FormSelectItem>
              ))}
            </FormSelect>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes…"
            rows={2}
            className="input-base resize-none"
          />
        </div>

        {/* Checklist */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
              Checklist
              {checklist.length > 0 && (
                <span className="ml-1.5 text-gray-400 dark:text-gray-500 font-normal">
                  {completedCount}/{checklist.length}
                </span>
              )}
            </label>
          </div>
          {checklist.length > 0 && (
            <div className="space-y-1 mb-2">
              {checklist.map((item) => (
                <div key={item.id} className="group flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleCheckItem(item.id)}
                    className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                      item.completed
                        ? 'bg-indigo-500 border-indigo-500'
                        : 'border-gray-300 dark:border-gray-600 hover:border-indigo-400'
                    }`}
                  >
                    {item.completed && <Check size={9} className="text-white" strokeWidth={3} />}
                  </button>
                  <span className={`flex-1 text-xs ${
                    item.completed ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-300'
                  }`}>
                    {item.title}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeCheckItem(item.id)}
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-rose-500 transition-all"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              value={newCheckItem}
              onChange={(e) => setNewCheckItem(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCheckItem() } }}
              placeholder="Add checklist item…"
              className="input-base flex-1"
            />
            <button type="button" onClick={addCheckItem} className="btn-ghost px-2.5">
              <Plus size={14} />
            </button>
          </div>
        </div>

        {error && <p className="text-xs text-rose-500">{error}</p>}
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
            {saving ? 'Saving…' : editAssignment ? 'Save' : 'Add assignment'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
