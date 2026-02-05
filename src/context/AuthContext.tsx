import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth'
import { initFirebase, isFirebaseConfigured } from '../lib/firebase'

/** Demo users when Firebase is not configured */
const DEMO_PASSWORD = '123'

export type UserRole = 'admin' | 'member'

export type AuthUser = User | { uid: 'demo'; email: string; role?: UserRole; adminId?: string; memberId?: string }

type AuthContextValue = {
  user: AuthUser | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  error: string | null
  clearError: () => void
  userRole: UserRole | null
}

const AuthContext = createContext<AuthContextValue | null>(null)

function getDemoLogin(email: string, password: string): { role: UserRole; adminId?: string; memberId?: string } | null {
  if (password !== DEMO_PASSWORD) return null
  const normalized = email.trim().toLowerCase()
  if (normalized === 'admin' || normalized === 'admin@test.com') return { role: 'admin', adminId: '1' }
  if (normalized === 'alex' || normalized === 'alex.river@company.com') return { role: 'admin', adminId: '2' }
  if (normalized === 'projectlead' || normalized === 'lead' || normalized === 'projectlead@test.com' || normalized === 'noah.wilson@company.com') return { role: 'member', memberId: 'LDA0006' }
  return null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let unsubscribe: (() => void) | undefined
    const stopLoading = () => setLoading(false)
    const timeoutId = setTimeout(stopLoading, 3000)

    try {
      initFirebase()
      const auth = getAuth()
      unsubscribe = onAuthStateChanged(auth, (nextUser) => {
        setUser(nextUser)
        stopLoading()
      })
    } catch {
      stopLoading()
    }

    return () => {
      clearTimeout(timeoutId)
      unsubscribe?.()
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    setError(null)
    const demo = getDemoLogin(email, password)
    if (demo) {
      setUser({
        uid: 'demo',
        email: email.trim() || (demo.memberId ? 'noah.wilson@company.com' : demo.adminId === '2' ? 'alex' : 'admin'),
        role: demo.role,
        adminId: demo.adminId,
        memberId: demo.memberId,
      })
      return
    }
    if (!isFirebaseConfigured()) {
      setError('Demo: admin/123 (Super Admin), projectlead/123 (Project Lead), alex/123 (Admin). Configure Firebase for real login.')
      throw new Error('Demo credentials only')
    }
    const auth = getAuth()
    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch (err: unknown) {
      const message = err && typeof err === 'object' && 'message' in err
        ? String((err as { message: string }).message)
        : 'Sign in failed'
      setError(message)
      throw err
    }
  }, [])

  const signOut = useCallback(async () => {
    setError(null)
    setUser(null)
    if (isFirebaseConfigured()) {
      try {
        const auth = getAuth()
        await firebaseSignOut(auth)
      } catch {
        // ignore if not signed in via Firebase
      }
    }
  }, [])

  const clearError = useCallback(() => setError(null), [])

  const userRole: UserRole | null = user ? ((user as { role?: UserRole }).role ?? 'admin') : null

  const value: AuthContextValue = {
    user,
    loading,
    signIn,
    signOut,
    error,
    clearError,
    userRole,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
