import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { pushRealtime, channelsForComplaint } from '@/lib/realtime'
import { isValidStatus, STATUS_META, type StatusKey } from '@/lib/complaint-config'

// Valid workflow transitions
const ACTION_TO_STATUS: Record<string, StatusKey> = {
  approve: 'approved',
  start: 'in_progress',
  resolve: 'resolved',
  reject: 'rejected',
  reopen: 'pending',
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const complaint = await db.complaint.findUnique({
    where: { id },
    include: { activities: { orderBy: { timestamp: 'asc' } } },
  })
  if (!complaint) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ complaint })
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params
    const body = await req.json()
    const { action, by, note } = body || {}

    if (!action || !(action in ACTION_TO_STATUS)) {
      return NextResponse.json(
        { error: `Invalid action. Use one of: ${Object.keys(ACTION_TO_STATUS).join(', ')}` },
        { status: 400 }
      )
    }

    const existing = await db.complaint.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const newStatus = ACTION_TO_STATUS[action]
    if (!isValidStatus(newStatus)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const actorName = String(by || 'Service Agent').trim()
    const noteText = note ? String(note).trim() : null

    const updated = await db.complaint.update({
      where: { id },
      data: {
        status: newStatus,
        assignedTo: newStatus === 'approved' || newStatus === 'in_progress' || newStatus === 'resolved'
          ? (existing.assignedTo ?? actorName)
          : existing.assignedTo,
        resolutionNote: newStatus === 'resolved' || newStatus === 'rejected'
          ? (noteText ?? existing.resolutionNote)
          : existing.resolutionNote,
      },
    })

    const actionLabel: Record<string, string> = {
      approve: 'Complaint approved and assigned.',
      start: 'Work started by service team.',
      resolve: 'Complaint marked as resolved.',
      reject: 'Complaint rejected.',
      reopen: 'Complaint reopened.',
    }

    await db.activityLog.create({
      data: {
        complaintId: id,
        action,
        by: actorName,
        note: noteText ?? actionLabel[action] ?? `Status changed to ${newStatus}.`,
      },
    })

    const meta = STATUS_META[newStatus]

    await pushRealtime(channelsForComplaint(updated.category), 'complaint:update', {
      id: updated.id,
      ticketId: updated.ticketId,
      title: updated.title,
      category: updated.category,
      department: updated.department,
      status: updated.status,
      statusLabel: meta.label,
      priority: updated.priority,
      assignedTo: updated.assignedTo,
      action,
      by: actorName,
      note: noteText,
      updatedAt: updated.updatedAt,
    })

    const full = await db.complaint.findUnique({
      where: { id },
      include: { activities: { orderBy: { timestamp: 'asc' } } },
    })

    return NextResponse.json({ complaint: full })
  } catch (e) {
    console.error('[PATCH /api/complaints/[id]]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
