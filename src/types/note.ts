/** Standalone note (Notes page). Content may include @[Name](memberId) for mentions. */
export interface Note {
  id: string
  content: string
  author: string
  createdAt: string
  updatedAt?: string
}
