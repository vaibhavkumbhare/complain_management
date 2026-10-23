import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  hashPassword,
  createSessionToken,
  SESSION_COOKIE,
  SESSION_COOKIE_OPTIONS,
  toPublic,
  isValidRole,
  type Role,
} from '@/lib/auth'
import { isValidCategory } from '@/lib/complaint-config'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, email, password, role = 'citizen', department } = body || {}

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email, and password are required.' }, { status: 400 })
    }
    if (typeof password !== 'string' || password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 })
    }
    if (!isValidRole(role)) {
      return NextResponse.json({ error: 'Invalid role.' }, { status: 400 })
    }
    const emailNorm = String(email).trim().toLowerCase()
    if (role === 'service') {
      if (!department || !isValidCategory(department)) {
        return NextResponse.json({ error: 'Service agents must select a valid department.' }, { status: 400 })
      }
    }

    const existing = await db.account.findUnique({ where: { email: emailNorm } })
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 })
    }

    const account = await db.account.create({
      data: {
        email: emailNorm,
        name: String(name).trim(),
        passwordHash: hashPassword(password),
        role: role as Role,
        department: role === 'service' ? department : null,
      },
    })

    const token = createSessionToken(account.id)
    const res = NextResponse.json({ account: toPublic(account) }, { status: 201 })
    res.cookies.set(SESSION_COOKIE, token, SESSION_COOKIE_OPTIONS)
    return res
  } catch (e) {
    console.error('[POST /api/auth/signup]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
