import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { getAdminById } from '../data/admins'
import type { AdminDetail } from '../data/admins'

const STORAGE_KEY = 'echo_pms_current_admin_id'

type CurrentUserContextValue = {
  currentAdminId: string | null
  currentAdmin: AdminDetail | null
  setCurrentAdminId: (id: string | null) => void
  isLoggedIn: boolean
}

const CurrentUserContext = createContext<CurrentUserContextValue | null>(null)

export function CurrentUserProvider({ children }: { children: ReactNode }) {
  const [currentAdminId, setCurrentAdminIdState] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || '1'
    } catch {
      return '1'
    }
  })

  useEffect(() => {
    try {
      if (currentAdminId) {
        localStorage.setItem(STORAGE_KEY, currentAdminId)
      } else {
        localStorage.removeItem(STORAGE_KEY)
      }
    } catch {}
  }, [currentAdminId])

  const setCurrentAdminId = useCallback((id: string | null) => {
    setCurrentAdminIdState(id)
  }, [])

  const currentAdmin = currentAdminId ? getAdminById(currentAdminId) : null
  const isLoggedIn = Boolean(currentAdminId && currentAdmin)

  const value: CurrentUserContextValue = {
    currentAdminId,
    currentAdmin,
    setCurrentAdminId,
    isLoggedIn,
  }

  return (
    <CurrentUserContext.Provider value={value}>
      {children}
    </CurrentUserContext.Provider>
  )
}

export function useCurrentUser() {
  const ctx = useContext(CurrentUserContext)
  if (!ctx) throw new Error('useCurrentUser must be used within CurrentUserProvider')
  return ctx
}
