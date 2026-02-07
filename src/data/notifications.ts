import { getDb } from '../lib/firebase'
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  query,
  orderBy,
  limit,
  onSnapshot,
  deleteDoc,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore'
import type { Notification } from '../types/notification'

const NOTIFICATIONS_SUB = 'notifications'
const MAX_KEEP = 50
const CLEANUP_THRESHOLD = 100

interface NotificationDoc {
  type?: string
  title?: string
  link?: string
  createdAt?: string
  read?: boolean
}

function notificationsRef(memberId: string) {
  const db = getDb()
  return collection(db, 'members', memberId.trim(), NOTIFICATIONS_SUB)
}

function mapDocToNotification(docId: string, data: NotificationDoc): Notification {
  return {
    id: docId,
    type: (data.type as Notification['type']) ?? 'mention',
    title: data.title ?? '',
    link: data.link ?? '',
    createdAt: data.createdAt ?? '',
    read: data.read === true,
  }
}

/** Create a notification for a member. Call from note mentions, task assign, project add. */
export async function createNotification(
  memberId: string,
  payload: { type: Notification['type']; title: string; link: string }
): Promise<void> {
  if (!memberId?.trim()) return
  const colRef = notificationsRef(memberId)
  const now = new Date().toISOString()
  const docData: NotificationDoc = {
    type: payload.type,
    title: payload.title,
    link: payload.link,
    createdAt: now,
    read: false,
  }
  await addDoc(colRef, docData)
  await cleanupIfNeeded(memberId)
}

/** Create notifications for multiple members (e.g. note mentions). */
export async function createNotificationsForMembers(
  memberIds: string[],
  payload: { type: Notification['type']; title: string; link: string }
): Promise<void> {
  const unique = [...new Set(memberIds)].filter(Boolean)
  for (const mid of unique) {
    try {
      await createNotification(mid, payload)
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('Failed to create notification for', mid, err)
    }
  }
}

async function cleanupIfNeeded(memberId: string): Promise<void> {
  const colRef = notificationsRef(memberId)
  const snap = await getDocs(colRef)
  if (snap.size <= CLEANUP_THRESHOLD) return
  const sorted = snap.docs.sort((a, b) => {
    const aAt = (a.data() as NotificationDoc).createdAt ?? ''
    const bAt = (b.data() as NotificationDoc).createdAt ?? ''
    return aAt.localeCompare(bAt)
  })
  const toDelete = sorted.slice(0, snap.size - MAX_KEEP)
  const db = getDb()
  const batch = writeBatch(db)
  toDelete.forEach((d) => batch.delete(d.ref))
  await batch.commit()
}

/** Mark a notification as read. */
export async function markNotificationRead(memberId: string, notificationId: string): Promise<void> {
  if (!memberId?.trim() || !notificationId?.trim()) return
  const db = getDb()
  const ref = doc(db, 'members', memberId.trim(), NOTIFICATIONS_SUB, notificationId.trim())
  await updateDoc(ref, { read: true })
}

/** Delete all notifications for a member (e.g. on first login). */
export async function deleteAllNotificationsForMember(memberId: string): Promise<void> {
  if (!memberId?.trim()) return
  const colRef = notificationsRef(memberId)
  const snap = await getDocs(colRef)
  if (snap.empty) return
  const db = getDb()
  const batch = writeBatch(db)
  snap.docs.forEach((d) => batch.delete(d.ref))
  await batch.commit()
}

/** Mark all notifications as read for a member. */
export async function markAllNotificationsRead(memberId: string): Promise<void> {
  if (!memberId?.trim()) return
  const colRef = notificationsRef(memberId)
  const snap = await getDocs(colRef)
  const db = getDb()
  const batch = writeBatch(db)
  snap.docs.forEach((d) => {
    if ((d.data() as NotificationDoc).read !== true) {
      batch.update(d.ref, { read: true })
    }
  })
  if (snap.docs.length > 0) await batch.commit()
}

/** Subscribe to notifications for a member. Returns unsubscribe function. */
export function subscribeToNotifications(
  memberId: string | null,
  onUpdate: (notifications: Notification[]) => void
): Unsubscribe {
  if (!memberId?.trim()) {
    onUpdate([])
    return () => {}
  }
  const colRef = notificationsRef(memberId)
  const q = query(colRef, orderBy('createdAt', 'desc'), limit(MAX_KEEP))
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => mapDocToNotification(d.id, d.data() as NotificationDoc))
    onUpdate(list)
  })
}
