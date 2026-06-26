import crypto from 'crypto'

/**
 * Hash a password with SHA-256 + salt
 */
export function hashPassword(password: string): string {
  const salt = process.env.APP_PASSWORD_SALT || 'stok-takip-salt-2024'
  return crypto.createHash('sha256').update(password + salt).digest('hex')
}

/**
 * Verify a password against a hash
 */
export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash
}
