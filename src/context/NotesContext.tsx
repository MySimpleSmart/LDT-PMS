import { createContext, useContext, useState, useMemo, useCallback } from 'react'
import type { Note } from '../types/note'
import { getNotesList, getNoteById as getNoteByIdData, addNote as addNoteData, updateNote as updateNoteData, deleteNote as deleteNoteData } from '../data/notes'

interface NotesContextValue {
  notes: Note[]
  addNote: (note: Omit<Note, 'id'>) => Note
  updateNote: (id: string, updates: Partial<Pick<Note, 'content' | 'updatedAt'>>) => Note | undefined
  deleteNote: (id: string) => boolean
  getNoteById: (id: string) => Note | undefined
}

const NotesContext = createContext<NotesContextValue | null>(null)

export function NotesProvider({ children }: { children: React.ReactNode }) {
  const [notes, setNotes] = useState<Note[]>(() => {
    try {
      return getNotesList()
    } catch {
      return []
    }
  })

  const addNote = useCallback((note: Omit<Note, 'id'>) => {
    const created = addNoteData(note)
    setNotes((prev) => [created, ...prev])
    return created
  }, [])

  const updateNote = useCallback((id: string, updates: Partial<Pick<Note, 'content' | 'updatedAt'>>) => {
    const updated = updateNoteData(id, updates)
    if (updated) setNotes((prev) => prev.map((n) => (n.id === id ? updated : n)))
    return updated
  }, [])

  const deleteNote = useCallback((id: string) => {
    const ok = deleteNoteData(id)
    if (ok) setNotes((prev) => prev.filter((n) => n.id !== id))
    return ok
  }, [])

  const getNoteById = useCallback((id: string) => notes.find((n) => n.id === id) ?? getNoteByIdData(id), [notes])

  const value = useMemo(
    () => ({ notes, addNote, updateNote, deleteNote, getNoteById }),
    [notes, addNote, updateNote, deleteNote, getNoteById]
  )
  return <NotesContext.Provider value={value}>{children}</NotesContext.Provider>
}

export function useNotes() {
  const ctx = useContext(NotesContext)
  if (!ctx) throw new Error('useNotes must be used within NotesProvider')
  return ctx
}
