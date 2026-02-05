import type { Task, TaskAssignee } from '../types/task'
import type { ProjectTask } from '../types/project'
import { getProjectsList } from './projects'
import { getProjectById } from './projects'

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
export function flattenTasksFromProjects(): Task[] {
  const projects = getProjectsList()
  const tasks: Task[] = []
  for (const proj of projects) {
    const detail = getProjectById(proj.id)
    if (!detail) continue
    for (const t of detail.tasks) {
      const assignees = getTaskAssignees(t)
      tasks.push({
        id: `${proj.id}-${t.key}`,
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

/** Related tasks for a member (profile Related Tasks section). */
export function getRelatedTasksForMember(memberId: string): { key: string; title: string; status: string; project: string }[] {
  const flat = flattenTasksFromProjects()
  return flat
    .filter((t) => getTaskAssignees(t).some((a) => a.memberId === memberId))
    .map((t, idx) => ({
      key: t.id || `task-${idx}`,
      title: t.taskName,
      status: t.status,
      project: t.projectName,
    }))
}
