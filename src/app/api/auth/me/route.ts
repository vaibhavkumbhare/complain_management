import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'

export async function GET() {
  const account = await getSession()
  if (!account) {
    return NextResponse.json({ account: null }, { status: 200 })
  }
  return NextResponse.json({ account })
}
