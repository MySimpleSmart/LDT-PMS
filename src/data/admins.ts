import { formatAdminId } from '../types/admin'
import { SUPER_ADMIN_MEMBER_ID } from './members'
import { getRelatedProjectsForMember } from './projects'
import { getRelatedTasksForMember } from './tasks'

export interface AdminDetail {
  adminId: string
  accountStatus: 'Active' | 'Inactive'
  profileImage: string | null
  firstName: string
  lastName: string
  email: string
  phone: string
  department: string
  role: string
  position: string
  relatedProjects: { key: string; name: string; role: string }[]
  relatedTasks: { key: string; title: string; status: string; project: string }[]
}

// Placeholder: replace with Firebase (getDoc from 'admins' collection)
export function getAdminById(id: string): AdminDetail | null {
  const num = id === '2' ? 2 : 1
  return {
    adminId: id.toUpperCase().startsWith('ADA') ? id : formatAdminId(num),
    accountStatus: (id === '2' ? 'Inactive' : 'Active') as 'Active' | 'Inactive',
    profileImage: null,
    firstName: id === '2' ? 'Alex' : 'Sam',
    lastName: id === '2' ? 'River' : 'Admin',
    email: id === '2' ? 'alex.river@company.com' : 'sam.admin@company.com',
    phone: id === '2' ? '+1 234 567 8902' : '+1 234 567 8899',
    department: id === '2' ? 'Operations' : 'Engineering',
    role: id === '2' ? 'Admin' : 'Super Admin',
    position: id === '2' ? 'Operations Admin' : 'System Administrator',
    relatedProjects: id === '2' ? [] : getRelatedProjectsForMember(SUPER_ADMIN_MEMBER_ID),
    relatedTasks: id === '2' ? [] : getRelatedTasksForMember(SUPER_ADMIN_MEMBER_ID),
  }
}
