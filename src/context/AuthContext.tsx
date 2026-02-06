import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth'
import { initFirebase } from '../lib/firebase'

type AuthContextValue = {
  currentUser: User | null
  loading: boolean
  isAuthenticated: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  error: string | null
  clearError: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let unsubscribe: (() => void) | undefined
    let isMounted = true

    ;(async () => {
      try {
        // Initialize Firebase app and subscribe to auth state
        initFirebase()
        const auth = getAuth()
        unsubscribe = onAuthStateChanged(auth, (nextUser) => {
          if (!isMounted) return
          setCurrentUser(nextUser)
          setLoading(false)
        })
      } catch (err) {
        // If Firebase isn't configured correctly, surface a generic error
        // but don't fall back to any demo users.
        // eslint-disable-next-line no-console
        console.error('Failed to initialize Firebase Auth', err)
        if (isMounted) {
          setError('Authentication is not available. Please check Firebase configuration.')
          setCurrentUser(null)
          setLoading(false)
        }
      }
    })()

    return () => {
      isMounted = false
      unsubscribe?.()
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    setError(null)
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
    try {
      const auth = getAuth()
      await firebaseSignOut(auth)
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error signing out', err)
    } finally {
      setCurrentUser(null)
    }
  }, [])

  const clearError = useCallback(() => setError(null), [])

  const value: AuthContextValue = {
    currentUser,
    loading,
    isAuthenticated: !!currentUser,
    signIn,
    signOut,
    error,
    clearError,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
