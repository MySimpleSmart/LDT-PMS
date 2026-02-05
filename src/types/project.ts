/** Project ID format: PRJ + 4-digit number (e.g. PRJ0001) */
export function formatProjectId(num: number): string {
  return `PRJ${String(num).padStart(4, '0')}`
}

export type ProjectCategory = 'Development' | 'Design' | 'Marketing' | 'Operations' | 'Research' | string
export type ProjectTag = string
export type Priority = 'Low' | 'Medium' | 'High' | 'Urgent'
export type ProjectStatus = 'Not Started' | 'In Progress' | 'On Hold' | 'Pending completion' | 'Completed'

export interface ProjectMember {
  key: string
  memberId: string
  name: string
  role: string
}

export interface ProjectNote {
  key: string
  author: string
  content: string
  createdAt: string
}

export interface ProjectFile {
  key: string
  name: string
  size?: string
  uploadedAt: string
}

/** One assignee for a project task */
export interface ProjectTaskAssignee {
  memberId: string
  name: string
}

/** Task status; 'Completed' counts toward progress */
export interface ProjectTask {
  key: string
  title: string
  status: string
  /** Multiple assignees (project members) */
  assignees?: ProjectTaskAssignee[]
  /** @deprecated Use assignees */
  assigneeMemberId?: string
  /** @deprecated Use assignees */
  assigneeName?: string
  startDate?: string
  endDate?: string
}
