/**
 * Admin account roles (admins collection):
 * - Super Admin (id 1): One only. Can add/remove admins, edit any admin, transfer own role to Admin.
 *   Cannot add another Super Admin.
 * - Admin (id 2+): Added by Super Admin. Cannot change/edit/remove Super Admin.
 *
 * Member role: For members collection (team members). "Project lead" is a project membership role, not a system role.
 */

export const ADMIN_ROLE = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
} as const

export const SYSTEM_ROLE = {
  ADMIN: 'Admin',
  MEMBER: 'Member',
} as const

export type AdminRole = (typeof ADMIN_ROLE)[keyof typeof ADMIN_ROLE]
export type SystemRole = (typeof SYSTEM_ROLE)[keyof typeof SYSTEM_ROLE]

/** Super Admin is admin id 1 only. Only one Super Admin exists. */
export const SUPER_ADMIN_ID = '1'

export function isSuperAdminId(adminId: string | null): boolean {
  return adminId === SUPER_ADMIN_ID
}
