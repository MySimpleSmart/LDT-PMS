import { getDb } from '../lib/firebase'
import { collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, query, orderBy, writeBatch } from 'firebase/firestore'
import type { Note } from '../types/note'

const NOTES_COLLECTION = 'notes'

interface NoteDoc {
  content?: string
  author?: string
  authorId?: string
  createdAt?: string
  updatedAt?: string
  pinned?: boolean
}

function mapDocToNote(docId: string, data: NoteDoc): Note {
  return {
    id: docId,
    content: data.content ?? '',
    author: data.author ?? '',
    authorId: data.authorId?.trim() || undefined,
    createdAt: data.createdAt ?? '',
    updatedAt: data.updatedAt?.trim() || undefined,
    pinned: data.pinned === true,
  }
}

/** List all notes, newest first. */
export async function getNotesList(): Promise<Note[]> {
  const db = getDb()
  const colRef = collection(db, NOTES_COLLECTION)
  const q = query(colRef, orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => mapDocToNote(d.id, d.data() as NoteDoc))
}

/** Get a single note by ID. */
export async function getNoteById(id: string): Promise<Note | null> {
  if (!id?.trim()) return null
  const db = getDb()
  const ref = doc(db, NOTES_COLLECTION, id.trim())
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  return mapDocToNote(snap.id, snap.data() as NoteDoc)
}

/** Create a new note. */
export async function addNote(note: Omit<Note, 'id'>): Promise<Note> {
  const db = getDb()
  const colRef = collection(db, NOTES_COLLECTION)
  const now = new Date().toISOString()
  const docData: NoteDoc = {
    content: note.content ?? '',
    author: note.author ?? '',
    authorId: note.authorId?.trim() || '',
    createdAt: note.createdAt ?? now,
    updatedAt: '',
  }
  const docRef = await addDoc(colRef, docData)
  return mapDocToNote(docRef.id, docData)
}

/** Update an existing note. */
export async function updateNote(id: string, updates: Partial<Pick<Note, 'content' | 'updatedAt' | 'pinned'>>): Promise<Note | null> {
  if (!id?.trim()) return null
  const db = getDb()
  const ref = doc(db, NOTES_COLLECTION, id.trim())
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  const updateData: Partial<NoteDoc> = {}
  if (updates.content !== undefined) updateData.content = updates.content
  if (updates.updatedAt !== undefined) updateData.updatedAt = updates.updatedAt
  if (updates.pinned !== undefined) updateData.pinned = updates.pinned
  await updateDoc(ref, updateData)
  const existing = snap.data() as NoteDoc
  return mapDocToNote(snap.id, { ...existing, ...updateData })
}

/** Pin a single note and unpin all others. Only one note can be pinned. */
export async function setPinnedNote(noteId: string | null): Promise<void> {
  const db = getDb()
  const colRef = collection(db, NOTES_COLLECTION)
  const snap = await getDocs(colRef)
  const batch = writeBatch(db)

  for (const d of snap.docs) {
    const data = d.data() as NoteDoc
    const isTarget = d.id === noteId
    if (data.pinned === true && !isTarget) {
      batch.update(d.ref, { pinned: false })
    } else if (isTarget && noteId) {
      batch.update(d.ref, { pinned: true })
    }
  }

  await batch.commit()
}

/** Delete a note. */
export async function deleteNote(id: string): Promise<boolean> {
  if (!id?.trim()) return false
  const db = getDb()
  const ref = doc(db, NOTES_COLLECTION, id.trim())
  const snap = await getDoc(ref)
  if (!snap.exists()) return false
  await deleteDoc(ref)
  return true
}
