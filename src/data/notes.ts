import type { Note } from '../types/note'

/** Demo notes. Content can include @[Display Name](memberId) for mentions. */
const DEMO_NOTES: Note[] = [
  {
    id: '1',
    content: 'Sprint planning moved to Thursday. Please confirm availability. Mentioning @[Jane Doe](LDA0001) for backend scope.',
    author: 'Sam Admin',
    createdAt: '2025-02-01T10:00:00',
    updatedAt: '2025-02-01T14:30:00',
  },
  {
    id: '2',
    content: 'Design review notes: homepage layout approved. @[Mia Chen](LDA0005) to update wireframes.',
    author: 'Sam Admin',
    createdAt: '2025-02-03T09:15:00',
  },
]

let nextId = 3
const notesStore: Note[] = [...DEMO_NOTES]

export function getNotesList(): Note[] {
  return [...notesStore].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export function getNoteById(id: string): Note | undefined {
  return notesStore.find((n) => n.id === id)
}

export function addNote(note: Omit<Note, 'id'>): Note {
  const id = String(nextId++)
  const created: Note = { ...note, id, createdAt: note.createdAt }
  notesStore.unshift(created)
  return created
}

export function updateNote(id: string, updates: Partial<Pick<Note, 'content' | 'updatedAt'>>): Note | undefined {
  const index = notesStore.findIndex((n) => n.id === id)
  if (index === -1) return undefined
  const updated = { ...notesStore[index], ...updates }
  notesStore[index] = updated
  return updated
}

export function deleteNote(id: string): boolean {
  const index = notesStore.findIndex((n) => n.id === id)
  if (index === -1) return false
  notesStore.splice(index, 1)
  return true
}
