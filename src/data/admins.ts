import { formatAdminId } from '../types/admin'
import { SUPER_ADMIN_MEMBER_ID, getMemberIdForAdminId } from './members'
import { getRelatedProjectsForMember } from './projects'
import { getRelatedTasksForMember } from './tasks'
import { ADMIN_ROLE, SUPER_ADMIN_ID, isSuperAdminId } from '../constants/roles'

export type ProjectLeadRow = {
  id: string
  profilePath: string
  memberId: string
  fullName: string
  firstName: string
  lastName: string
  profileImage: string | null
  email: string
  department: string
  /** System role only: "Admin" or "Member". Same as Members page — one role per person. */
  role: string
  status: 'Active' | 'Inactive'
}


/** Position options for admin and member (same list). System roles: Admin, Member. */
export const ADMIN_POSITION_OPTIONS = [
  { value: 'System Administrator', label: 'System Administrator' },
  { value: 'Project Manager', label: 'Project Manager' },
  { value: 'Technical Lead', label: 'Technical Lead' },
  { value: 'Product Manager', label: 'Product Manager' },
  { value: 'Operations Manager', label: 'Operations Manager' },
  { value: 'Engineering Manager', label: 'Engineering Manager' },
  { value: 'Team Lead', label: 'Team Lead' },
  { value: 'Scrum Master', label: 'Scrum Master' },
  { value: 'Business Analyst', label: 'Business Analyst' },
  { value: 'Solutions Architect', label: 'Solutions Architect' },
  { value: 'Delivery Manager', label: 'Delivery Manager' },
  { value: 'Account Manager', label: 'Account Manager' },
] as const

export type AdminPosition = (typeof ADMIN_POSITION_OPTIONS)[number]['value']

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

/** Admin account role: Super Admin (id 1) or Admin (id 2+). Super Admin is one only. */
export function getAdminRoleForDisplay(adminId: string): string {
  return isSuperAdminId(adminId) ? ADMIN_ROLE.SUPER_ADMIN : ADMIN_ROLE.ADMIN
}

// Placeholder: replace with Firebase (getDoc from 'admins' collection)
export function getAdminById(id: string): AdminDetail | null {
  const num = id === '2' ? 2 : 1
  const memberId = getMemberIdForAdminId(id) ?? SUPER_ADMIN_MEMBER_ID
  const byId: Record<string, { accountStatus: 'Active' | 'Inactive'; firstName: string; lastName: string; email: string; phone: string; department: string; position: string }> = {
    '1': { accountStatus: 'Active', firstName: 'Sam', lastName: 'Admin', email: 'sam.admin@company.com', phone: '+1 234 567 8899', department: 'Engineering', position: 'System Administrator' },
    '2': { accountStatus: 'Inactive', firstName: 'Alex', lastName: 'River', email: 'alex.river@company.com', phone: '+1 234 567 8902', department: 'Operations', position: 'Project Manager' },
  }
  const data = byId[id] ?? byId['1']
  return {
    adminId: id.toUpperCase().startsWith('ADA') ? id : formatAdminId(num),
    accountStatus: data.accountStatus,
    profileImage: null,
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    phone: data.phone,
    department: data.department,
    role: getAdminRoleForDisplay(id),
    position: data.position,
    relatedProjects: getRelatedProjectsForMember(memberId),
    relatedTasks: getRelatedTasksForMember(memberId),
  }
}

/** List of admin users for Admins page. Super Admin (id 1) and Admin (id 2). */
export function getAdminsList(): ProjectLeadRow[] {
  const ids = [SUPER_ADMIN_ID, '2']
  return ids.map((id) => {
    const detail = getAdminById(id)
    if (!detail) return null
    const memberId = getMemberIdForAdminId(id) ?? detail.adminId
    return {
      id,
      profilePath: `/admins/${id}`,
      memberId,
      fullName: `${detail.firstName} ${detail.lastName}`.trim(),
      firstName: detail.firstName,
      lastName: detail.lastName,
      profileImage: detail.profileImage,
      email: detail.email,
      department: detail.department,
      role: getAdminRoleForDisplay(id),
      status: detail.accountStatus,
    }
  }).filter(Boolean) as ProjectLeadRow[]
}

/** Whether the admin is Super Admin (id 1). Only Super Admin can be edited by Super Admin; Admin cannot edit Super Admin. */
export { isSuperAdminId } from '../constants/roles'

