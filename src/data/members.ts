import { formatMemberId } from '../types/member'
import { AVATAR_FILES, getAvatarUrl } from '../constants/avatars'
import { getRelatedProjectsForMember, getMemberIdsWhoAreProjectLeads } from './projects'
import { getRelatedTasksForMember } from './tasks'
import { SYSTEM_ROLE } from '../constants/roles'

export interface MemberDetail {
  memberId: string
  accountStatus: 'Active' | 'Inactive'
  profileImage: string | null
  firstName: string
  lastName: string
  email: string
  phone: string
  department: string
  /** System role: Admin | Member (see constants/roles) */
  role: string
  /** Job type e.g. Developer, Designer (for Members only) */
  jobType?: string
  position: string
  relatedProjects: { key: string; name: string; role: string }[]
  relatedTasks: { key: string; title: string; status: string; project: string }[]
}

type DemoMember = {
  num: number
  firstName: string
  lastName: string
  email: string
  phone: string
  department: string
  role: string
  position: string
  status: 'Active' | 'Inactive'
}

const DEMO_MEMBERS: DemoMember[] = [
  { num: 1, firstName: 'Jane', lastName: 'Doe', email: 'jane.doe@company.com', phone: '+1 234 567 8900', department: 'Engineering', role: 'Developer', position: 'Senior Software Engineer', status: 'Active' },
  { num: 2, firstName: 'John', lastName: 'Smith', email: 'john.smith@company.com', phone: '+1 234 567 8901', department: 'Product', role: 'Designer', position: 'Product Designer', status: 'Inactive' },
  { num: 3, firstName: 'Amina', lastName: 'Khan', email: 'amina.khan@company.com', phone: '+1 234 567 8902', department: 'Engineering', role: 'QA', position: 'QA Engineer', status: 'Active' },
  { num: 4, firstName: 'Leo', lastName: 'Martinez', email: 'leo.martinez@company.com', phone: '+1 234 567 8903', department: 'Engineering', role: 'Developer', position: 'Frontend Engineer', status: 'Active' },
  { num: 5, firstName: 'Mia', lastName: 'Chen', email: 'mia.chen@company.com', phone: '+1 234 567 8904', department: 'Design', role: 'Designer', position: 'UI/UX Designer', status: 'Active' },
  { num: 6, firstName: 'Noah', lastName: 'Wilson', email: 'noah.wilson@company.com', phone: '+1 234 567 8905', department: 'Operations', role: 'Coordinator', position: 'Project Coordinator', status: 'Active' },
  { num: 7, firstName: 'Sara', lastName: 'Patel', email: 'sara.patel@company.com', phone: '+1 234 567 8906', department: 'Marketing', role: 'Marketer', position: 'Content Strategist', status: 'Active' },
  { num: 8, firstName: 'Ethan', lastName: 'Brown', email: 'ethan.brown@company.com', phone: '+1 234 567 8907', department: 'Product', role: 'PM', position: 'Product Manager', status: 'Active' },
  { num: 9, firstName: 'Olivia', lastName: 'Garcia', email: 'olivia.garcia@company.com', phone: '+1 234 567 8908', department: 'Engineering', role: 'DevOps', position: 'DevOps Engineer', status: 'Active' },
  { num: 10, firstName: 'Daniel', lastName: 'Nguyen', email: 'daniel.nguyen@company.com', phone: '+1 234 567 8909', department: 'Engineering', role: 'Developer', position: 'Backend Engineer', status: 'Inactive' },
  { num: 11, firstName: 'Hana', lastName: 'Ali', email: 'hana.ali@company.com', phone: '+1 234 567 8910', department: 'Design', role: 'Researcher', position: 'UX Researcher', status: 'Active' },
  { num: 12, firstName: 'Victor', lastName: 'Rossi', email: 'victor.rossi@company.com', phone: '+1 234 567 8911', department: 'Operations', role: 'Analyst', position: 'Operations Analyst', status: 'Active' },
]

function fullName(m: { firstName: string; lastName: string }) {
  return `${m.firstName} ${m.lastName}`.trim()
}

function demoAvatarUrl(num: number): string {
  const idx = Math.max(0, (num - 1) % AVATAR_FILES.length)
  return getAvatarUrl(AVATAR_FILES[idx])
}

function parseMemberNum(id: string): number | null {
  const raw = id.trim()
  if (!raw) return null
  const upper = raw.toUpperCase()
  if (upper.startsWith('LDA')) {
    const digits = upper.replace(/\D+/g, '')
    const n = Number.parseInt(digits, 10)
    return Number.isFinite(n) ? n : null
  }
  const n = Number.parseInt(raw, 10)
  return Number.isFinite(n) ? n : null
}

/** Admin (role) member id when assigned to projects/tasks. */
export const SUPER_ADMIN_MEMBER_ID = 'ADA0001'
/** Admin (Alex River) member id. */
export const PROJECT_LEAD_MEMBER_ID = 'ADA0002'

/** Profile path for a member (for mention links). LDA ids → /members/:num, ADA0001 → /admins/1, etc. */
export function getMemberProfilePath(memberId: string): string {
  const upper = memberId.toUpperCase()
  if (upper === SUPER_ADMIN_MEMBER_ID) return '/admins/1'
  if (upper === PROJECT_LEAD_MEMBER_ID) return '/admins/2'
  const num = parseMemberNum(memberId)
  return num != null ? `/members/${num}` : `/members/${memberId}`
}

/** Member id for the given user (Admin → ADA0001, ADA0002). Used for My Projects / My Tasks. */
export function getMemberIdForAdminId(adminId: string | null): string | null {
  if (!adminId) return null
  const id = adminId.trim()
  if (id === '1' || id.toUpperCase() === 'ADA0001') return SUPER_ADMIN_MEMBER_ID
  if (id === '2' || id.toUpperCase() === 'ADA0002') return PROJECT_LEAD_MEMBER_ID
  return null
}

/** List of all members for dropdowns (e.g. add to project). Replace with Firebase. */
export function getMembersList(): { memberId: string; name: string }[] {
  const list = DEMO_MEMBERS.map((m) => ({ memberId: formatMemberId(m.num), name: fullName(m) }))
  list.push({ memberId: SUPER_ADMIN_MEMBER_ID, name: 'Sam Admin' })
  list.push({ memberId: PROJECT_LEAD_MEMBER_ID, name: 'Alex River' })
  return list
}

/** List for Members table. System role is always Member; jobType = Developer/Designer etc. */
export function getMembersTableList(): {
  id: string
  memberId: string
  fullName: string
  firstName: string
  lastName: string
  profileImage: string | null
  email: string
  department: string
  role: string
  jobType: string
  status: 'Active' | 'Inactive'
  isProjectLead: boolean
}[] {
  const projectLeadIds = new Set(getMemberIdsWhoAreProjectLeads().map((id) => id.toUpperCase()))
  return DEMO_MEMBERS.map((m) => {
    const memberId = formatMemberId(m.num)
    return {
      id: String(m.num),
      memberId,
      fullName: fullName(m),
      firstName: m.firstName,
      lastName: m.lastName,
      profileImage: demoAvatarUrl(m.num),
      email: m.email,
      department: m.department,
      role: SYSTEM_ROLE.MEMBER,
      jobType: m.role,
      status: m.status,
      isProjectLead: projectLeadIds.has(memberId.toUpperCase()),
    }
  })
}

// Placeholder: replace with Firebase (getDoc from 'members' collection)
export function getMemberById(id: string): MemberDetail | null {
  const upper = id.trim().toUpperCase()
  if (upper === SUPER_ADMIN_MEMBER_ID) {
    return {
      memberId: SUPER_ADMIN_MEMBER_ID,
      accountStatus: 'Active',
      profileImage: null,
      firstName: 'Sam',
      lastName: 'Admin',
      email: 'sam.admin@company.com',
      phone: '',
      department: 'Admin',
      role: SYSTEM_ROLE.ADMIN,
      position: SYSTEM_ROLE.ADMIN,
      relatedProjects: getRelatedProjectsForMember(SUPER_ADMIN_MEMBER_ID),
      relatedTasks: getRelatedTasksForMember(SUPER_ADMIN_MEMBER_ID),
    }
  }
  if (upper === PROJECT_LEAD_MEMBER_ID) {
    return {
      memberId: PROJECT_LEAD_MEMBER_ID,
      accountStatus: 'Active',
      profileImage: null,
      firstName: 'Alex',
      lastName: 'River',
      email: 'alex.river@company.com',
      phone: '',
      department: 'Product',
      role: SYSTEM_ROLE.MEMBER,
      position: 'Project Manager',
      relatedProjects: getRelatedProjectsForMember(PROJECT_LEAD_MEMBER_ID),
      relatedTasks: getRelatedTasksForMember(PROJECT_LEAD_MEMBER_ID),
    }
  }
  const num = parseMemberNum(id) ?? 1
  const m = DEMO_MEMBERS.find((x) => x.num === num)
  if (!m) return null
  return {
    memberId: formatMemberId(num),
    accountStatus: m.status,
    profileImage: demoAvatarUrl(num),
    firstName: m.firstName,
    lastName: m.lastName,
    email: m.email,
    phone: m.phone,
    department: m.department,
    role: SYSTEM_ROLE.MEMBER,
    jobType: m.role,
    position: m.position,
    relatedProjects: getRelatedProjectsForMember(formatMemberId(num)),
    relatedTasks: getRelatedTasksForMember(formatMemberId(num)),
  }
}
