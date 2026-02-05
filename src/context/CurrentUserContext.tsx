import { createContext, useContext, useState, useCallback, useEffect, useMemo, type ReactNode } from 'react'
import { getAdminById } from '../data/admins'
import type { AdminDetail } from '../data/admins'
import { getMemberIdForAdminId, getMemberById } from '../data/members'
import type { MemberDetail } from '../data/members'
import { getMemberIdsWhoAreProjectLeads } from '../data/projects'
import { getMemberProfilePath } from '../data/members'
import { useAuth } from './AuthContext'
import { isSuperAdminId } from '../constants/roles'

const STORAGE_KEY = 'echo_pms_current_admin_id'

const DEFAULT_ADMIN_ID = '1'

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
  const { user, userRole } = useAuth()
  const [currentAdminId, setCurrentAdminIdState] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || null
    } catch {
      return null
    }
  })

  const authAdminId = user && (user as { adminId?: string }).adminId ? (user as { adminId: string }).adminId : null
  const authMemberId = user && (user as { memberId?: string }).memberId ? (user as { memberId: string }).memberId : null
  useEffect(() => {
    if (user && userRole === 'admin') {
      setCurrentAdminIdState(authAdminId || DEFAULT_ADMIN_ID)
    }
    if (user && userRole === 'member') {
      setCurrentAdminIdState(null)
    }
    if (!user) {
      setCurrentAdminIdState(null)
    }
  }, [user, userRole, authAdminId])

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
  const currentMemberId = userRole === 'member' && authMemberId ? authMemberId : null
  const currentMember = currentMemberId ? getMemberById(currentMemberId) : null
  const isLoggedIn = Boolean((currentAdminId && currentAdmin) || (currentMemberId && currentMember))
  const isSuperAdmin = isSuperAdminId(currentAdminId)
  const isProjectLead = useMemo(() => {
    if (isSuperAdmin) return true
    const memberId = currentMemberId || (currentAdminId ? getMemberIdForAdminId(currentAdminId) : null)
    if (!memberId) return false
    const leadIds = getMemberIdsWhoAreProjectLeads().map((id) => id.toUpperCase())
    return leadIds.includes(memberId.toUpperCase())
  }, [isSuperAdmin, currentAdminId, currentMemberId])

  const displayName = currentAdmin
    ? `${currentAdmin.firstName} ${currentAdmin.lastName}`
    : currentMember
      ? `${currentMember.firstName} ${currentMember.lastName}`
      : 'User'
  const profilePath = currentAdminId
    ? `/admins/${currentAdminId}`
    : currentMemberId
      ? getMemberProfilePath(currentMemberId)
      : '/'
  const currentUserMemberId = currentMemberId || (currentAdminId ? getMemberIdForAdminId(currentAdminId) : null)

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
