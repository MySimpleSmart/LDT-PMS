import { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react'
import type { Note } from '../types/note'
import {
  getNotesList as fetchNotesList,
  addNote as addNoteData,
  updateNote as updateNoteData,
  deleteNote as deleteNoteData,
  setPinnedNote as setPinnedNoteData,
} from '../data/notes'
import { createNotificationsForMembers } from '../data/notifications'

const MENTION_REGEX = /@\[([^\]]+)\]\(([^)]+)\)/g

function extractMentionedMemberIds(content: string): string[] {
  const ids: string[] = []
  let m: RegExpExecArray | null
  const re = new RegExp(MENTION_REGEX.source, 'g')
  while ((m = re.exec(content)) !== null) {
    const memberId = m[2]?.trim()
    if (memberId) ids.push(memberId)
  }
  return ids
}

interface NotesContextValue {
  notes: Note[]
  loading: boolean
  error: string | null
  refreshNotes: () => Promise<void>
  addNote: (note: Omit<Note, 'id'>) => Promise<Note>
  updateNote: (id: string, updates: Partial<Pick<Note, 'content' | 'updatedAt' | 'pinned'>>) => Promise<Note | null>
  deleteNote: (id: string) => Promise<boolean>
  setPinnedNote: (noteId: string | null) => Promise<void>
  getNoteById: (id: string) => Note | undefined
}

const NotesContext = createContext<NotesContextValue | null>(null)

export function NotesProvider({ children }: { children: React.ReactNode }) {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refreshNotes = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const list = await fetchNotesList()
      setNotes(list)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load notes'
      setError(msg)
      setNotes([])
      // eslint-disable-next-line no-console
      console.error('NotesContext: failed to load notes', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshNotes()
  }, [refreshNotes])

  const addNote = useCallback(async (note: Omit<Note, 'id'>) => {
    const created = await addNoteData(note)
    setNotes((prev) => [created, ...prev])
    const mentionedIds = extractMentionedMemberIds(created.content ?? '')
    const toNotify = mentionedIds.filter((id) => id !== note.authorId)
    if (toNotify.length > 0) {
      createNotificationsForMembers(toNotify, {
        type: 'mention',
        title: `${note.author} mentioned you in a note`,
        link: `/notes?open=${created.id}`,
      }).catch(() => {})
    }
    return created
  }, [])

  const updateNote = useCallback(async (id: string, updates: Partial<Pick<Note, 'content' | 'updatedAt' | 'pinned'>>) => {
    const updated = await updateNoteData(id, updates)
    if (updated && updates.content) {
      setNotes((prev) => prev.map((n) => (n.id === id ? updated : n)))
      const mentionedIds = extractMentionedMemberIds(updates.content)
      const toNotify = mentionedIds.filter((mid) => mid !== updated.authorId)
      if (toNotify.length > 0) {
        createNotificationsForMembers(toNotify, {
          type: 'mention',
          title: `${updated.author} mentioned you in a note`,
          link: `/notes?open=${id}`,
        }).catch(() => {})
      }
    } else if (updated) {
      setNotes((prev) => prev.map((n) => (n.id === id ? updated : n)))
    }
    return updated
  }, [])

  const setPinnedNote = useCallback(async (noteId: string | null) => {
    await setPinnedNoteData(noteId)
    const list = await fetchNotesList()
    setNotes(list)
  }, [])

  const deleteNote = useCallback(async (id: string) => {
    const ok = await deleteNoteData(id)
    if (ok) {
      setNotes((prev) => prev.filter((n) => n.id !== id))
    }
    return ok
  }, [])

  const getNoteById = useCallback(
    (id: string): Note | undefined => {
      return notes.find((n) => n.id === id)
    },
    [notes]
  )

  const value = useMemo(
    () => ({
      notes,
      loading,
      error,
      refreshNotes,
      addNote,
      updateNote,
      deleteNote,
      setPinnedNote,
      getNoteById,
    }),
    [notes, loading, error, refreshNotes, addNote, updateNote, deleteNote, setPinnedNote, getNoteById]
  )

  return <NotesContext.Provider value={value}>{children}</NotesContext.Provider>
}

export function useNotes() {
  const ctx = useContext(NotesContext)
  if (!ctx) throw new Error('useNotes must be used within NotesProvider')
  return ctx
}
