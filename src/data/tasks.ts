import type { Task } from '../types/task'
import { getProjectsList } from './projects'
import { getProjectById } from './projects'

/** Flatten all tasks from all projects into Task[] for the Tasks list. */
export function flattenTasksFromProjects(): Task[] {
  const projects = getProjectsList()
  const tasks: Task[] = []
  for (const proj of projects) {
    const detail = getProjectById(proj.id)
    if (!detail) continue
    for (const t of detail.tasks) {
      tasks.push({
        id: `${proj.id}-${t.key}`,
        projectId: detail.projectId,
        projectName: detail.projectName,
        taskName: t.title,
        status: t.status,
        startDate: t.startDate,
        endDate: t.endDate,
        assigneeMemberId: t.assigneeMemberId,
        assigneeName: t.assigneeName,
      })
    }
  }
  return tasks
}

/** Related tasks for a member (profile Related Tasks section). */
export function getRelatedTasksForMember(memberId: string): { key: string; title: string; status: string; project: string }[] {
  const flat = flattenTasksFromProjects()
  return flat
    .filter((t) => t.assigneeMemberId === memberId)
    .map((t, idx) => ({
      key: t.id || `task-${idx}`,
      title: t.taskName,
      status: t.status,
      project: t.projectName,
    }))
}
