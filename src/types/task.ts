/** A note/comment on a task */
export interface TaskNote {
  key: string
  author: string
  content: string
  createdAt: string
}

/** One assignee entry for a task */
export interface TaskAssignee {
  memberId: string
  name: string
}

/** Standalone task with related project, assignees, and notes */
export interface Task {
  id: string
  projectId: string
  projectName: string
  taskName: string
  status: string
  startDate?: string
  endDate?: string
  /** Multiple assignees; preferred over legacy single fields */
  assignees?: TaskAssignee[]
  /** @deprecated Use assignees */
  assigneeMemberId?: string
  /** @deprecated Use assignees */
  assigneeName?: string
  notes?: TaskNote[]
}
