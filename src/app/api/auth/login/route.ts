import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  verifyPassword,
  createSessionToken,
  SESSION_COOKIE,
  SESSION_COOKIE_OPTIONS,
  toPublic,
} from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password } = body || {}

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 })
    }
    const emailNorm = String(email).trim().toLowerCase()

    const account = await db.account.findUnique({ where: { email: emailNorm } })
    if (!account || !verifyPassword(password, account.passwordHash)) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 })
    }

    const token = createSessionToken(account.id)
    const res = NextResponse.json({ account: toPublic(account) })
    res.cookies.set(SESSION_COOKIE, token, SESSION_COOKIE_OPTIONS)
    return res
  } catch (e) {
    console.error('[POST /api/auth/login]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
