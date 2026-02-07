/** Notification for a member. Stored in members/{memberId}/notifications/{id} */
export interface Notification {
  id: string
  type: 'mention' | 'task_assigned' | 'project_added' | 'project_completed' | 'project_rejected' | 'project_pending_approval'
  title: string
  /** Link path (e.g. /notes, /projects/xxx) */
  link: string
  createdAt: string
  read: boolean
}
