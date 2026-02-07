/** Standalone note (Notes page). Content may include @[Name](memberId) for mentions. */
export interface Note {
  id: string
  content: string
  author: string
  /** Member ID of the author (e.g. LDA0001). */
  authorId?: string
  createdAt: string
  updatedAt?: string
  /** Pinned note shown first. Only one note can be pinned at a time. */
  pinned?: boolean
}
