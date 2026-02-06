import { createContext, useContext, useState, useCallback, useEffect, useMemo, type ReactNode } from 'react'
import type { AdminDetail } from '../data/admins'
import type { MemberDetail } from '../data/members'
import { getProjectsList } from '../data/projects'
import { useAuth } from './AuthContext'

const STORAGE_KEY = 'echo_pms_current_admin_id'

type CurrentUserContextValue = {
  currentAdminId: string | null
  currentAdmin: AdminDetail | null
  currentMemberId: string | null
  currentMember: MemberDetail | null
  setCurrentAdminId: (id: string | null) => void
  isLoggedIn: boolean
  /** True when admin id is 1 (Super Admin). Only Super Admin can add/remove admins; Admin cannot edit Super Admin. */
  isSuperAdmin: boolean
  /** True when current user can use project lead dashboard (Super Admin or project lead). */
  isProjectLead: boolean
  /** Display name for header (admin or member). */
  displayName: string
  /** Profile path for header link (admin or member). */
  profilePath: string
  /** Current user's member id (for project/task checks). Admin → ADA0001/2, member → e.g. LDA0006. */
  currentUserMemberId: string | null
}

const CurrentUserContext = createContext<CurrentUserContextValue | null>(null)

export function CurrentUserProvider({ children }: { children: ReactNode }) {
  const { currentUser, isAuthenticated } = useAuth()
  const [currentAdminId, setCurrentAdminIdState] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || null
    } catch {
      return null
    }
  })

  useEffect(() => {
    // For now, do not map Firebase users to demo admin IDs automatically.
    // Any authenticated user is treated as a generic logged-in user; admin/member
    // domain data remains demo-only and is not tied to Auth.
    if (!isAuthenticated) {
      setCurrentAdminIdState(null)
    }
  }, [isAuthenticated])

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

  // Preload projects into cache so project-lead checks have data from Firestore
  useEffect(() => {
    ;(async () => {
      try {
        await getProjectsList()
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Failed to preload projects for CurrentUserContext', err)
      }
    })()
  }, [])

  const currentAdmin: AdminDetail | null = null
  const currentMemberId: string | null = null
  const currentMember: MemberDetail | null = null
  const isLoggedIn = isAuthenticated
  // Until real role mapping is implemented, treat any authenticated user
  // as having full access to admin/project-lead features.
  const isSuperAdmin = isAuthenticated
  const isProjectLead = useMemo(() => isAuthenticated, [isAuthenticated])

  const displayName =
    currentUser?.displayName ||
    currentUser?.email ||
    'User'
  const profilePath = '/'
  const currentUserMemberId: string | null = null

  const value: CurrentUserContextValue = {
    currentAdminId,
    currentAdmin,
    currentMemberId,
    currentMember,
    setCurrentAdminId,
    isLoggedIn,
    isSuperAdmin,
    isProjectLead,
    displayName,
    profilePath,
    currentUserMemberId,
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
