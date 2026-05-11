import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  Plus, BookOpen, Star, ChevronDown, ChevronUp, Trash2,
  Edit2, X, StickyNote, Quote, Highlighter, Target, Check,
} from 'lucide-react'
import { useAuthStore } from '../../stores/useAuthStore'
import { useBooksStore } from '../../stores/useBooksStore'
import { format, getYear } from 'date-fns'
import { showToast } from '../../lib/toast'

// ─── helpers ────────────────────────────────────────────────────────────────

const STATUS_LABELS = { tbr: 'To Be Read', reading: 'Reading', finished: 'Finished', dnf: 'DNF' }
const STATUS_COLORS = {
  tbr:      { bg: 'var(--fg-2)', fg: 'var(--fg-3)' },
  reading:  { bg: 'oklch(0.92 0.08 240)', fg: 'oklch(0.45 0.14 240)' },
  finished: { bg: 'oklch(0.92 0.1 150)',  fg: 'oklch(0.45 0.16 150)' },
  dnf:      { bg: 'oklch(0.93 0.06 25)',  fg: 'oklch(0.52 0.14 25)' },
}
const NOTE_ICONS = { note: StickyNote, highlight: Highlighter, quote: Quote }
const NOTE_COLORS = {
  note:      'oklch(0.75 0.14 65)',
  highlight: 'oklch(0.75 0.14 95)',
  quote:     'oklch(0.72 0.14 295)',
}

const COVER_COLORS = [
  '#6366f1', '#ec4899', '#f97316', '#10b981',
  '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444',
]

function StarRating({ value, onChange }) {
  const [hover, setHover] = useState(null)
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n === value ? null : n)}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(null)}
          style={{ background: 'none', border: 0, padding: 2, cursor: 'pointer', color: (hover ?? value ?? 0) >= n ? '#f59e0b' : 'var(--fg-4)' }}
        >
          <Star size={18} fill={(hover ?? value ?? 0) >= n ? '#f59e0b' : 'none'} />
        </button>
      ))}
    </div>
  )
}

// ─── BookModal ───────────────────────────────────────────────────────────────

function BookModal({ book, onClose, onSave }) {
  const [title, setTitle]       = useState(book?.title ?? '')
  const [author, setAuthor]     = useState(book?.author ?? '')
  const [status, setStatus]     = useState(book?.status ?? 'tbr')
  const [totalPages, setTotal]  = useState(book?.total_pages ?? '')
  const [currentPage, setCurrent] = useState(book?.current_page ?? '')
  const [rating, setRating]     = useState(book?.rating ?? null)
  const [color, setColor]       = useState(book?.cover_color ?? COVER_COLORS[0])
  const [saving, setSaving]     = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    await onSave({
      title: title.trim(),
      author: author.trim() || null,
      status,
      total_pages: totalPages ? Number(totalPages) : null,
      current_page: currentPage ? Number(currentPage) : null,
      rating,
      cover_color: color,
    })
    setSaving(false)
    onClose()
  }

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/50"
      style={{ zIndex: 400 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-md mx-4 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden">
        <form onSubmit={handleSubmit}>
          <div style={{ padding: '20px 24px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600 }}>{book ? 'Edit Book' : 'Add Book'}</h2>
              <button type="button" onClick={onClose} style={{ background: 'none', border: 0, cursor: 'pointer', color: 'var(--fg-3)', padding: 4 }}>
                <X size={18} />
              </button>
            </div>

            {/* Cover color */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: 'var(--fg-3)', display: 'block', marginBottom: 8 }}>Cover Color</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {COVER_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    style={{
                      width: 28, height: 28, borderRadius: '50%', background: c, border: 0, cursor: 'pointer',
                      outline: color === c ? `3px solid ${c}` : 'none', outlineOffset: 2,
                    }}
                  />
                ))}
              </div>
            </div>

            <input
              autoFocus
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Book title *"
              style={{ width: '100%', marginBottom: 12, padding: '9px 12px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--fg)', fontSize: 14, boxSizing: 'border-box' }}
            />
            <input
              value={author}
              onChange={e => setAuthor(e.target.value)}
              placeholder="Author"
              style={{ width: '100%', marginBottom: 12, padding: '9px 12px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--fg)', fontSize: 14, boxSizing: 'border-box' }}
            />

            {/* Status */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: 'var(--fg-3)', display: 'block', marginBottom: 6 }}>Status</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {Object.entries(STATUS_LABELS).map(([val, lbl]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setStatus(val)}
                    style={{
                      flex: 1, padding: '6px 4px', borderRadius: 8, border: '1.5px solid',
                      borderColor: status === val ? 'var(--accent)' : 'var(--border)',
                      background: status === val ? 'var(--accent)' : 'transparent',
                      color: status === val ? '#fff' : 'var(--fg-3)',
                      fontSize: 11, fontWeight: 500, cursor: 'pointer',
                    }}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
            </div>

            {/* Pages */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--fg-3)', display: 'block', marginBottom: 4 }}>Total Pages</label>
                <input
                  type="number" min="1"
                  value={totalPages}
                  onChange={e => setTotal(e.target.value)}
                  placeholder="300"
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--fg)', fontSize: 14, boxSizing: 'border-box' }}
                />
              </div>
              {(status === 'reading' || status === 'finished') && (
                <div>
                  <label style={{ fontSize: 12, color: 'var(--fg-3)', display: 'block', marginBottom: 4 }}>Current Page</label>
                  <input
                    type="number" min="0"
                    value={currentPage}
                    onChange={e => setCurrent(e.target.value)}
                    placeholder="0"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--fg)', fontSize: 14, boxSizing: 'border-box' }}
                  />
                </div>
              )}
            </div>

            {/* Rating */}
            {(status === 'finished' || status === 'dnf') && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, color: 'var(--fg-3)', display: 'block', marginBottom: 6 }}>Rating</label>
                <StarRating value={rating} onChange={setRating} />
              </div>
            )}
          </div>

          <div style={{ padding: '16px 24px 20px', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--fg-2)', fontSize: 14, cursor: 'pointer' }}>Cancel</button>
            <button type="submit" disabled={saving || !title.trim()} style={{ padding: '8px 20px', borderRadius: 8, border: 0, background: 'var(--accent)', color: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Saving…' : (book ? 'Save' : 'Add Book')}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}

// ─── NoteModal ───────────────────────────────────────────────────────────────

function NoteModal({ bookId, onClose, onSave }) {
  const [content, setContent] = useState('')
  const [type, setType]       = useState('note')
  const [page, setPage]       = useState('')
  const [saving, setSaving]   = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!content.trim()) return
    setSaving(true)
    await onSave({ book_id: bookId, content: content.trim(), type, page_number: page ? Number(page) : null })
    setSaving(false)
    onClose()
  }

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/50"
      style={{ zIndex: 400 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-sm mx-4 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden">
        <form onSubmit={handleSubmit}>
          <div style={{ padding: '20px 24px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Add Note</h2>
              <button type="button" onClick={onClose} style={{ background: 'none', border: 0, cursor: 'pointer', color: 'var(--fg-3)', padding: 4 }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
              {['note', 'highlight', 'quote'].map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  style={{
                    flex: 1, padding: '6px 4px', borderRadius: 8, border: '1.5px solid',
                    borderColor: type === t ? NOTE_COLORS[t] : 'var(--border)',
                    background: type === t ? NOTE_COLORS[t] + '22' : 'transparent',
                    color: type === t ? NOTE_COLORS[t] : 'var(--fg-3)',
                    fontSize: 12, fontWeight: 500, cursor: 'pointer', textTransform: 'capitalize',
                  }}
                >
                  {t}
                </button>
              ))}
            </div>

            <textarea
              autoFocus
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder={type === 'quote' ? 'Type the quote…' : type === 'highlight' ? 'Paste highlighted text…' : 'Your note…'}
              rows={4}
              style={{ width: '100%', marginBottom: 10, padding: '9px 12px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--fg)', fontSize: 14, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
            />

            <input
              type="number" min="1"
              value={page}
              onChange={e => setPage(e.target.value)}
              placeholder="Page number (optional)"
              style={{ width: '100%', marginBottom: 4, padding: '8px 12px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--fg)', fontSize: 14, boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ padding: '16px 24px 20px', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--fg-2)', fontSize: 14, cursor: 'pointer' }}>Cancel</button>
            <button type="submit" disabled={saving || !content.trim()} style={{ padding: '8px 20px', borderRadius: 8, border: 0, background: 'var(--accent)', color: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Saving…' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}

// ─── GoalModal ───────────────────────────────────────────────────────────────

function GoalModal({ current, onClose, onSave }) {
  const [goal, setGoal] = useState(current ?? '')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!goal) return
    setSaving(true)
    await onSave(Number(goal))
    setSaving(false)
    onClose()
  }

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/50"
      style={{ zIndex: 400 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-xs mx-4 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden">
        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          <h2 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600 }}>Reading Goal {new Date().getFullYear()}</h2>
          <input
            autoFocus
            type="number" min="1"
            value={goal}
            onChange={e => setGoal(e.target.value)}
            placeholder="Books per year"
            style={{ width: '100%', marginBottom: 16, padding: '10px 12px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--fg)', fontSize: 14, boxSizing: 'border-box' }}
          />
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--fg-2)', fontSize: 14, cursor: 'pointer' }}>Cancel</button>
            <button type="submit" disabled={saving || !goal} style={{ padding: '8px 20px', borderRadius: 8, border: 0, background: 'var(--accent)', color: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Saving…' : 'Set Goal'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}

// ─── BookCard ────────────────────────────────────────────────────────────────

function BookCard({ book, onEdit, onDelete, onUpdatePage }) {
  const [expanded, setExpanded] = useState(false)
  const [notes, setNotes] = useState(null)
  const [addingNote, setAddingNote] = useState(false)
  const [editingPage, setEditingPage] = useState(false)
  const [pageInput, setPageInput] = useState(book.current_page ?? '')
  const { fetchBookNotes, addBookNote, deleteBookNote } = useBooksStore()

  const progress = book.total_pages && book.current_page
    ? Math.min(100, Math.round((book.current_page / book.total_pages) * 100))
    : null

  async function toggleExpand() {
    if (!expanded && notes === null) {
      const data = await fetchBookNotes(book.id)
      setNotes(data)
    }
    setExpanded(e => !e)
  }

  async function handleAddNote(row) {
    const { data, error } = await addBookNote({ ...row, user_id: book.user_id })
    if (error) showToast({ message: 'Failed to add note', variant: 'error' })
    else setNotes(n => [...(n ?? []), data])
  }

  async function handleDeleteNote(id) {
    const { error } = await deleteBookNote(id, book.id)
    if (!error) setNotes(n => n.filter(x => x.id !== id))
  }

  async function handlePageSave() {
    const p = Number(pageInput)
    if (!isNaN(p) && p >= 0) {
      await onUpdatePage(book.id, p)
    }
    setEditingPage(false)
  }

  const sc = STATUS_COLORS[book.status] || STATUS_COLORS.tbr

  return (
    <div style={{ borderRadius: 12, border: '1.5px solid var(--border)', overflow: 'hidden', background: 'var(--bg)' }}>
      <div style={{ display: 'flex', gap: 12, padding: '14px 16px' }}>
        {/* Spine */}
        <div style={{
          width: 10, borderRadius: 4, flexShrink: 0, alignSelf: 'stretch', minHeight: 60,
          background: book.cover_color || '#6366f1',
        }} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{book.title}</p>
              {book.author && <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--fg-3)' }}>{book.author}</p>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              <span style={{ fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 20, background: sc.bg, color: sc.fg }}>
                {STATUS_LABELS[book.status]}
              </span>
              <button onClick={() => onEdit(book)} style={{ background: 'none', border: 0, cursor: 'pointer', color: 'var(--fg-4)', padding: 2 }}><Edit2 size={13} /></button>
              <button onClick={() => onDelete(book.id)} style={{ background: 'none', border: 0, cursor: 'pointer', color: 'var(--fg-4)', padding: 2 }}><Trash2 size={13} /></button>
            </div>
          </div>

          {/* Progress bar */}
          {book.status === 'reading' && book.total_pages && (
            <div style={{ marginTop: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                {editingPage ? (
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input
                      autoFocus
                      type="number" min="0" max={book.total_pages}
                      value={pageInput}
                      onChange={e => setPageInput(e.target.value)}
                      onBlur={handlePageSave}
                      onKeyDown={e => { if (e.key === 'Enter') handlePageSave(); if (e.key === 'Escape') setEditingPage(false) }}
                      style={{ width: 64, padding: '2px 6px', borderRadius: 6, border: '1.5px solid var(--accent)', background: 'var(--bg)', color: 'var(--fg)', fontSize: 12 }}
                    />
                    <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>/ {book.total_pages}</span>
                  </div>
                ) : (
                  <button
                    onClick={() => { setPageInput(book.current_page ?? 0); setEditingPage(true) }}
                    style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer', fontSize: 12, color: 'var(--fg-3)' }}
                  >
                    p. {book.current_page ?? 0} / {book.total_pages}
                  </button>
                )}
                <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>{progress}%</span>
              </div>
              <div style={{ height: 5, borderRadius: 99, background: 'var(--fg-2)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${progress}%`, background: 'var(--accent)', borderRadius: 99, transition: 'width .3s' }} />
              </div>
            </div>
          )}

          {/* Rating */}
          {book.rating && (
            <div style={{ display: 'flex', gap: 2, marginTop: 6 }}>
              {[1,2,3,4,5].map(n => (
                <Star key={n} size={12} fill={book.rating >= n ? '#f59e0b' : 'none'} color={book.rating >= n ? '#f59e0b' : 'var(--fg-4)'} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Expand toggle */}
      <button
        onClick={toggleExpand}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '6px 0', background: 'none', border: 0, borderTop: '1px solid var(--border)', cursor: 'pointer', fontSize: 12, color: 'var(--fg-3)' }}
      >
        {expanded ? <><ChevronUp size={13} /> Hide notes</> : <><ChevronDown size={13} /> Notes {notes !== null ? `(${notes.length})` : ''}</>}
      </button>

      {/* Notes panel */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '12px 16px', background: 'var(--fg-2)' }}>
          {(notes ?? []).map(note => {
            const NoteIcon = NOTE_ICONS[note.type] || StickyNote
            return (
              <div key={note.id} style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'flex-start' }}>
                <NoteIcon size={14} style={{ color: NOTE_COLORS[note.type], flexShrink: 0, marginTop: 2 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5 }}>{note.content}</p>
                  {note.page_number && <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--fg-3)' }}>p. {note.page_number}</p>}
                </div>
                <button onClick={() => handleDeleteNote(note.id)} style={{ background: 'none', border: 0, cursor: 'pointer', color: 'var(--fg-4)', padding: 2, flexShrink: 0 }}><X size={12} /></button>
              </div>
            )
          })}
          {(notes ?? []).length === 0 && <p style={{ fontSize: 12, color: 'var(--fg-3)', margin: '0 0 10px' }}>No notes yet.</p>}
          <button
            onClick={() => setAddingNote(true)}
            style={{ fontSize: 12, color: 'var(--accent)', background: 'none', border: 0, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <Plus size={13} /> Add note
          </button>

          {addingNote && (
            <NoteModal
              bookId={book.id}
              onClose={() => setAddingNote(false)}
              onSave={handleAddNote}
            />
          )}
        </div>
      )}
    </div>
  )
}

// ─── Books (main) ─────────────────────────────────────────────────────────────

const TABS = ['reading', 'tbr', 'finished']
const TAB_LABELS = { reading: 'Reading', tbr: 'TBR', finished: 'Finished' }

export default function Books() {
  const { user } = useAuthStore()
  const {
    books, readingGoal,
    fetchBooks, addBook, updateBook, deleteBook,
    fetchReadingGoal, setReadingGoal,
  } = useBooksStore()

  const [tab, setTab]         = useState('reading')
  const [modalBook, setModalBook] = useState(null)  // null=closed, false=add, obj=edit
  const [goalModal, setGoalModal] = useState(false)

  useEffect(() => {
    if (!user) return
    fetchBooks(user.id)
    fetchReadingGoal(user.id)
  }, [user?.id])

  const thisYear = getYear(new Date())
  const readingBooks  = books.filter(b => b.status === 'reading')
  const tbrBooks      = books.filter(b => b.status === 'tbr')
  const finishedBooks = books.filter(b => b.status === 'finished' || b.status === 'dnf')
  const finishedThisYear = finishedBooks.filter(b => {
    if (!b.updated_at) return false
    return getYear(new Date(b.updated_at)) === thisYear
  })

  const goalPct = readingGoal
    ? Math.min(100, Math.round((finishedThisYear.length / readingGoal.goal_books) * 100))
    : null

  const visibleBooks = tab === 'reading' ? readingBooks : tab === 'tbr' ? tbrBooks : finishedBooks

  async function handleSave(row) {
    if (modalBook && modalBook !== false) {
      const { error } = await updateBook(modalBook.id, row)
      if (error) showToast({ message: 'Failed to save', variant: 'error' })
    } else {
      const { error } = await addBook({ ...row, user_id: user.id })
      if (error) showToast({ message: 'Failed to add book', variant: 'error' })
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this book?')) return
    const { error } = await deleteBook(id)
    if (error) showToast({ message: 'Failed to delete', variant: 'error' })
  }

  async function handleUpdatePage(bookId, page) {
    const { error } = await updateBook(bookId, {
      current_page: page,
      status: books.find(b => b.id === bookId)?.status === 'tbr' ? 'reading' : undefined,
    })
    if (error) showToast({ message: 'Failed to update page', variant: 'error' })
  }

  async function handleGoalSave(goalBooks) {
    const { error } = await setReadingGoal(user.id, goalBooks)
    if (error) showToast({ message: 'Failed to set goal', variant: 'error' })
  }

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px 32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Books</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--fg-3)' }}>Track your reading life</p>
        </div>
        <button
          onClick={() => setModalBook(false)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, border: 0, background: 'var(--accent)', color: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}
        >
          <Plus size={16} /> Add Book
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'Reading', value: readingBooks.length, color: 'oklch(0.45 0.14 240)' },
          { label: 'Finished', value: finishedThisYear.length, sub: `in ${thisYear}`, color: 'oklch(0.45 0.16 150)' },
          { label: 'TBR', value: tbrBooks.length, color: 'var(--fg-3)' },
        ].map(({ label, value, sub, color }) => (
          <div key={label} style={{ padding: '14px 16px', borderRadius: 12, border: '1.5px solid var(--border)', background: 'var(--bg)', textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 26, fontWeight: 700, color }}>{value}</p>
            <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--fg-3)' }}>{label}{sub ? ` ${sub}` : ''}</p>
          </div>
        ))}
      </div>

      {/* Reading goal */}
      <div
        style={{ padding: '14px 16px', borderRadius: 12, border: '1.5px solid var(--border)', background: 'var(--bg)', marginBottom: 20, cursor: 'pointer' }}
        onClick={() => setGoalModal(true)}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: readingGoal ? 8 : 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Target size={16} color="var(--accent)" />
            <span style={{ fontSize: 14, fontWeight: 600 }}>
              {readingGoal ? `${thisYear} Reading Goal` : 'Set Reading Goal'}
            </span>
          </div>
          {readingGoal && (
            <span style={{ fontSize: 13, color: 'var(--fg-3)' }}>
              {finishedThisYear.length} / {readingGoal.goal_books} books
            </span>
          )}
        </div>
        {readingGoal && (
          <div style={{ height: 6, borderRadius: 99, background: 'var(--fg-2)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${goalPct}%`, background: goalPct >= 100 ? 'oklch(0.6 0.15 150)' : 'var(--accent)', borderRadius: 99, transition: 'width .3s' }} />
          </div>
        )}
        {readingGoal && goalPct >= 100 && (
          <p style={{ margin: '6px 0 0', fontSize: 12, color: 'oklch(0.5 0.15 150)', fontWeight: 500 }}>
            <Check size={12} style={{ display: 'inline', marginRight: 4 }} />Goal reached!
          </p>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1, padding: '7px 0', borderRadius: 9, border: '1.5px solid',
              borderColor: tab === t ? 'var(--accent)' : 'var(--border)',
              background: tab === t ? 'var(--accent)' : 'transparent',
              color: tab === t ? '#fff' : 'var(--fg-3)',
              fontSize: 13, fontWeight: 500, cursor: 'pointer',
            }}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Book list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {visibleBooks.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--fg-3)' }}>
            <BookOpen size={40} strokeWidth={1.2} style={{ margin: '0 auto 12px', display: 'block', color: 'var(--fg-4)' }} />
            <p style={{ margin: 0, fontSize: 14 }}>
              {tab === 'reading' ? 'No books in progress' : tab === 'tbr' ? 'Your TBR list is empty' : 'No finished books yet'}
            </p>
            <button
              onClick={() => setModalBook(false)}
              style={{ marginTop: 12, fontSize: 13, color: 'var(--accent)', background: 'none', border: 0, cursor: 'pointer' }}
            >
              Add your first book
            </button>
          </div>
        )}
        {visibleBooks.map(book => (
          <BookCard
            key={book.id}
            book={book}
            onEdit={b => setModalBook(b)}
            onDelete={handleDelete}
            onUpdatePage={handleUpdatePage}
          />
        ))}
      </div>

      {/* Modals */}
      {modalBook !== null && (
        <BookModal
          book={modalBook || null}
          onClose={() => setModalBook(null)}
          onSave={handleSave}
        />
      )}
      {goalModal && (
        <GoalModal
          current={readingGoal?.goal_books}
          onClose={() => setGoalModal(false)}
          onSave={handleGoalSave}
        />
      )}
    </div>
  )
}
