import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useBooksStore = create((set) => ({
  books:       [],
  bookNotes:   {}, // keyed by book_id
  readingGoal: null,

  // ── Books ────────────────────────────────────────────────────
  fetchBooks: async (userId) => {
    const { data } = await supabase
      .from('books')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
    if (data) set({ books: data })
  },

  addBook: async (row) => {
    const { data, error } = await supabase.from('books').insert([row]).select().single()
    if (!error) set((s) => ({ books: [data, ...s.books] }))
    return { data, error }
  },

  updateBook: async (id, updates) => {
    const { data, error } = await supabase
      .from('books')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id).select().single()
    if (!error) set((s) => ({ books: s.books.map((b) => (b.id === id ? data : b)) }))
    return { data, error }
  },

  deleteBook: async (id) => {
    const { error } = await supabase.from('books').delete().eq('id', id)
    if (!error) set((s) => ({
      books: s.books.filter((b) => b.id !== id),
      bookNotes: Object.fromEntries(Object.entries(s.bookNotes).filter(([k]) => k !== id)),
    }))
    return { error }
  },

  // ── Book notes ───────────────────────────────────────────────
  fetchBookNotes: async (bookId) => {
    const { data } = await supabase
      .from('book_notes')
      .select('*')
      .eq('book_id', bookId)
      .order('created_at', { ascending: true })
    if (data) set((s) => ({ bookNotes: { ...s.bookNotes, [bookId]: data } }))
    return data ?? []
  },

  addBookNote: async (row) => {
    const { data, error } = await supabase.from('book_notes').insert([row]).select().single()
    if (!error) set((s) => ({
      bookNotes: {
        ...s.bookNotes,
        [row.book_id]: [...(s.bookNotes[row.book_id] ?? []), data],
      },
    }))
    return { data, error }
  },

  deleteBookNote: async (id, bookId) => {
    const { error } = await supabase.from('book_notes').delete().eq('id', id)
    if (!error) set((s) => ({
      bookNotes: {
        ...s.bookNotes,
        [bookId]: (s.bookNotes[bookId] ?? []).filter((n) => n.id !== id),
      },
    }))
    return { error }
  },

  // ── Reading goal ─────────────────────────────────────────────
  fetchReadingGoal: async (userId) => {
    const year = new Date().getFullYear()
    const { data } = await supabase
      .from('reading_goals')
      .select('*')
      .eq('user_id', userId)
      .eq('year', year)
      .maybeSingle()
    set({ readingGoal: data ?? null })
    return data
  },

  setReadingGoal: async (userId, goalBooks) => {
    const year = new Date().getFullYear()
    const { data, error } = await supabase
      .from('reading_goals')
      .upsert({ user_id: userId, year, goal_books: goalBooks }, { onConflict: 'user_id,year' })
      .select().single()
    if (!error) set({ readingGoal: data })
    return { data, error }
  },
}))
