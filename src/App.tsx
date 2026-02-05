import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import { AuthProvider } from './context/AuthContext'
import { CurrentUserProvider } from './context/CurrentUserContext'
import { ProjectMetaProvider } from './context/ProjectMetaContext'
import { TasksProvider } from './context/TasksContext'
import { UnsavedChangesProvider } from './context/UnsavedChangesContext'
import { NotesProvider } from './context/NotesContext'
import AppLayout from './components/AppLayout'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Projects from './pages/Projects'
import ProjectProfile from './pages/ProjectProfile'
import NewProject from './pages/NewProject'
import EditProject from './pages/EditProject'
import ProjectCategoriesAndTags from './pages/ProjectCategoriesAndTags'
import Tasks from './pages/Tasks'
import NewTask from './pages/NewTask'
import Members from './pages/Members'
import MemberProfile from './pages/MemberProfile'
import NewMember from './pages/NewMember'
import EditMember from './pages/EditMember'
import Admins from './pages/Admins'
import AdminProfile from './pages/AdminProfile'
import NewAdmin from './pages/NewAdmin'
import EditAdmin from './pages/EditAdmin'
import Notes from './pages/Notes'
import Files from './pages/Files'
import Courses from './pages/Courses'
import { useCurrentUser } from './context/CurrentUserContext'
import './App.css'

function SettingsRedirect() {
  const { profilePath } = useCurrentUser()
  return <Navigate to={profilePath !== '/' ? profilePath : '/'} replace />
}

function App() {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1890ff',
          borderRadius: 6,
        },
      }}
    >
      <BrowserRouter>
        <AuthProvider>
        <NotesProvider>
        <CurrentUserProvider>
        <ProjectMetaProvider>
        <TasksProvider>
        <UnsavedChangesProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="projects" element={<Projects />} />
            <Route path="projects/new" element={<NewProject />} />
            <Route path="projects/categories" element={<ProjectCategoriesAndTags />} />
            <Route path="projects/tags" element={<Navigate to="/projects/categories" replace state={{ tab: 'tags' }} />} />
            <Route path="projects/:id/edit" element={<EditProject />} />
            <Route path="projects/:id" element={<ProjectProfile />} />
            <Route path="tasks" element={<Tasks />} />
            <Route path="tasks/new" element={<NewTask />} />
            <Route path="members" element={<Members />} />
            <Route path="members/new" element={<NewMember />} />
            <Route path="members/:id/edit" element={<EditMember />} />
            <Route path="members/:id" element={<MemberProfile />} />
            <Route path="admins" element={<Admins />} />
            <Route path="admins/new" element={<NewAdmin />} />
            <Route path="admins/:id/edit" element={<EditAdmin />} />
            <Route path="admins/:id" element={<AdminProfile />} />
            <Route path="notes" element={<Notes />} />
            <Route path="files" element={<Files />} />
            <Route path="courses" element={<Courses />} />
            <Route path="settings" element={<SettingsRedirect />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
        </UnsavedChangesProvider>
        </TasksProvider>
        </ProjectMetaProvider>
        </CurrentUserProvider>
        </NotesProvider>
        </AuthProvider>
      </BrowserRouter>
    </ConfigProvider>
  )
}

export default App
