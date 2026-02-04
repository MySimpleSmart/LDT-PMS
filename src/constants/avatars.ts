/**
 * Avatar images in public/Avatars. Add more filenames as you add images.
 * Served at /Avatars/filename (Vite serves public folder at root).
 */
export const AVATAR_FILES = [
  'actress-729868.svg',
  'artist-729869.svg',
  'assistant-729862.svg',
  'athlete-729891.svg',
  'boy-729858.svg',
  'businesswoman-729883.svg',
  'captain-729866.svg',
  'cashier-729871.svg',
  'chef-729865.svg',
  'dancer-729873.svg',
  'daughter-729893.svg',
  'doctor-729859.svg',
  'employee-729863.svg',
  'girl-729857.svg',
  'girl-729860.svg',
  'grandmother-729888.svg',
  'journalist-729875.svg',
  'model-729877.svg',
  'mother-729887.svg',
  'musician-729876.svg',
  'school-boy-729896.svg',
  'school-girl-729884.svg',
  'teacher-729894.svg',
] as const

const AVATARS_BASE = '/Avatars'

export function getAvatarUrl(filename: string): string {
  return filename.startsWith('/') ? filename : `${AVATARS_BASE}/${filename}`
}

export function getAvatarOptions(): { value: string; label: string }[] {
  return AVATAR_FILES.map((f) => ({ value: getAvatarUrl(f), label: f }))
}

/** Default avatar image when none is selected (first from the list). */
export function getDefaultAvatarUrl(): string {
  return getAvatarUrl(AVATAR_FILES[0])
}

/** Default: generate a consistent color from name and return initials (e.g. "JD") */
export function getDefaultInitials(firstName: string, lastName: string): string {
  const a = (firstName?.trim()[0] || '?').toUpperCase()
  const b = (lastName?.trim()[0] || '?').toUpperCase()
  return a + b
}

/** Consistent background color for initials avatar from name */
export function getInitialsColor(firstName: string, lastName: string): string {
  const str = (firstName || '') + (lastName || '')
  let h = 0
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h)
  h = Math.abs(h) % 360
  return `hsl(${h}, 55%, 45%)`
}
