import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { pushRealtime, channelsForComplaint } from '@/lib/realtime'
import {
  DEPARTMENT_MAP,
  isValidCategory,
  isValidPriority,
  type CategoryKey,
} from '@/lib/complaint-config'

function makeTicketId(): string {
  const year = new Date().getFullYear()
  const num = Math.floor(1000 + Math.random() * 9000)
  return `CMP-${year}-${num}`
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category') || undefined
  const status = searchParams.get('status') || undefined
  const department = searchParams.get('department') || undefined
  const reporter = searchParams.get('reporter') || undefined
  const limit = parseInt(searchParams.get('limit') || '100', 10)
  const search = searchParams.get('q') || undefined

  const where: Record<string, unknown> = {}
  if (category) where.category = category
  if (status) where.status = status
  if (department) where.department = department
  if (reporter) where.reporterContact = reporter
  if (search) {
    where.OR = [
      { title: { contains: search } },
      { description: { contains: search } },
      { ticketId: { contains: search } },
      { location: { contains: search } },
    ]
  }

  const complaints = await db.complaint.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: Math.min(limit, 500),
  })

  return NextResponse.json({ complaints })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      title,
      description,
      category,
      priority = 'medium',
      location = '',
      reporterName,
      reporterContact,
    } = body || {}

    if (!title || !description || !category || !reporterName || !reporterContact) {
      return NextResponse.json(
        { error: 'Missing required fields: title, description, category, reporterName, reporterContact' },
        { status: 400 }
      )
    }
    if (!isValidCategory(category)) {
      return NextResponse.json({ error: `Invalid category: ${category}` }, { status: 400 })
    }
    const priorityKey = isValidPriority(priority) ? priority : 'medium'
    const dept = DEPARTMENT_MAP[category as CategoryKey]

    let ticketId = makeTicketId()
    let exists = await db.complaint.findUnique({ where: { ticketId } })
    while (exists) {
      ticketId = makeTicketId()
      exists = await db.complaint.findUnique({ where: { ticketId } })
    }

    const complaint = await db.complaint.create({
      data: {
        ticketId,
        title: String(title).trim(),
        description: String(description).trim(),
        category,
        department: dept.department,
        priority: priorityKey,
        location: String(location || '').trim(),
        reporterName: String(reporterName).trim(),
        reporterContact: String(reporterContact).trim(),
        status: 'pending',
      },
    })

    await db.activityLog.create({
      data: {
        complaintId: complaint.id,
        action: 'created',
        by: complaint.reporterName,
        note: `Complaint submitted and auto-routed to ${dept.department}.`,
      },
    })

    await pushRealtime(channelsForComplaint(complaint.category), 'complaint:new', {
      id: complaint.id,
      ticketId: complaint.ticketId,
      title: complaint.title,
      category: complaint.category,
      department: complaint.department,
      status: complaint.status,
      priority: complaint.priority,
      createdAt: complaint.createdAt,
    })

    const full = await db.complaint.findUnique({
      where: { id: complaint.id },
      include: { activities: { orderBy: { timestamp: 'asc' } } },
    })

    return NextResponse.json({ complaint: full }, { status: 201 })
  } catch (e) {
    console.error('[POST /api/complaints]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
