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

## Add Member (Cloud Functions)

The "Add member" flow uses a Cloud Function that:

1. Creates a Firebase Auth user with a temporary password
2. Creates the member in Firestore with status **Inactive**
3. Sends a password reset email so the member can set their own password

### Setup

1. **Link Firebase project**  
   Ensure `.firebaserc` uses your Firebase project ID (same as `VITE_FIREBASE_PROJECT_ID`):
   ```bash
   firebase use your-project-id
   ```

2. **Deploy functions**  
   ```bash
   cd functions && npm install && npm run deploy
   ```

3. **Email configuration (optional)**  
   To send the password reset email, set environment variables for your functions:
   - **Gmail:** `GMAIL_USER` and `GMAIL_APP_PASSWORD` (use an [App Password](https://support.google.com/accounts/answer/185833))
   - **Other SMTP:** `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_HOST`, `SMTP_PORT`

   In Firebase Console: Project → Functions → select your function → Environment variables.

   If SMTP is not configured, the member is still created; the password reset email will not be sent (check function logs for the link during development).

4. **App URL (optional)**  
   Set `VITE_APP_URL` to your production URL so the password reset link points to the correct site (default: `http://localhost:5173`).

---

## Scripts

| Command     | Description        |
|------------|--------------------|
| `npm run dev`    | Start dev server   |
| `npm run build`  | Production build   |
| `npm run preview`| Preview production build |

### Functions

| Command (from `functions/`) | Description        |
|-----------------------------|--------------------|
| `npm run deploy`            | Deploy Cloud Functions |
| `npm run serve`             | Run Functions emulator |
