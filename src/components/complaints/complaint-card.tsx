'use client'

import * as Icons from 'lucide-react'
import { DEPARTMENT_MAP, type CategoryKey } from '@/lib/complaint-config'
import type { Complaint } from '@/lib/complaint-types'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge, PriorityBadge } from './badges'
import { formatDistanceToNow } from 'date-fns'

export function ComplaintCard({
  complaint,
  onOpen,
  onQuickAction,
  showActions,
  actorName,
  compact = false,
}: {
  complaint: Complaint
  onOpen: () => void
  onQuickAction?: (action: 'approve' | 'reject' | 'start' | 'resolve' | 'reopen') => void
  showActions?: boolean
  actorName?: string
  compact?: boolean
}) {
  const dept = DEPARTMENT_MAP[complaint.category as CategoryKey]
  const DeptIcon = dept ? (Icons as unknown as Record<string, Icons.LucideIcon>)[dept.icon] : Icons.CircleDot
  const status = complaint.status

  const validActions: Array<'approve' | 'reject' | 'start' | 'resolve' | 'reopen'> = []
  if (status === 'pending') validActions.push('approve', 'reject')
  if (status === 'approved') validActions.push('start')
  if (status === 'in_progress') validActions.push('resolve')
  if (status === 'resolved' || status === 'rejected') validActions.push('reopen')

  return (
    <Card className={`group relative overflow-hidden ${dept?.border ?? 'border-border'} border-l-4 hover:shadow-md transition-shadow`}>
      <div className="p-4 space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 min-w-0 flex-1">
            <div className={`shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-md ${dept?.bg}`}>
              <DeptIcon className={`h-4 w-4 ${dept?.accent}`} />
            </div>
            <div className="min-w-0">
              <button
                onClick={onOpen}
                className="text-left text-sm font-semibold leading-snug hover:underline line-clamp-2"
              >
                {complaint.title}
              </button>
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5">
                <span className="font-mono">{complaint.ticketId}</span>
                <span>·</span>
                <span>{formatDistanceToNow(new Date(complaint.createdAt), { addSuffix: true })}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <StatusBadge status={status} />
            <PriorityBadge priority={complaint.priority} />
          </div>
        </div>

        {!compact && (
          <p className="text-xs text-muted-foreground line-clamp-2 pl-10">{complaint.description}</p>
        )}

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground pl-10">
          {complaint.location && (
            <span className="inline-flex items-center gap-1">
              <Icons.MapPin className="h-3 w-3" />
              {complaint.location}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <Icons.User className="h-3 w-3" />
            {complaint.reporterName}
          </span>
          {complaint.assignedTo && (
            <span className="inline-flex items-center gap-1">
              <Icons.UserCog className="h-3 w-3" />
              {complaint.assignedTo}
            </span>
          )}
        </div>

        {(showActions && validActions.length > 0 && onQuickAction) ? (
          <div className="flex flex-wrap items-center gap-1.5 pl-10 pt-1">
            {validActions.includes('approve') && (
              <Button size="sm" variant="default" className="h-7 gap-1 text-xs" onClick={() => onQuickAction('approve')} disabled={!actorName}>
                <Icons.Check className="h-3 w-3" /> Approve
              </Button>
            )}
            {validActions.includes('reject') && (
              <Button size="sm" variant="outline" className="h-7 gap-1 text-xs text-rose-600 hover:text-rose-700" onClick={() => onQuickAction('reject')} disabled={!actorName}>
                <Icons.X className="h-3 w-3" /> Reject
              </Button>
            )}
            {validActions.includes('start') && (
              <Button size="sm" variant="secondary" className="h-7 gap-1 text-xs" onClick={() => onQuickAction('start')} disabled={!actorName}>
                <Icons.Play className="h-3 w-3" /> Start
              </Button>
            )}
            {validActions.includes('resolve') && (
              <Button size="sm" variant="default" className="h-7 gap-1 text-xs" onClick={() => onQuickAction('resolve')} disabled={!actorName}>
                <Icons.CheckCheck className="h-3 w-3" /> Resolve
              </Button>
            )}
            {validActions.includes('reopen') && (
              <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => onQuickAction('reopen')} disabled={!actorName}>
                <Icons.RotateCcw className="h-3 w-3" /> Reopen
              </Button>
            )}
            <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs ml-auto" onClick={onOpen}>
              Details <Icons.ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <div className="pl-10">
            <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={onOpen}>
              View details <Icons.ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>
    </Card>
  )
}
