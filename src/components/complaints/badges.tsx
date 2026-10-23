'use client'

import { Badge } from '@/components/ui/badge'
import {
  STATUS_META,
  PRIORITY_META,
  type StatusKey,
  type PriorityKey,
} from '@/lib/complaint-config'

export function StatusBadge({ status, className }: { status: StatusKey; className?: string }) {
  const m = STATUS_META[status]
  return (
    <Badge variant="outline" className={`${m.bg} ${m.color} ${m.border} border gap-1.5 ${className ?? ''}`}>
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </Badge>
  )
}

export function PriorityBadge({ priority, className }: { priority: PriorityKey; className?: string }) {
  const m = PRIORITY_META[priority]
  return (
    <Badge variant="outline" className={`${m.bg} ${m.color} ${m.border} border ${className ?? ''}`}>
      {m.label}
    </Badge>
  )
}
