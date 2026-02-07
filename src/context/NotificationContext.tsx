import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import type { Notification } from '../types/notification'
import {
  subscribeToNotifications as subscribeNotifications,
  markNotificationRead as markReadData,
  markAllNotificationsRead as markAllReadData,
} from '../data/notifications'
import { useCurrentUser } from './CurrentUserContext'

interface NotificationContextValue {
  notifications: Notification[]
  unreadCount: number
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
}

const NotificationContext = createContext<NotificationContextValue | null>(null)

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { currentUserMemberId: memberId } = useCurrentUser()
  const [notifications, setNotifications] = useState<Notification[]>([])

  useEffect(() => {
    const unsub = subscribeNotifications(memberId, setNotifications)
    return unsub
  }, [memberId])

  const unreadCount = notifications.filter((n) => !n.read).length

  const markAsRead = useCallback(
    async (id: string) => {
      if (!memberId) return
      await markReadData(memberId, id)
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
    },
    [memberId]
  )

  const markAllAsRead = useCallback(async () => {
    if (!memberId) return
    await markAllReadData(memberId)
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }, [memberId])

  const value: NotificationContextValue = {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
  }

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
}

export function useNotifications() {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider')
  return ctx
}
