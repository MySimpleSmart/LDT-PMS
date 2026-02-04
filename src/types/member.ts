/** Member ID format: LDA + 4-digit number (e.g. LDA0001) */
export function formatMemberId(num: number): string {
  return `LDA${String(num).padStart(4, '0')}`
}

export type AccountStatus = 'Active' | 'Inactive'

export interface Member {
  id: string
  memberId: string
  accountStatus: AccountStatus
  profileImage: string | null
  fullName: string
  email: string
  phone: string
  department: string
  role: string
  position: string
  relatedProjectIds?: string[]
  relatedTaskIds?: string[]
}

export interface RelatedProject {
  key: string
  name: string
  role: string
}

export interface RelatedTask {
  key: string
  title: string
  status: string
  project: string
}
