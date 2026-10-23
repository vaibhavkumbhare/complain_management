'use client'

import * as React from 'react'
import * as Icons from 'lucide-react'
import { DEPARTMENT_MAP, STATUS_META, STATUS_ORDER, type CategoryKey } from '@/lib/complaint-config'
import type { Complaint } from '@/lib/complaint-types'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { StatusBadge, PriorityBadge } from './badges'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import type { WorkflowAction } from '@/lib/complaint-api'
import { formatDistanceToNow, format } from 'date-fns'

const ACTION_META: Record<WorkflowAction, { label: string; variant: 'default' | 'destructive' | 'outline' | 'secondary'; needsNote: boolean; icon: string }> = {
  approve: { label: 'Approve', variant: 'default', needsNote: false, icon: 'Check' },
  start: { label: 'Start Work', variant: 'secondary', needsNote: false, icon: 'Play' },
  resolve: { label: 'Resolve', variant: 'default', needsNote: true, icon: 'CheckCheck' },
  reject: { label: 'Reject', variant: 'destructive', needsNote: true, icon: 'X' },
  reopen: { label: 'Reopen', variant: 'outline', needsNote: false, icon: 'RotateCcw' },
}

export function ComplaintDetailDialog({
  complaint,
  open,
  onOpenChange,
  onAction,
  actorName,
  showActions,
}: {
  complaint: Complaint | null
  open: boolean
  onOpenChange: (v: boolean) => void
  onAction?: (action: WorkflowAction, note: string) => Promise<void>
  actorName?: string
  showActions: boolean
}) {
  const [action, setAction] = React.useState<WorkflowAction | null>(null)
  const [note, setNote] = React.useState('')
  const [busy, setBusy] = React.useState(false)


  if (!complaint) return null
  const dept = DEPARTMENT_MAP[complaint.category as CategoryKey]
  const DeptIcon = dept ? (Icons as unknown as Record<string, Icons.LucideIcon>)[dept.icon] : Icons.CircleDot
  const status = complaint.status
  const currentStep = STATUS_META[status].step

  // Determine which actions are valid given current status
  const validActions: WorkflowAction[] = []
  if (status === 'pending') validActions.push('approve', 'reject')
  if (status === 'approved') validActions.push('start', 'reject')
  if (status === 'in_progress') validActions.push('resolve')
  if (status === 'resolved' || status === 'rejected') validActions.push('reopen')

  const handleAction = async () => {
    if (!action) return
    setBusy(true)
    try {
      await onAction?.(action, note.trim())
      setAction(null)
      setNote('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <DialogTitle className="text-xl pr-8">{complaint.title}</DialogTitle>
              <DialogDescription className="font-mono text-xs">
                {complaint.ticketId}
              </DialogDescription>
            </div>
            <div className={`shrink-0 inline-flex h-10 w-10 items-center justify-center rounded-lg ${dept?.bg} ${dept?.border} border`}>
              <DeptIcon className={`h-5 w-5 ${dept?.accent}`} />
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5">
          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={status} />
            <PriorityBadge priority={complaint.priority} />
            <Badge variant="outline" className={`${dept?.bg} ${dept?.accent} ${dept?.border} border`}>
              {dept?.department}
            </Badge>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Description</h4>
            <p className="text-sm leading-relaxed">{complaint.description}</p>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <DetailItem icon="MapPin" label="Location" value={complaint.location || '—'} />
            <DetailItem icon="User" label="Reported by" value={complaint.reporterName} />
            <DetailItem icon="Mail" label="Contact" value={complaint.reporterContact} />
            <DetailItem icon="UserCog" label="Assigned to" value={complaint.assignedTo || 'Unassigned'} />
            <DetailItem icon="Clock" label="Reported" value={format(new Date(complaint.createdAt), 'PP p')} />
            <DetailItem icon="Timer" label="Last update" value={`${formatDistanceToNow(new Date(complaint.updatedAt), { addSuffix: true })}`} />
          </div>

          {complaint.resolutionNote && (
            <div className="rounded-lg border bg-muted/40 p-3 space-y-1">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Resolution Note</h4>
              <p className="text-sm">{complaint.resolutionNote}</p>
            </div>
          )}

          {/* Status tracker */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Status Timeline</h4>
            {status === 'rejected' ? (
              <div className="flex items-center gap-2 text-rose-600 text-sm font-medium">
                <Icons.XCircle className="h-4 w-4" /> Complaint was rejected
              </div>
            ) : (
              <div className="flex items-center">
                {STATUS_ORDER.map((s, i) => {
                  const m = STATUS_META[s]
                  const reached = currentStep >= m.step
                  const isCurrent = currentStep === m.step
                  return (
                    <React.Fragment key={s}>
                      <div className="flex flex-col items-center gap-1 min-w-[64px]">
                        <div
                          className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold border-2 ${
                            isCurrent
                              ? `${m.bg} ${m.color} ${m.border} ring-2 ring-offset-1 ring-current`
                              : reached
                              ? `${m.bg} ${m.color} ${m.border}`
                              : 'bg-muted text-muted-foreground border-border'
                          }`}
                        >
                          {reached ? <Icons.Check className="h-3.5 w-3.5" /> : i + 1}
                        </div>
                        <span className={`text-[10px] font-medium ${isCurrent ? m.color : 'text-muted-foreground'}`}>{m.label}</span>
                      </div>
                      {i < STATUS_ORDER.length - 1 && (
                        <div className={`h-0.5 flex-1 ${currentStep > m.step ? m.bg : 'bg-border'}`} />
                      )}
                    </React.Fragment>
                  )
                })}
              </div>
            )}
          </div>

          {/* Activity log */}
          {complaint.activities && complaint.activities.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Activity History</h4>
              <ol className="space-y-3 border-l-2 border-border pl-4">
                {complaint.activities.map((a) => (
                  <li key={a.id} className="relative">
                    <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-background" />
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-sm font-medium capitalize">{a.action.replace('_', ' ')}</span>
                      <span className="text-[11px] text-muted-foreground">{format(new Date(a.timestamp), 'PP p')}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{a.note}</p>
                    <p className="text-[11px] text-muted-foreground">by {a.by}</p>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Actions */}
          {showActions && validActions.length > 0 && (
            <div className="space-y-3 border-t pt-4">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Service Actions</h4>
              <div className="flex flex-wrap gap-2">
                {validActions.map((a) => {
                  const m = ACTION_META[a]
                  const Icon = (Icons as unknown as Record<string, Icons.LucideIcon>)[m.icon]
                  return (
                    <Button
                      key={a}
                      type="button"
                      variant={m.variant}
                      size="sm"
                      onClick={() => {
                        setAction(a)
                        if (!m.needsNote) setNote('')
                      }}
                      disabled={busy}
                      className="gap-1.5"
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {m.label}
                    </Button>
                  )
                })}
              </div>

              {action && ACTION_META[action].needsNote && (
                <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
                  <Label htmlFor="note" className="text-xs font-semibold uppercase tracking-wide">
                    {action === 'resolve' ? 'Resolution note' : 'Reason for rejection'}
                  </Label>
                  <Textarea
                    id="note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder={
                      action === 'resolve'
                        ? 'Describe what was done to resolve this complaint...'
                        : 'Explain why this complaint is being rejected...'
                    }
                    rows={3}
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setAction(null)} disabled={busy}>
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleAction}
                      disabled={busy || !note.trim()}
                      variant={action === 'reject' ? 'destructive' : 'default'}
                    >
                      {busy ? 'Submitting...' : `Confirm ${ACTION_META[action].label}`}
                    </Button>
                  </div>
                </div>
              )}

              {action && !ACTION_META[action].needsNote && (
                <div className="flex justify-end gap-2 rounded-lg border bg-muted/30 p-3">
                  <Button variant="ghost" size="sm" onClick={() => setAction(null)} disabled={busy}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleAction} disabled={busy}>
                    {busy ? 'Submitting...' : `Confirm ${ACTION_META[action].label}`}
                  </Button>
                </div>
              )}

              {actorName && <p className="text-[11px] text-muted-foreground">Acting as: {actorName}</p>}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function DetailItem({ icon, label, value }: { icon: string; label: string; value: string }) {
  const Icon = (Icons as unknown as Record<string, Icons.LucideIcon>)[icon] ?? Icons.Circle
  return (
    <div className="flex items-start gap-2">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="text-sm font-medium truncate">{value}</div>
      </div>
    </div>
  )
}
