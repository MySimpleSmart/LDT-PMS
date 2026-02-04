# ECHO PMS (LDT-PMS) — Project Management System

Small project management app built with **React**, **Vite**, **Ant Design**, and **Google Firebase**.

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). You’ll see the app with blank Dashboard, Projects, Tasks, and Settings pages.

---

## 1. How to use Google Firebase as backend and database

Firebase is used as the backend and database in this project.

### Setup

1. **Create a Firebase project**  
   Go to [Firebase Console](https://console.firebase.google.com/) → Add project.

2. **Register a web app**  
   In the project: Project settings → Your apps → Add app → Web. Copy the config object.

3. **Enable Firestore (recommended)**  
   Build → Firestore Database → Create database. Choose a location and start in **test mode** for development (restrict with rules before production).

4. **Optional: Realtime Database**  
   Build → Realtime Database → Create database if you want real-time JSON sync (e.g. presence, live updates).

5. **Environment variables**  
   Copy `.env.example` to `.env` and fill in the values from the Firebase config:

   ```env
   VITE_FIREBASE_API_KEY=your-api-key
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_APP_ID=...
   ```

6. **Initialize in the app**  
   Call `initFirebase()` once (e.g. in `main.tsx` or before first use). The app already has `src/lib/firebase.ts` with this.

### Using Firestore in the app

- **Read/write:** Use `getDb()` from `src/lib/firebase.ts`, then Firestore APIs:
  - `collection()`, `doc()`, `setDoc()`, `getDoc()`, `getDocs()`, `addDoc()`, `updateDoc()`, `deleteDoc()`
- **Real-time:** `onSnapshot()` on a collection or document for live updates.
- **Auth (optional):** Use `getAuthInstance()` and Firebase Auth (signInWithEmailAndPassword, etc.).

Example:

```ts
import { getDb } from '@/lib/firebase'
import { collection, getDocs, addDoc } from 'firebase/firestore'

const db = getDb()
const projectsRef = collection(db, 'projects')
const snapshot = await getDocs(projectsRef)
// or: await addDoc(projectsRef, { name: 'My Project', createdAt: new Date() })
```

Use **Firestore** for structured data (projects, tasks, users). Use **Realtime Database** only if you need its specific features (e.g. presence, very high write throughput).

---

## 2. Using Ant Design for UI

Ant Design is the UI library used across the app.

- **Already set up:** The app uses Ant Design’s `Layout`, `Menu`, `Typography`, and a global `ConfigProvider` in `App.tsx`.
- **Components:** Import from `antd` (e.g. `Button`, `Table`, `Form`, `Card`, `Modal`). Icons from `@ant-design/icons`.
- **Theming:** `ConfigProvider` in `App.tsx` sets a primary color and border radius; you can extend `theme.token` there.
- **Docs:** [Ant Design React](https://ant.design/docs/react/introduce) and [Components](https://ant.design/components/overview).

Example:

```tsx
import { Button, Table, Card } from 'antd'
import { PlusOutlined } from '@ant-design/icons'

<Card title="Projects">
  <Button type="primary" icon={<PlusOutlined />}>New project</Button>
  <Table dataSource={data} columns={columns} />
</Card>
```

---

## Project structure

- `src/lib/firebase.ts` — Firebase init, Firestore and Auth accessors
- `src/components/AppLayout.tsx` — Ant Design layout + sidebar navigation
- `src/pages/` — Dashboard, Projects, Tasks, Settings (blank pages ready to fill)
- `.env` — Your Firebase config (from `.env.example`)

---

## Scripts

| Command     | Description        |
|------------|--------------------|
| `npm run dev`    | Start dev server   |
| `npm run build`  | Production build   |
| `npm run preview`| Preview production build |
