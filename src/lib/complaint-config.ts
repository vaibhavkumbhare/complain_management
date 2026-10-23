// Shared complaint system configuration: categories, departments, statuses, priorities.

export type CategoryKey =
  | 'electrical'
  | 'plumbing'
  | 'it'
  | 'civil'
  | 'sanitation'
  | 'security'

export type StatusKey =
  | 'pending'
  | 'approved'
  | 'in_progress'
  | 'resolved'
  | 'rejected'

export type PriorityKey = 'low' | 'medium' | 'high' | 'urgent'

export interface DepartmentConfig {
  key: CategoryKey
  label: string
  department: string
  description: string
  icon: string // lucide icon name
  accent: string // tailwind text color class for accents
  bg: string // tailwind bg class
  border: string
  examples: string[]
}

export const DEPARTMENTS: DepartmentConfig[] = [
  {
    key: 'electrical',
    label: 'Electrical',
    department: 'Electrical Department',
    description: 'Power outages, wiring, lighting, electrical appliances',
    icon: 'Zap',
    accent: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    examples: ['Power outage', 'Flickering lights', 'Broken switch', 'Short circuit'],
  },
  {
    key: 'plumbing',
    label: 'Plumbing',
    department: 'Plumbing Department',
    description: 'Water supply, leaks, drainage, sanitation fixtures',
    icon: 'Droplets',
    accent: 'text-sky-600',
    bg: 'bg-sky-50',
    border: 'border-sky-200',
    examples: ['Water leakage', 'No water supply', 'Clogged drain', 'Broken tap'],
  },
  {
    key: 'it',
    label: 'IT & Network',
    department: 'IT Department',
    description: 'Computers, network, software, internet, accounts',
    icon: 'MonitorCog',
    accent: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    examples: ['No internet', 'Computer not working', 'Software issue', 'Account locked'],
  },
  {
    key: 'civil',
    label: 'Civil & Infrastructure',
    department: 'Civil Department',
    description: 'Buildings, roads, walls, furniture, structural repairs',
    icon: 'Building2',
    accent: 'text-stone-600',
    bg: 'bg-stone-50',
    border: 'border-stone-200',
    examples: ['Cracked wall', 'Broken door', 'Pothole', 'Roof leak'],
  },
  {
    key: 'sanitation',
    label: 'Sanitation',
    department: 'Sanitation Department',
    description: 'Cleaning, waste, pest control, hygiene',
    icon: 'Trash2',
    accent: 'text-lime-600',
    bg: 'bg-lime-50',
    border: 'border-lime-200',
    examples: ['Trash not collected', 'Dirty restroom', 'Pest problem', 'Spills'],
  },
  {
    key: 'security',
    label: 'Security',
    department: 'Security Department',
    description: 'Access control, safety, surveillance, incidents',
    icon: 'ShieldCheck',
    accent: 'text-rose-600',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    examples: ['Broken lock', 'Suspicious activity', 'Access card issue', 'Camera not working'],
  },
]

export const DEPARTMENT_MAP: Record<CategoryKey, DepartmentConfig> = DEPARTMENTS.reduce(
  (acc, d) => {
    acc[d.key] = d
    return acc
  },
  {} as Record<CategoryKey, DepartmentConfig>
)

export const STATUS_META: Record<
  StatusKey,
  { label: string; color: string; bg: string; border: string; dot: string; step: number }
> = {
  pending: {
    label: 'Pending',
    color: 'text-slate-600',
    bg: 'bg-slate-100',
    border: 'border-slate-200',
    dot: 'bg-slate-400',
    step: 0,
  },
  approved: {
    label: 'Approved',
    color: 'text-violet-600',
    bg: 'bg-violet-100',
    border: 'border-violet-200',
    dot: 'bg-violet-500',
    step: 1,
  },
  in_progress: {
    label: 'In Progress',
    color: 'text-blue-600',
    bg: 'bg-blue-100',
    border: 'border-blue-200',
    dot: 'bg-blue-500',
    step: 2,
  },
  resolved: {
    label: 'Resolved',
    color: 'text-emerald-600',
    bg: 'bg-emerald-100',
    border: 'border-emerald-200',
    dot: 'bg-emerald-500',
    step: 3,
  },
  rejected: {
    label: 'Rejected',
    color: 'text-rose-600',
    bg: 'bg-rose-100',
    border: 'border-rose-200',
    dot: 'bg-rose-500',
    step: -1,
  },
}

export const PRIORITY_META: Record<
  PriorityKey,
  { label: string; color: string; bg: string; border: string }
> = {
  low: { label: 'Low', color: 'text-slate-600', bg: 'bg-slate-100', border: 'border-slate-200' },
  medium: { label: 'Medium', color: 'text-amber-600', bg: 'bg-amber-100', border: 'border-amber-200' },
  high: { label: 'High', color: 'text-orange-600', bg: 'bg-orange-100', border: 'border-orange-200' },
  urgent: { label: 'Urgent', color: 'text-rose-600', bg: 'bg-rose-100', border: 'border-rose-200' },
}

export const STATUS_ORDER: StatusKey[] = ['pending', 'approved', 'in_progress', 'resolved']

export function isValidCategory(k: string): k is CategoryKey {
  return DEPARTMENTS.some((d) => d.key === k)
}

export function isValidStatus(k: string): k is StatusKey {
  return k in STATUS_META
}

export function isValidPriority(k: string): k is PriorityKey {
  return k in PRIORITY_META
}
