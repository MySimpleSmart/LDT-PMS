import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getFirestore, type Firestore } from 'firebase/firestore'
import { getAuth, type Auth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

// TEMP runtime check (remove after)
console.log('FIREBASE ENV', {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
})

let app: FirebaseApp | undefined
let db: Firestore | undefined
let auth: Auth | undefined

export function isFirebaseConfigured(): boolean {
  return Boolean(
    firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    firebaseConfig.appId
  )
}

export function initFirebase(): FirebaseApp {
  if (app) return app
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured. Add VITE_FIREBASE_* env vars.')
  }
  app = initializeApp(firebaseConfig)
  db = getFirestore(app)
  auth = getAuth(app)
  return app
}

export function getDb(): Firestore {
  if (!db) initFirebase()
  return db!
}

export function getAuthInstance(): Auth {
  if (!auth) initFirebase()
  return auth!
}
