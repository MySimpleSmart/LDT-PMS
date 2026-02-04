/** A note/comment on a task */
export interface TaskNote {
  key: string
  author: string
  content: string
  createdAt: string
}

/** Standalone task with related project, assignee, and notes */
export interface Task {
  id: string
  projectId: string
  projectName: string
  taskName: string
  status: string
  startDate?: string
  endDate?: string
  assigneeMemberId?: string
  assigneeName?: string
  notes?: TaskNote[]
}
