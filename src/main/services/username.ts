export const usernamePattern = /^[a-z0-9]{3,32}$/

export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase()
}

export function isValidUsername(value: string): boolean {
  return usernamePattern.test(value)
}
