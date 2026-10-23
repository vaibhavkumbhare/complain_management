import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const limit = parseInt(searchParams.get('limit') || '30', 10)
  const complaintId = searchParams.get('complaintId') || undefined

  const where: Record<string, unknown> = {}
  if (complaintId) where.complaintId = complaintId

  const activities = await db.activityLog.findMany({
    where,
    orderBy: { timestamp: 'desc' },
    take: Math.min(limit, 200),
    include: { complaint: { select: { ticketId: true, title: true, category: true } } },
  })

  return NextResponse.json({ activities })
}
