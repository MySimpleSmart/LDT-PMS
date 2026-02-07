/**
 * Australian phone number validation and formatting.
 * Accepts: 0423241233, 423241233, 02 1234 5678, +61 423 241 233
 */

/** Strip to digits only, optionally removing leading 61 (country code) */
export function normalizeAustralianPhone(value: string | undefined): string {
  if (!value || typeof value !== 'string') return ''
  const digits = value.replace(/\D/g, '')
  if (digits.startsWith('61') && digits.length === 11) return digits.slice(2)
  if (digits.startsWith('61') && digits.length === 12) return digits.slice(2)
  return digits
}

/** Validate Australian phone format. Empty/undefined is valid (optional field). */
export function isValidAustralianPhone(value: string | undefined): boolean {
  const digits = normalizeAustralianPhone(value)
  if (!digits) return true
  // Mobile: 04 + 8 digits (10 total) or 4 + 8 digits (9 total)
  // Landline: 02, 03, 07, 08 + 8 digits (10 total)
  return /^(04[0-9]{8}|4[0-9]{8}|0[2-8][0-9]{8})$/.test(digits)
}

/** Format for display: 0423 241 233 or 02 1234 5678 */
export function formatAustralianPhone(value: string | undefined): string {
  const digits = normalizeAustralianPhone(value)
  if (!digits) return ''
  if (digits.length === 9 && digits.startsWith('4')) {
    return `0${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`
  }
  if (digits.length === 10) {
    if (digits.startsWith('04')) {
      return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`
    }
    return `${digits.slice(0, 2)} ${digits.slice(2, 6)} ${digits.slice(6)}`
  }
  return digits
}

export const AU_PHONE_PLACEHOLDER = '0423241233 or 423241233'
export const AU_PHONE_VALIDATION_MESSAGE = 'Enter a valid Australian phone (e.g. 0423241233 or 423241233)'
