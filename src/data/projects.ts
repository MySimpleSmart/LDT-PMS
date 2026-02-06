import type { ProjectMember, ProjectNote, ProjectFile, ProjectTask } from '../types/project'
import { getDb } from '../lib/firebase'
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  type DocumentData,
} from 'firebase/firestore'

/** Progress is computed from tasks or from completedTasksCount/tasksCount when stored. */
export interface ProjectDetail {
  projectId: string
  projectName: string
  projectCategory: string
  projectTag: string
  priority: 'Low' | 'Medium' | 'High' | 'Urgent'
  startDate: string
  endDate: string
  status: 'Not Started' | 'In Progress' | 'On Hold' | 'Pending completion' | 'Completed'
  progress: number
  tasksCount: number
  completedTasksCount: number
  isArchived: boolean
  tasks: ProjectTask[]
  members: ProjectMember[]
  notes: ProjectNote[]
  files: ProjectFile[]
  /** Creator: full name of the super admin, admin, or project lead who created the project. */
  createdBy: string
  createdAt: string
}

const DONE_STATUSES = ['Completed'] as const

function computeProgress(tasks: ProjectTask[]): number {
  if (!tasks.length) return 0
  const done = tasks.filter((t) => DONE_STATUSES.includes(t.status as (typeof DONE_STATUSES)[number])).length
  return Math.round((done / tasks.length) * 100)
}

/** Firestore document shape for a project. */
interface ProjectDoc {
  num?: number
  projectId?: string
  projectName: string
  projectCategory: string
  projectTag: string
  priority: 'Low' | 'Medium' | 'High' | 'Urgent'
  startDate: string
  endDate: string
  status: 'Not Started' | 'In Progress' | 'On Hold' | 'Pending completion' | 'Completed'
  tasksCount?: number
  completedTasksCount?: number
  isArchived?: boolean
  tasks?: ProjectTask[]
  members?: ProjectMember[]
  notes?: ProjectNote[]
  files?: ProjectFile[]
  /** Creator: full name of the super admin, admin, or project lead who created the project. */
  createdBy: string
  createdAt: string
}

const PROJECTS_COLLECTION = 'projects'

type ProjectCacheEntry = {
  id: string
  detail: ProjectDetail
}

let projectsCache: ProjectCacheEntry[] | null = null
let cachePromise: Promise<void> | null = null

function mapDocToProjectDetail(data: ProjectDoc, fallbackIndex?: number): ProjectDetail {
  const tasks = data.tasks ?? []
  const tasksCount = data.tasksCount ?? tasks.length
  const completedTasksCount = data.completedTasksCount ?? tasks.filter((t) => DONE_STATUSES.includes(t.status as (typeof DONE_STATUSES)[number])).length
  const progress = tasksCount > 0 ? Math.round((completedTasksCount / tasksCount) * 100) : computeProgress(tasks)
  const projectId = data.projectId ?? (data.num != null ? `LDP${String(data.num).padStart(4, '0')}` : (fallbackIndex != null ? `LDP${String(fallbackIndex).padStart(4, '0')}` : ''))
  return {
    projectId,
    projectName: data.projectName,
    projectCategory: data.projectCategory,
    projectTag: data.projectTag,
    priority: data.priority,
    startDate: data.startDate,
    endDate: data.endDate,
    status: data.status,
    progress,
    tasksCount,
    completedTasksCount,
    isArchived: data.isArchived ?? false,
    tasks,
    members: data.members ?? [],
    notes: data.notes ?? [],
    files: data.files ?? [],
    createdBy: data.createdBy,
    createdAt: data.createdAt,
  }
}

async function loadProjectsCache(force = false): Promise<void> {
  if (!force && projectsCache) return
  if (!force && cachePromise) {
    await cachePromise
    return
  }

  const db = getDb()
  const colRef = collection(db, PROJECTS_COLLECTION)

  cachePromise = (async () => {
    const snap = await getDocs(colRef)
    const entries: ProjectCacheEntry[] = []
    const docs = snap.docs
    docs.forEach((docSnap, i) => {
      const data = docSnap.data() as DocumentData
      const detail = mapDocToProjectDetail(data as ProjectDoc, i + 1)
      entries.push({ id: docSnap.id, detail })
    })
    projectsCache = entries
    cachePromise = null
  })()

  await cachePromise
}

export function getProjectsCache(): ProjectCacheEntry[] {
  return projectsCache ?? []
}

export async function getProjectById(id: string): Promise<ProjectDetail | null> {
  await loadProjectsCache()
  const fromCache = getProjectsCache().find((entry) => entry.id === id || entry.detail.projectId === id)
  if (fromCache) return fromCache.detail

  // Fallback: direct Firestore lookup by document id
  const db = getDb()
  const ref = doc(db, PROJECTS_COLLECTION, id)
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  const detail = mapDocToProjectDetail(snap.data() as ProjectDoc)
  return detail
}

export type ProjectListRow = {
  id: string
  projectId: string
  projectName: string
  category: string
  priority: string
  status: string
  progress: number
  tasksCount: number
  completedTasksCount: number
  isArchived: boolean
  startDate: string
  endDate: string
}

/** True when project has an end date in the past and is not Completed (display-only; not stored). */
export function isProjectOverdue(project: { endDate: string; status: string }): boolean {
  if (!project.endDate || project.status === 'Completed') return false
  const today = new Date().toISOString().slice(0, 10)
  return project.endDate < today
}

/** List for Projects table; progress is computed from tasks. */
export async function getProjectsList(): Promise<ProjectListRow[]> {
  await loadProjectsCache()
  const entries = getProjectsCache()
  return entries.map(({ id, detail }) => ({
    id,
    projectId: detail.projectId,
    projectName: detail.projectName,
    category: detail.projectCategory,
    priority: detail.priority,
    status: detail.status,
    progress: detail.progress,
    tasksCount: detail.tasksCount,
    completedTasksCount: detail.completedTasksCount,
    isArchived: detail.isArchived,
    startDate: detail.startDate,
    endDate: detail.endDate,
  }))
}

/** Related projects for a member (profile Related Projects section). */
export function getRelatedProjectsForMember(memberId: string): { key: string; name: string; role: string }[] {
  const list: { key: string; name: string; role: string }[] = []
  const entries = getProjectsCache()
  for (const { detail } of entries) {
    const membership = detail.members.find((m) => m.memberId === memberId)
    if (membership) {
      list.push({ key: detail.projectId, name: detail.projectName, role: membership.role })
    }
  }
  return list
}

/** Member IDs that are project lead on at least one project. Used to list them on Admins page (role shown as Member). */
export function getMemberIdsWhoAreProjectLeads(): string[] {
  const leadIds = new Set<string>()
  const entries = getProjectsCache()
  for (const { detail } of entries) {
    for (const m of detail.members) {
      if (m.role === 'Lead') leadIds.add(m.memberId)
    }
  }
  return Array.from(leadIds)
}

/** Get next project ID (LDP0001, LDP0002, ...) from existing docs. */
async function getNextProjectId(): Promise<string> {
  const db = getDb()
  const snap = await getDocs(collection(db, PROJECTS_COLLECTION))
  let maxNum = 0
  snap.forEach((d) => {
    const m = d.id.match(/^LDP(\d+)$/i)
    if (m) {
      const n = parseInt(m[1], 10)
      if (n > maxNum) maxNum = n
    }
  })
  return `LDP${String(maxNum + 1).padStart(4, '0')}`
}

export type CreateProjectInput = {
  projectName: string
  projectCategory: string
  projectTag: string
  priority: 'Low' | 'Medium' | 'High' | 'Urgent'
  startDate: string
  endDate: string
  status: string
  members: ProjectMember[]
  files?: ProjectFile[]
  createdBy: string
}

/** Create a new project in Firestore. Returns the new project document id (e.g. LDP0001). */
export async function createProject(input: CreateProjectInput): Promise<string> {
  const db = getDb()
  const projectId = await getNextProjectId()
  const now = new Date().toISOString().slice(0, 10)
  const data: ProjectDoc = {
    projectName: input.projectName,
    projectCategory: input.projectCategory,
    projectTag: input.projectTag,
    priority: input.priority,
    startDate: input.startDate,
    endDate: input.endDate,
    status: input.status as ProjectDoc['status'],
    tasksCount: 0,
    completedTasksCount: 0,
    isArchived: false,
    tasks: [],
    members: input.members,
    notes: [],
    files: input.files ?? [],
    createdBy: input.createdBy,
    createdAt: now,
  }
  const ref = doc(db, PROJECTS_COLLECTION, projectId)
  await setDoc(ref, data as DocumentData)
  await loadProjectsCache(true)
  return projectId
}

/** Update an existing project in Firestore and refresh the cache. */
export async function updateProjectById(id: string, updates: Partial<ProjectDetail>): Promise<void> {
  const db = getDb()
  const ref = doc(db, PROJECTS_COLLECTION, id)

  const updateData: Partial<ProjectDoc> = {}

  if (typeof updates.projectId !== 'undefined') updateData.projectId = updates.projectId
  if (typeof updates.projectName !== 'undefined') updateData.projectName = updates.projectName
  if (typeof updates.projectCategory !== 'undefined') updateData.projectCategory = updates.projectCategory
  if (typeof updates.projectTag !== 'undefined') updateData.projectTag = updates.projectTag
  if (typeof updates.priority !== 'undefined') updateData.priority = updates.priority
  if (typeof updates.startDate !== 'undefined') updateData.startDate = updates.startDate
  if (typeof updates.endDate !== 'undefined') updateData.endDate = updates.endDate
  if (typeof updates.status !== 'undefined') updateData.status = updates.status
  if (typeof updates.tasksCount !== 'undefined') updateData.tasksCount = updates.tasksCount
  if (typeof updates.completedTasksCount !== 'undefined') updateData.completedTasksCount = updates.completedTasksCount
  if (typeof updates.isArchived !== 'undefined') updateData.isArchived = updates.isArchived
  if (typeof updates.tasks !== 'undefined') {
    updateData.tasks = updates.tasks
    updateData.tasksCount = updates.tasks.length
    updateData.completedTasksCount = updates.tasks.filter((t) => DONE_STATUSES.includes(t.status as (typeof DONE_STATUSES)[number])).length
  }
  if (typeof updates.members !== 'undefined') updateData.members = updates.members
  if (typeof updates.notes !== 'undefined') updateData.notes = updates.notes
  if (typeof updates.files !== 'undefined') updateData.files = updates.files
  if (typeof updates.createdBy !== 'undefined') updateData.createdBy = updates.createdBy
  if (typeof updates.createdAt !== 'undefined') updateData.createdAt = updates.createdAt

  await updateDoc(ref, updateData as DocumentData)
  await loadProjectsCache(true)
}

/** Delete a project from Firestore. Only call for Super Admin. */
export async function deleteProject(id: string): Promise<void> {
  const db = getDb()
  const ref = doc(db, PROJECTS_COLLECTION, id.trim())
  await deleteDoc(ref)
  await loadProjectsCache(true)
}
