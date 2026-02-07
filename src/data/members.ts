import { getDb } from '../lib/firebase'
import { collection, getDocs, doc, getDoc, setDoc, updateDoc, deleteDoc, query, where } from 'firebase/firestore'
import { getRelatedProjectsForMember, getMemberIdsWhoAreProjectLeads } from './projects'
import { getRelatedTasksForMember } from './tasks'
import type { ProjectActivity } from '../types/project'

export interface MemberDetail {
  memberId: string
  accountStatus: 'Active' | 'Inactive'
  profileImage: string | null
  firstName: string
  lastName: string
  email: string
  phone: string
  department: string
  /** Display role: Admin, Member, Super Admin, etc. */
  role: string
  /** Raw Firestore role for checks (e.g. super_admin). */
  roleSystem?: string
  jobType?: string
  position: string
  relatedProjects: { key: string; name: string; role: string }[]
  relatedTasks: { key: string; title: string; status: string; project: string }[]
  /** Recent actions and events for this profile (stored on the member document). */
  activityLog: ProjectActivity[]
}

const MEMBERS_COLLECTION = 'members'

/** Firestore document shape for a member (matches console: member ID, role, status, etc.). */
interface MemberDoc {
  'member ID'?: string
  avatarUrl?: string
  createdAt?: string
  updatedAt?: string
  department?: string
  email?: string
  firstName?: string
  lastName?: string
  jobType?: string
  phone?: string
  position?: string
  role?: string
  status?: string
  activityLog?: ProjectActivity[]
}

function memberIdFromDoc(docId: string, data: MemberDoc): string {
  return (data['member ID'] ?? docId).trim() || docId
}

/** Resolve role from Firestore doc (handles role, Role, and raw values). */
function getRoleFromDoc(data: MemberDoc): { display: string; raw: string } {
  const raw = (data.role ?? (data as Record<string, unknown>)['Role'] ?? 'member') as string
  const lower = String(raw).trim().toLowerCase()
  if (lower === 'super_admin') return { display: 'Super Admin', raw: 'super_admin' }
  if (lower === 'admin') return { display: 'Admin', raw: 'admin' }
  if (lower === 'member' || !lower) return { display: 'Member', raw: 'member' }
  return { display: raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase(), raw }
}

/** Resolve account status from Firestore doc (handles status, Status, accountStatus). */
function getAccountStatusFromDoc(data: MemberDoc): 'Active' | 'Inactive' {
  const raw = (data.status ?? (data as Record<string, unknown>)['Status'] ?? (data as Record<string, unknown>)['accountStatus'] ?? 'active') as string
  const lower = String(raw).trim().toLowerCase()
  return lower === 'active' ? 'Active' : 'Inactive'
}

function mapDocToMemberDetail(docId: string, data: MemberDoc): MemberDetail {
  const memberId = memberIdFromDoc(docId, data)
  const { display: role, raw: roleSystem } = getRoleFromDoc(data)
  return {
    memberId,
    accountStatus: getAccountStatusFromDoc(data),
    profileImage: data.avatarUrl?.trim() || null,
    firstName: data.firstName ?? '',
    lastName: data.lastName ?? '',
    email: data.email ?? '',
    phone: data.phone ?? '',
    department: data.department ?? '',
    role,
    roleSystem,
    jobType: data.jobType,
    position: data.position ?? '',
    relatedProjects: getRelatedProjectsForMember(memberId),
    relatedTasks: getRelatedTasksForMember(memberId),
    activityLog: Array.isArray(data.activityLog) ? data.activityLog : [],
  }
}

/** Get member profile by Firestore document id (e.g. LDA0001). */
export async function getMemberById(id: string): Promise<MemberDetail | null> {
  if (!id?.trim()) return null
  const db = getDb()
  const ref = doc(db, MEMBERS_COLLECTION, id.trim())
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  return mapDocToMemberDetail(snap.id, snap.data() as MemberDoc)
}

/** Get member by email (for current user lookup). */
export async function getMemberByEmail(email: string): Promise<{ id: string; detail: MemberDetail } | null> {
  if (!email?.trim()) return null
  const db = getDb()
  const colRef = collection(db, MEMBERS_COLLECTION)
  const q = query(colRef, where('email', '==', email.trim()))
  const snap = await getDocs(q)
  if (snap.empty) return null
  const first = snap.docs[0]
  const detail = mapDocToMemberDetail(first.id, first.data() as MemberDoc)
  return { id: first.id, detail }
}

/** List { memberId, name } for dropdowns. */
export async function getMembersList(): Promise<{ memberId: string; name: string }[]> {
  const db = getDb()
  const snap = await getDocs(collection(db, MEMBERS_COLLECTION))
  const list: { memberId: string; name: string }[] = []
  snap.forEach((d) => {
    const data = d.data() as MemberDoc
    const memberId = memberIdFromDoc(d.id, data)
    const name = [data.firstName, data.lastName].filter(Boolean).join(' ').trim() || memberId
    list.push({ memberId, name })
  })
  return list
}

/** Table row shape for Members page. */
export type MembersTableRow = {
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
}

/** List members who are Super Admin or Admin (for Admins page). */
export async function getMembersWithAdminRole(): Promise<MembersTableRow[]> {
  const db = getDb()
  const snap = await getDocs(collection(db, MEMBERS_COLLECTION))
  const projectLeadIds = new Set(getMemberIdsWhoAreProjectLeads().map((id) => id.toUpperCase()))
  const rows: MembersTableRow[] = []
  snap.forEach((d) => {
    const data = d.data() as MemberDoc
    const { display: role, raw: roleRaw } = getRoleFromDoc(data)
    if (roleRaw !== 'super_admin' && roleRaw !== 'admin') return
    const memberId = memberIdFromDoc(d.id, data)
    const firstName = data.firstName ?? ''
    const lastName = data.lastName ?? ''
    const fullName = [firstName, lastName].filter(Boolean).join(' ').trim() || memberId
    const status = getAccountStatusFromDoc(data)
    rows.push({
      id: d.id,
      memberId,
      fullName,
      firstName,
      lastName,
      profileImage: data.avatarUrl?.trim() || null,
      email: data.email ?? '',
      department: data.department ?? '',
      role,
      jobType: data.jobType ?? '',
      status,
      isProjectLead: projectLeadIds.has(memberId.toUpperCase()),
    })
  })
  return rows
}

/** Get member IDs of users with Super Admin or Admin role (for notifications). */
export async function getAdminMemberIds(): Promise<string[]> {
  const rows = await getMembersWithAdminRole()
  return rows.map((r) => r.memberId).filter(Boolean)
}

/** List for Members table. */
export async function getMembersTableList(): Promise<MembersTableRow[]> {
  const db = getDb()
  const snap = await getDocs(collection(db, MEMBERS_COLLECTION))
  const projectLeadIds = new Set(getMemberIdsWhoAreProjectLeads().map((id) => id.toUpperCase()))
  const rows: MembersTableRow[] = []
  snap.forEach((d) => {
    const data = d.data() as MemberDoc
    const memberId = memberIdFromDoc(d.id, data)
    const firstName = data.firstName ?? ''
    const lastName = data.lastName ?? ''
    const fullName = [firstName, lastName].filter(Boolean).join(' ').trim() || memberId
    const status = getAccountStatusFromDoc(data)
    const { display: role } = getRoleFromDoc(data)
    rows.push({
      id: d.id,
      memberId,
      fullName,
      firstName,
      lastName,
      profileImage: data.avatarUrl?.trim() || null,
      email: data.email ?? '',
      department: data.department ?? '',
      role,
      jobType: data.jobType ?? '',
      status,
      isProjectLead: projectLeadIds.has(memberId.toUpperCase()),
    })
  })
  return rows
}

/** Generate next member ID (LDA0001, LDA0002, ...) from existing docs. */
async function getNextMemberId(): Promise<string> {
  const db = getDb()
  const snap = await getDocs(collection(db, MEMBERS_COLLECTION))
  let maxNum = 0
  snap.forEach((d) => {
    const m = d.id.match(/^LDA(\d+)$/i)
    if (m) {
      const n = parseInt(m[1], 10)
      if (n > maxNum) maxNum = n
    }
  })
  return `LDA${String(maxNum + 1).padStart(4, '0')}`
}

export type CreateMemberInput = {
  firstName: string
  lastName: string
  email: string
  phone?: string
  department: string
  jobType?: string
  position?: string
  accountStatus?: 'Active' | 'Inactive'
  avatarUrl?: string | null
  role?: string
}

/** Create a new member in Firestore. Returns the new member document id. */
export async function createMember(input: CreateMemberInput): Promise<string> {
  const db = getDb()
  const memberId = await getNextMemberId()
  const now = new Date().toISOString()
  const status = (input.accountStatus ?? 'Active').toLowerCase() === 'active' ? 'active' : 'inactive'
  const role = input.role ?? 'member'
  const data: MemberDoc = {
    'member ID': memberId,
    firstName: input.firstName?.trim() ?? '',
    lastName: input.lastName?.trim() ?? '',
    email: input.email?.trim() ?? '',
    phone: input.phone?.trim() ?? '',
    department: input.department?.trim() ?? '',
    jobType: input.jobType?.trim() ?? '',
    position: input.position?.trim() ?? '',
    status,
    role,
    avatarUrl: input.avatarUrl?.trim() || '',
    createdAt: now,
    updatedAt: now,
  }
  const ref = doc(db, MEMBERS_COLLECTION, memberId)
  await setDoc(ref, data)
  return memberId
}

export type UpdateMemberInput = Partial<{
  firstName: string
  lastName: string
  email: string
  phone: string
  department: string
  jobType: string
  position: string
  accountStatus: 'Active' | 'Inactive'
  avatarUrl: string | null
  role: string
  activityLog: ProjectActivity[]
}>

/** Update an existing member in Firestore. */
export async function updateMember(memberId: string, input: UpdateMemberInput): Promise<void> {
  const db = getDb()
  const ref = doc(db, MEMBERS_COLLECTION, memberId.trim())
  const data: Partial<MemberDoc> = {
    updatedAt: new Date().toISOString(),
  }
  if (input.firstName !== undefined) data.firstName = input.firstName
  if (input.lastName !== undefined) data.lastName = input.lastName
  if (input.email !== undefined) data.email = input.email
  if (input.phone !== undefined) data.phone = input.phone
  if (input.department !== undefined) data.department = input.department
  if (input.jobType !== undefined) data.jobType = input.jobType
  if (input.position !== undefined) data.position = input.position
  if (input.accountStatus !== undefined) {
    const statusVal = String(input.accountStatus).trim().toLowerCase() === 'active' ? 'active' : 'inactive'
    data.status = statusVal
  }
  if (input.avatarUrl !== undefined) data.avatarUrl = input.avatarUrl?.trim() ?? ''
  if (input.role !== undefined) data.role = input.role
  if (input.activityLog !== undefined) {
    const maxActivityLogEntries = 200
    data.activityLog = input.activityLog.length > maxActivityLogEntries
      ? input.activityLog.slice(-maxActivityLogEntries)
      : input.activityLog
  }
  await updateDoc(ref, data as Record<string, unknown>)
}

/** Delete a member from Firestore. Does not remove them from projects. */
export async function deleteMember(memberId: string): Promise<void> {
  if (!memberId?.trim()) return
  const db = getDb()
  const ref = doc(db, MEMBERS_COLLECTION, memberId.trim())
  await deleteDoc(ref)
}

/** Append one activity entry to a member profile's activity log (capped to last 200). */
export async function appendMemberActivity(memberId: string, activity: ProjectActivity): Promise<void> {
  if (!memberId?.trim()) return
  const db = getDb()
  const ref = doc(db, MEMBERS_COLLECTION, memberId.trim())
  const snap = await getDoc(ref)
  if (!snap.exists()) return
  const data = snap.data() as MemberDoc
  const existing = Array.isArray(data.activityLog) ? data.activityLog : []
  const next = [...existing, activity]
  await updateMember(memberId.trim(), { activityLog: next })
}

/** Profile path for a member (for mention links and nav). */
export function getMemberProfilePath(memberId: string): string {
  const upper = memberId.toUpperCase()
  if (upper.startsWith('ADA')) return `/admins/${upper === 'ADA0001' ? '1' : '2'}`
  return `/members/${memberId}`
}

/** Legacy: admin-style member ids used by admins.ts until admins collection exists. */
export const SUPER_ADMIN_MEMBER_ID = 'ADA0001'
export const PROJECT_LEAD_MEMBER_ID = 'ADA0002'

/** Legacy: map admin id to member id for project/task assignment. */
export function getMemberIdForAdminId(adminId: string | null): string | null {
  if (!adminId) return null
  const id = adminId.trim()
  if (id === '1' || id.toUpperCase() === 'ADA0001') return SUPER_ADMIN_MEMBER_ID
  if (id === '2' || id.toUpperCase() === 'ADA0002') return PROJECT_LEAD_MEMBER_ID
  return null
}
