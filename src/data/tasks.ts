import type { Task, TaskAssignee } from '../types/task'
import type { ProjectTask } from '../types/project'
import { getProjectsList, getProjectsCache } from './projects'

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
