// Frontend API client for the complaint system.
import type { Complaint, Stats, ActivityLog, CategoryKey, PriorityKey } from '@/lib/complaint-types'

export interface ListParams {
  category?: CategoryKey
  status?: string
  department?: string
  reporter?: string
  q?: string
  limit?: number
}

export async function fetchComplaints(params: ListParams = {}): Promise<Complaint[]> {
  const qs = new URLSearchParams()
  if (params.category) qs.set('category', params.category)
  if (params.status) qs.set('status', params.status)
  if (params.department) qs.set('department', params.department)
  if (params.reporter) qs.set('reporter', params.reporter)
  if (params.q) qs.set('q', params.q)
  if (params.limit) qs.set('limit', String(params.limit))
  const res = await fetch(`/api/complaints?${qs.toString()}`)
  if (!res.ok) throw new Error('Failed to fetch complaints')
  const data = await res.json()
  return data.complaints as Complaint[]
}

export async function fetchComplaint(id: string): Promise<Complaint> {
  const res = await fetch(`/api/complaints/${id}`)
  if (!res.ok) throw new Error('Failed to fetch complaint')
  const data = await res.json()
  return data.complaint as Complaint
}

export interface CreateComplaintInput {
  title: string
  description: string
  category: CategoryKey
  priority: PriorityKey
  location: string
  reporterName: string
  reporterContact: string
}

export async function createComplaint(input: CreateComplaintInput): Promise<Complaint> {
  const res = await fetch('/api/complaints', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to create complaint')
  }
  const data = await res.json()
  return data.complaint as Complaint
}

export type WorkflowAction = 'approve' | 'start' | 'resolve' | 'reject' | 'reopen'

export async function updateComplaintStatus(
  id: string,
  action: WorkflowAction,
  by: string,
  note?: string
): Promise<Complaint> {
  const res = await fetch(`/api/complaints/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, by, note }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to update complaint')
  }
  const data = await res.json()
  return data.complaint as Complaint
}

export async function fetchStats(): Promise<Stats> {
  const res = await fetch('/api/stats', { cache: 'no-store' })
  if (!res.ok) throw new Error('Failed to fetch stats')
  return (await res.json()) as Stats
}

export async function fetchActivity(limit = 30, complaintId?: string): Promise<ActivityLog[]> {
  const qs = new URLSearchParams({ limit: String(limit) })
  if (complaintId) qs.set('complaintId', complaintId)
  const res = await fetch(`/api/activity?${qs.toString()}`, { cache: 'no-store' })
  if (!res.ok) throw new Error('Failed to fetch activity')
  const data = await res.json()
  return data.activities as ActivityLog[]
}
