import { createContext, useContext, useState, useCallback, useEffect, useMemo, type ReactNode } from 'react'
import type { AdminDetail } from '../data/admins'
import type { MemberDetail } from '../data/members'
import { getMemberByEmail } from '../data/members'
import { getProjectsList, getRelatedProjectsForMember } from '../data/projects'
import { useAuth } from './AuthContext'

const STORAGE_KEY = 'echo_pms_current_admin_id'

type CurrentUserContextValue = {
  currentAdminId: string | null
  currentAdmin: AdminDetail | null
  currentMemberId: string | null
  currentMember: MemberDetail | null
  setCurrentAdminId: (id: string | null) => void
  isLoggedIn: boolean
  /** True when member profile has role super_admin (from Firestore members). */
  isSuperAdmin: boolean
  /** True when member profile has role super_admin or admin (can pin notes, etc.). */
  isAdmin: boolean
  /** True when current user can use project lead dashboard (Super Admin or project lead). */
  isProjectLead: boolean
  /** Display name for header (from member profile or Firebase user). */
  displayName: string
  /** Profile path for header link (member profile page). */
  profilePath: string
  /** Current user's member id from Firestore members (e.g. LDA0001). */
  currentUserMemberId: string | null
  /** Re-fetch current user's member profile (e.g. after editing own profile). */
  refreshMemberProfile: () => Promise<void>
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
  const [memberProfile, setMemberProfile] = useState<{ id: string; detail: MemberDetail } | null>(null)

  useEffect(() => {
    if (!isAuthenticated) {
      setCurrentAdminIdState(null)
      setMemberProfile(null)
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

  const loadMemberProfile = useCallback(async () => {
    if (!currentUser?.email) {
      setMemberProfile(null)
      return
    }
    try {
      const result = await getMemberByEmail(currentUser.email)
      setMemberProfile(result)
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to load member profile for current user', err)
      setMemberProfile(null)
    }
  }, [currentUser?.email])

  // Load current user's member profile from Firestore by email
  useEffect(() => {
    if (!isAuthenticated || !currentUser?.email) {
      setMemberProfile(null)
      return
    }
    loadMemberProfile()
  }, [isAuthenticated, currentUser?.email])

  const refreshMemberProfile = useCallback(async () => {
    await loadMemberProfile()
  }, [loadMemberProfile])

  const currentAdmin: AdminDetail | null = null
  const currentMember = memberProfile?.detail ?? null
  const currentMemberId = memberProfile?.detail?.memberId ?? null
  const isLoggedIn = isAuthenticated
  const isSuperAdmin = memberProfile?.detail?.roleSystem === 'super_admin'
  const isAdmin = isSuperAdmin || memberProfile?.detail?.roleSystem === 'admin'
  const isProjectLead = useMemo(() => {
    if (!memberProfile?.detail) return isAuthenticated
    return isSuperAdmin || (memberProfile.detail.memberId && getRelatedProjectsForMember(memberProfile.detail.memberId).length > 0)
  }, [memberProfile, isSuperAdmin, isAuthenticated])

  const displayName = memberProfile?.detail
    ? `${memberProfile.detail.firstName} ${memberProfile.detail.lastName}`.trim() || memberProfile.detail.email || 'User'
    : (currentUser?.displayName || currentUser?.email || 'User')
  const profilePath = memberProfile?.detail
    ? `/members/${memberProfile.id}`
    : '/'
  const currentUserMemberId = memberProfile?.detail?.memberId ?? null

  const value: CurrentUserContextValue = {
    currentAdminId,
    currentAdmin,
    currentMemberId,
    currentMember,
    setCurrentAdminId,
    isLoggedIn,
    isSuperAdmin,
    isAdmin,
    isProjectLead,
    displayName,
    profilePath,
    currentUserMemberId,
    refreshMemberProfile,
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
