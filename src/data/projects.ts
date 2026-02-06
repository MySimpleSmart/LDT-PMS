import type { ProjectMember, ProjectNote, ProjectFile, ProjectTask } from '../types/project'
import { getDb } from '../lib/firebase'
import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  type DocumentData,
} from 'firebase/firestore'

/** Progress is computed from tasks (done/total), not stored. */
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
  tasks: ProjectTask[]
  members: ProjectMember[]
  notes: ProjectNote[]
  files: ProjectFile[]
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
  projectId: string
  projectName: string
  projectCategory: string
  projectTag: string
  priority: 'Low' | 'Medium' | 'High' | 'Urgent'
  startDate: string
  endDate: string
  status: 'Not Started' | 'In Progress' | 'On Hold' | 'Pending completion' | 'Completed'
  tasks?: ProjectTask[]
  members?: ProjectMember[]
  notes?: ProjectNote[]
  files?: ProjectFile[]
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

function mapDocToProjectDetail(data: ProjectDoc): ProjectDetail {
  const tasks = data.tasks ?? []
  const progress = computeProgress(tasks)
  return {
    projectId: data.projectId,
    projectName: data.projectName,
    projectCategory: data.projectCategory,
    projectTag: data.projectTag,
    priority: data.priority,
    startDate: data.startDate,
    endDate: data.endDate,
    status: data.status,
    progress,
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
    snap.forEach((docSnap) => {
      const data = docSnap.data() as DocumentData
      const detail = mapDocToProjectDetail(data as ProjectDoc)
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
  startDate: string
  endDate: string
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
  if (typeof updates.tasks !== 'undefined') updateData.tasks = updates.tasks
  if (typeof updates.members !== 'undefined') updateData.members = updates.members
  if (typeof updates.notes !== 'undefined') updateData.notes = updates.notes
  if (typeof updates.files !== 'undefined') updateData.files = updates.files
  if (typeof updates.createdBy !== 'undefined') updateData.createdBy = updates.createdBy
  if (typeof updates.createdAt !== 'undefined') updateData.createdAt = updates.createdAt

  await updateDoc(ref, updateData as DocumentData)
  await loadProjectsCache(true)
}
