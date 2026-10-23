import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { DEPARTMENTS, STATUS_META, type StatusKey, type CategoryKey } from '@/lib/complaint-config'

export async function GET() {
  // Total counts by status
  const statusGroups = await db.complaint.groupBy({
    by: ['status'],
    _count: { _all: true },
  })
  const byStatus: Record<string, number> = {}
  for (const s of statusGroups) byStatus[s.status] = s._count._all
  // Ensure all statuses present
  Object.keys(STATUS_META).forEach((s) => {
    if (!(s in byStatus)) byStatus[s] = 0
  })

  // Counts by category/department
  const categoryGroups = await db.complaint.groupBy({
    by: ['category'],
    _count: { _all: true },
  })
  const byCategory: Record<string, number> = {}
  for (const c of categoryGroups) byCategory[c.category] = c._count._all
  DEPARTMENTS.forEach((d) => {
    if (!(d.key in byCategory)) byCategory[d.key] = 0
  })

  // Per-department breakdown by status
  const deptRows = await db.complaint.groupBy({
    by: ['category', 'status'],
    _count: { _all: true },
  })
  const perDepartment = DEPARTMENTS.map((d) => {
    const row: Record<string, number> = { total: 0 }
    Object.keys(STATUS_META).forEach((s) => (row[s] = 0))
    deptRows
      .filter((r) => r.category === d.key)
      .forEach((r) => {
        row[r.status] = r._count._all
        row.total += r._count._all
      })
    return {
      key: d.key,
      label: d.label,
      department: d.department,
      icon: d.icon,
      accent: d.accent,
      bg: d.bg,
      border: d.border,
      ...row,
    }
  })

  // Trend over last 14 days: created vs resolved per day
  const since = new Date(Date.now() - 13 * 86400000)
  since.setHours(0, 0, 0, 0)
  const recent = await db.complaint.findMany({
    where: { createdAt: { gte: since } },
    select: { createdAt: true, status: true, updatedAt: true },
  })
  const trend: Array<{ date: string; created: number; resolved: number }> = []
  for (let i = 0; i < 14; i++) {
    const d = new Date(since.getTime() + i * 86400000)
    const key = d.toISOString().slice(0, 10)
    trend.push({ date: key, created: 0, resolved: 0 })
  }
  const trendMap = new Map(trend.map((t) => [t.date, t]))
  recent.forEach((c) => {
    const ckey = c.createdAt.toISOString().slice(0, 10)
    if (trendMap.has(ckey)) trendMap.get(ckey)!.created += 1
    if (c.status === 'resolved') {
      const rkey = c.updatedAt.toISOString().slice(0, 10)
      if (trendMap.has(rkey)) trendMap.get(rkey)!.resolved += 1
    }
  })

  // Priority breakdown
  const priorityGroups = await db.complaint.groupBy({
    by: ['priority'],
    _count: { _all: true },
  })
  const byPriority: Record<string, number> = { low: 0, medium: 0, high: 0, urgent: 0 }
  for (const p of priorityGroups) byPriority[p.priority] = p._count._all

  const total = Object.values(byStatus).reduce((a, b) => a + b, 0)
  const open = (byStatus.pending ?? 0) + (byStatus.approved ?? 0) + (byStatus.in_progress ?? 0)
  const resolved = byStatus.resolved ?? 0
  const rejected = byStatus.rejected ?? 0
  const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0

  return NextResponse.json({
    total,
    open,
    resolved,
    rejected,
    resolutionRate,
    byStatus,
    byCategory,
    byPriority,
    perDepartment,
    trend,
    generatedAt: new Date().toISOString(),
  })
}
