import type { Task, TaskAssignee, TaskNote } from '../types/task'
import type { ProjectTask } from '../types/project'
import { getProjectsList, getProjectsCache, getProjectById, updateProjectById } from './projects'

/** Normalize project task to assignees array (supports legacy single assignee). */
export function getTaskAssignees(t: ProjectTask | Task): TaskAssignee[] {
  if (t.assignees && t.assignees.length > 0) {
    return t.assignees.map((a) => ({ memberId: a.memberId, name: a.name }))
  }
  if ((t as ProjectTask).assigneeMemberId) {
    const pt = t as ProjectTask
    return [{ memberId: pt.assigneeMemberId!, name: pt.assigneeName ?? '' }]
  }
  return []
}

/** Flatten all tasks from all projects into Task[] for the Tasks list. */
export async function flattenTasksFromProjects(): Promise<Task[]> {
  // Ensure projects cache is populated from Firestore
  await getProjectsList()
  const entries = getProjectsCache()

  const tasks: Task[] = []
  for (const { id: projectInternalId, detail } of entries) {
    for (const t of detail.tasks) {
      const assignees = getTaskAssignees(t)
      tasks.push({
        id: `${projectInternalId}-${t.key}`,
        projectId: detail.projectId,
        projectName: detail.projectName,
        taskName: t.title,
        status: t.status,
        startDate: t.startDate,
        endDate: t.endDate,
        assignees: assignees.length ? assignees : undefined,
        assigneeMemberId: t.assigneeMemberId,
        assigneeName: t.assigneeName,
        notes: t.notes?.map((n) => ({ key: n.key, author: n.author, content: n.content, createdAt: n.createdAt })) ?? [],
      })
    }
  }
  return tasks
}

/** Related tasks for a member (profile Related Tasks section). Uses the in-memory projects cache (loaded from Firestore). */
export function getRelatedTasksForMember(memberId: string): { key: string; title: string; status: string; project: string }[] {
  const entries = getProjectsCache()
  const related: { key: string; title: string; status: string; project: string }[] = []

  entries.forEach(({ id: projectInternalId, detail }) => {
    detail.tasks.forEach((t) => {
      const taskAssignees = getTaskAssignees(t)
      if (!taskAssignees.some((a) => a.memberId === memberId)) return
      related.push({
        key: `${projectInternalId}-${t.key}`,
        title: t.title,
        status: t.status,
        project: detail.projectName,
      })
    })
  })

  return related
}

/** Payload to create a new task on a project (before key is assigned). */
export type AddTaskToProjectPayload = {
  title: string
  status: string
  assignees?: { memberId: string; name: string }[]
  startDate?: string
  endDate?: string
  notes?: { key: string; author: string; content: string; createdAt: string }[]
}

/** Strip undefined values from an object (Firestore rejects undefined). */
function stripUndefined<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v
  }
  return out
}

/** Add a new task to a project in Firestore. Returns the created Task with id = projectDocId-taskKey. */
export async function persistAddTask(projectDocId: string, payload: AddTaskToProjectPayload): Promise<Task> {
  const project = await getProjectById(projectDocId)
  if (!project) throw new Error('Project not found')
  const taskKey = `task-${Date.now()}`
  const newProjectTask: Record<string, unknown> = {
    key: taskKey,
    title: payload.title.trim(),
    status: payload.status,
  }
  if (payload.assignees?.length) newProjectTask.assignees = payload.assignees
  if (payload.startDate != null && payload.startDate !== '') newProjectTask.startDate = payload.startDate
  if (payload.endDate != null && payload.endDate !== '') newProjectTask.endDate = payload.endDate
  if (payload.notes != null && payload.notes.length > 0) newProjectTask.notes = payload.notes
  const sanitizedTasks = [...project.tasks.map((t) => stripUndefined(t as Record<string, unknown>)), newProjectTask]
  await updateProjectById(projectDocId, { tasks: sanitizedTasks })
  return {
    id: `${projectDocId}-${taskKey}`,
    projectId: project.projectId,
    projectName: project.projectName,
    taskName: newProjectTask.title,
    status: newProjectTask.status,
    startDate: newProjectTask.startDate,
    endDate: newProjectTask.endDate,
    assignees: newProjectTask.assignees,
    notes: newProjectTask.notes ?? [],
  }
}

/** Updates to apply to an existing task (from edit form). Notes are updated only via addTaskNote. */
export type UpdateTaskPayload = {
  taskName?: string
  status?: string
  startDate?: string
  endDate?: string
  assignees?: { memberId: string; name: string }[]
}

/** Persist task field updates to the project document in Firestore. taskId must be "projectDocId-taskKey". */
export async function persistUpdateTask(taskId: string, updates: UpdateTaskPayload): Promise<void> {
  const parts = taskId.split('-')
  if (parts.length < 2) throw new Error('Invalid task id')
  const taskKey = parts.slice(1).join('-')
  const projectDocId = parts[0]
  const project = await getProjectById(projectDocId)
  if (!project) throw new Error('Project not found')
  const updatedTasks = project.tasks.map((t) => {
    if (t.key !== taskKey) return stripUndefined(t as Record<string, unknown>)
    const merged: Record<string, unknown> = {
      ...t,
      title: updates.taskName !== undefined ? updates.taskName : t.title,
      status: updates.status !== undefined ? updates.status : t.status,
      startDate: updates.startDate !== undefined ? updates.startDate : t.startDate,
      endDate: updates.endDate !== undefined ? updates.endDate : t.endDate,
      assignees: updates.assignees !== undefined ? updates.assignees : t.assignees,
    }
    return stripUndefined(merged)
  })
  await updateProjectById(projectDocId, { tasks: updatedTasks })
}

/** Remove a task from the project document in Firestore. taskId must be "projectDocId-taskKey". */
export async function persistRemoveTask(taskId: string): Promise<void> {
  const parts = taskId.split('-')
  if (parts.length < 2) throw new Error('Invalid task id')
  const taskKey = parts.slice(1).join('-')
  const projectDocId = parts[0]
  const project = await getProjectById(projectDocId)
  if (!project) throw new Error('Project not found')
  const filteredTasks = project.tasks.filter((t) => t.key !== taskKey).map((t) => stripUndefined(t as Record<string, unknown>))
  await updateProjectById(projectDocId, { tasks: filteredTasks })
}

/** Persist a task note to the project document in Firestore. taskId must be "projectDocId-taskKey". */
export async function persistTaskNote(taskId: string, note: TaskNote): Promise<void> {
  const parts = taskId.split('-')
  if (parts.length < 2) throw new Error('Invalid task id')
  const taskKey = parts.slice(1).join('-')
  const projectDocId = parts[0]
  const project = await getProjectById(projectDocId)
  if (!project) throw new Error('Project not found')
  const updatedTasks = project.tasks.map((t) => {
    const updated = t.key === taskKey ? { ...t, notes: [...(t.notes ?? []), note] } : t
    return stripUndefined(updated as Record<string, unknown>)
  })
  await updateProjectById(projectDocId, { tasks: updatedTasks })
}
