/** Admin ID format: ADA + 4-digit number (e.g. ADA0001) */
export function formatAdminId(num: number): string {
  return `ADA${String(num).padStart(4, '0')}`
}

export type AccountStatus = 'Active' | 'Inactive'
