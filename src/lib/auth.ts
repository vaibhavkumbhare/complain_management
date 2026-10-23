// Server-side auth utilities: password hashing, signed session cookies, getSession.
import { cookies } from 'next/headers'
import { createHmac, scryptSync, randomBytes, timingSafeEqual } from 'crypto'
import { db } from '@/lib/db'

const SECRET = process.env.AUTH_SECRET || 'resolvehub-dev-secret-change-in-prod'
export const SESSION_COOKIE = 'cms_session'
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7 // 7 days

export type Role = 'citizen' | 'service' | 'admin'

export interface PublicAccount {
  id: string
  email: string
  name: string
  role: Role
  department: string | null
}

export function toPublic(a: {
  id: string
  email: string
  name: string
  role: string
  department: string | null
}): PublicAccount {
  return {
    id: a.id,
    email: a.email,
    name: a.name,
    role: a.role as Role,
    department: a.department,
  }
}

// ---- Password hashing (scrypt) ----
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  const hashBuf = Buffer.from(hash, 'hex')
  const testBuf = scryptSync(password, salt, 64)
  if (hashBuf.length !== testBuf.length) return false
  return timingSafeEqual(hashBuf, testBuf)
}

// ---- Signed session cookie ----
function sign(payload: string): string {
  return createHmac('sha256', SECRET).update(payload).digest('hex')
}

export function createSessionToken(userId: string): string {
  const payload = JSON.stringify({ uid: userId, exp: Date.now() + MAX_AGE_SECONDS * 1000 })
  const b64 = Buffer.from(payload).toString('base64url')
  const sig = sign(b64)
  return `${b64}.${sig}`
}

export function verifySessionToken(token: string | undefined): { uid: string } | null {
  if (!token) return null
  const parts = token.split('.')
  if (parts.length !== 2) return null
  const [b64, sig] = parts
  if (sign(b64) !== sig) return null
  try {
    const payload = JSON.parse(Buffer.from(b64, 'base64url').toString()) as { uid: string; exp: number }
    if (typeof payload.exp !== 'number' || payload.exp < Date.now()) return null
    if (typeof payload.uid !== 'string') return null
    return { uid: payload.uid }
  } catch {
    return null
  }
}

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: MAX_AGE_SECONDS,
}

export async function getSession(): Promise<PublicAccount | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  const verified = verifySessionToken(token)
  if (!verified) return null
  const account = await db.account.findUnique({ where: { id: verified.uid } })
  if (!account) return null
  return toPublic(account)
}

export function isValidRole(r: string): r is Role {
  return r === 'citizen' || r === 'service' || r === 'admin'
}
