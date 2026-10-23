// Shared frontend types for the complaint system.
import type { CategoryKey, PriorityKey, StatusKey } from '@/lib/complaint-config'

export interface ActivityLog {
  id: string
  complaintId: string
  action: string
  by: string
  note: string | null
  timestamp: string
  complaint?: { ticketId: string; title: string; category: string }
}

export interface Complaint {
  id: string
  ticketId: string
  title: string
  description: string
  category: CategoryKey
  department: string
  priority: PriorityKey
  status: StatusKey
  location: string
  reporterName: string
  reporterContact: string
  assignedTo: string | null
  resolutionNote: string | null
  createdAt: string
  updatedAt: string
  activities?: ActivityLog[]
}

export interface PerDepartmentStat {
  key: CategoryKey
  label: string
  department: string
  icon: string
  accent: string
  bg: string
  border: string
  total: number
  pending: number
  approved: number
  in_progress: number
  resolved: number
  rejected: number
}

export interface Stats {
  total: number
  open: number
  resolved: number
  rejected: number
  resolutionRate: number
  byStatus: Record<StatusKey, number>
  byCategory: Record<CategoryKey, number>
  byPriority: Record<PriorityKey, number>
  perDepartment: PerDepartmentStat[]
  trend: Array<{ date: string; created: number; resolved: number }>
  generatedAt: string
}

export interface RealtimeEvent {
  id: string
  ticketId: string
  title: string
  category: CategoryKey
  department: string
  status: StatusKey
  statusLabel?: string
  priority: PriorityKey
  assignedTo?: string | null
  action?: string
  by?: string
  note?: string | null
  createdAt?: string
  updatedAt?: string
}
