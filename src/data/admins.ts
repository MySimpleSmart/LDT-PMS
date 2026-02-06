import { getMemberById, getMembersWithAdminRole } from './members'
import { getRelatedProjectsForMember } from './projects'
import { getRelatedTasksForMember } from './tasks'
import { ADMIN_ROLE, isSuperAdminId } from '../constants/roles'
import type { ProjectActivity } from '../types/project'

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
  activityLog: ProjectActivity[]
}

/** Resolve admin by member id (from Firestore members with role super_admin or admin). */
export async function getAdminById(id: string): Promise<AdminDetail | null> {
  if (!id?.trim()) return null
  const member = await getMemberById(id.trim())
  if (!member) return null
  if (member.roleSystem !== 'super_admin' && member.roleSystem !== 'admin') return null
  return {
    adminId: member.memberId,
    accountStatus: member.accountStatus,
    profileImage: member.profileImage,
    firstName: member.firstName,
    lastName: member.lastName,
    email: member.email,
    phone: member.phone,
    department: member.department,
    role: member.roleSystem === 'super_admin' ? ADMIN_ROLE.SUPER_ADMIN : ADMIN_ROLE.ADMIN,
    position: member.position ?? '',
    relatedProjects: getRelatedProjectsForMember(member.memberId),
    relatedTasks: getRelatedTasksForMember(member.memberId),
    activityLog: member.activityLog,
  }
}

/** List of admin users for Admins page (from Firestore members with role super_admin or admin). */
export async function getAdminsList(): Promise<ProjectLeadRow[]> {
  const rows = await getMembersWithAdminRole()
  return rows.map((r) => ({
    id: r.id,
    profilePath: `/admins/${r.id}`,
    memberId: r.memberId,
    fullName: r.fullName,
    firstName: r.firstName,
    lastName: r.lastName,
    profileImage: r.profileImage,
    email: r.email,
    department: r.department,
    role: r.role,
    status: r.status,
  }))
}

/** Whether the admin is Super Admin. */
export { isSuperAdminId } from '../constants/roles'

