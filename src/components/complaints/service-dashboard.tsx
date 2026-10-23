'use client'

import * as React from 'react'
import * as Icons from 'lucide-react'
import { DEPARTMENTS, STATUS_META, type CategoryKey } from '@/lib/complaint-config'
import type { Complaint, RealtimeEvent } from '@/lib/complaint-types'
import { fetchComplaints, fetchComplaint, updateComplaintStatus, type WorkflowAction } from '@/lib/complaint-api'
import { useComplaintSocket } from '@/hooks/use-complaint-socket'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ComplaintCard } from './complaint-card'
import { ComplaintDetailDialog } from './complaint-detail-dialog'
import { format } from 'date-fns'
import type { PublicAccount } from '@/lib/auth'

type FilterStatus = 'all' | 'pending' | 'approved' | 'in_progress' | 'resolved' | 'rejected'

export function ServiceDashboard({ account }: { account: PublicAccount }) {
  const { toast } = useToast()
  // Service agents are locked to their own department; admins (who can access this view) default to electrical and can switch
  const isLockedAgent = account.role === 'service' && account.department
  const initialDept = (isLockedAgent ? account.department! : 'electrical') as CategoryKey
  const [dept, setDept] = React.useState<CategoryKey>(initialDept)
  const [agentName, setAgentName] = React.useState(account.name)
  const [filter, setFilter] = React.useState<FilterStatus>('all')
  const [complaints, setComplaints] = React.useState<Complaint[]>([])
  const [loading, setLoading] = React.useState(false)
  const [pulse, setPulse] = React.useState<string | null>(null)
  const [selected, setSelected] = React.useState<Complaint | null>(null)

  const deptConfig = DEPARTMENTS.find((d) => d.key === dept)!
  const DeptIcon = (Icons as unknown as Record<string, Icons.LucideIcon>)[deptConfig.icon]

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const list = await fetchComplaints({ category: dept, limit: 200 })
      setComplaints(list)
    } catch (e) {
      toast({ title: 'Failed to load', description: (e as Error).message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [dept, toast])

  React.useEffect(() => {
    let cancelled = false
    fetchComplaints({ category: dept, limit: 200 })
      .then((list) => {
        if (!cancelled) setComplaints(list)
      })
      .catch((e: unknown) => {
        if (!cancelled) toast({ title: 'Failed to load', description: (e as Error).message, variant: 'destructive' })
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [dept, toast])

  // Live updates for this department channel
  useComplaintSocket({
    channels: [`dept:${dept}`],
    onNew: (e) => {
      if (e.category !== dept) return
      setComplaints((prev) => {
        if (prev.some((c) => c.id === e.id)) return prev
        // Build a minimal complaint object; full reload will happen on open
        const stub: Complaint = {
          id: e.id,
          ticketId: e.ticketId,
          title: e.title,
          description: 'Loading...',
          category: e.category,
          department: e.department,
          priority: e.priority,
          status: e.status,
          location: '',
          reporterName: '—',
          reporterContact: '',
          assignedTo: e.assignedTo ?? null,
          resolutionNote: null,
          createdAt: e.createdAt ?? new Date().toISOString(),
          updatedAt: e.updatedAt ?? new Date().toISOString(),
        }
        return [stub, ...prev]
      })
      setPulse(e.id)
      setTimeout(() => setPulse((p) => (p === e.id ? null : p)), 2500)
      toast({ title: 'New complaint received', description: `${e.ticketId} — ${e.title}` })
    },
    onUpdate: (e) => {
      if (e.category !== dept) return
      setComplaints((prev) =>
        prev.map((c) => (c.id === e.id ? { ...c, status: e.status, assignedTo: e.assignedTo ?? c.assignedTo, updatedAt: e.updatedAt ?? c.updatedAt } : c))
      )
      setPulse(e.id)
      setTimeout(() => setPulse((p) => (p === e.id ? null : p)), 2500)
    },
  })

  const counts = React.useMemo(() => {
    const c: Record<FilterStatus, number> = { all: complaints.length, pending: 0, approved: 0, in_progress: 0, resolved: 0, rejected: 0 }
    complaints.forEach((cm) => { c[cm.status as FilterStatus] = (c[cm.status as FilterStatus] || 0) + 1 })
    return c
  }, [complaints])

  const filtered = filter === 'all' ? complaints : complaints.filter((c) => c.status === filter)

  const openDetail = async (c: Complaint) => {
    try {
      const full = await fetchComplaint(c.id)
      setSelected(full)
    } catch {
      setSelected(c)
    }
  }

  const handleAction = async (id: string, action: WorkflowAction, note: string) => {
    if (!agentName.trim()) {
      toast({ title: 'Name required', description: 'Enter your name above to perform actions.', variant: 'destructive' })
      return
    }
    try {
      const updated = await updateComplaintStatus(id, action, agentName.trim(), note || undefined)
      setComplaints((prev) => prev.map((c) => (c.id === id ? updated : c)))
      if (selected?.id === id) setSelected(updated)
      toast({ title: 'Action completed', description: `${updated.ticketId} → ${STATUS_META[updated.status].label}` })
    } catch (e) {
      toast({ title: 'Action failed', description: (e as Error).message, variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-5">
      {/* Department selector */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          {isLockedAgent ? 'Your Department' : 'Select Service Department'}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {DEPARTMENTS.map((d) => {
            const Icon = (Icons as unknown as Record<string, Icons.LucideIcon>)[d.icon]
            const active = dept === d.key
            const disabled = isLockedAgent && d.key !== dept
            return (
              <button
                key={d.key}
                onClick={() => { if (!isLockedAgent) { setDept(d.key); setFilter('all') } }}
                disabled={disabled}
                className={`flex flex-col items-center gap-1.5 rounded-lg border-2 p-3 transition-all ${
                  isLockedAgent && !disabled ? 'cursor-default' : 'hover:shadow-sm'
                } ${
                  active ? `${d.bg} ${d.border} ring-2 ring-offset-1 ring-current ${d.accent}` : 'bg-card border-border hover:border-foreground/20'
                } ${disabled ? 'opacity-40' : ''}`}
              >
                <Icon className={`h-5 w-5 ${active ? d.accent : 'text-muted-foreground'}`} />
                <span className={`text-xs font-medium leading-tight text-center ${active ? d.accent : ''}`}>{d.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Department header */}
      <Card className={`${deptConfig.border} border-l-4`}>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`inline-flex h-11 w-11 items-center justify-center rounded-lg ${deptConfig.bg} ${deptConfig.border} border`}>
                <DeptIcon className={`h-5 w-5 ${deptConfig.accent}`} />
              </div>
              <div>
                <CardTitle className="text-lg">{deptConfig.department}</CardTitle>
                <CardDescription>{deptConfig.description}</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="space-y-1">
                <Label htmlFor="agent" className="text-[11px] uppercase tracking-wide">Agent</Label>
                <Input
                  id="agent"
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  placeholder="e.g. Ravi Kumar"
                  className="h-8 w-44"
                />
              </div>
              <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading} className="mt-5 gap-1.5">
                {loading ? <Icons.Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icons.RefreshCw className="h-3.5 w-3.5" />}
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Status filter tabs */}
      <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterStatus)}>
        <TabsList className="flex w-full flex-wrap h-auto justify-start gap-1 bg-muted/50 p-1">
          {(['all', 'pending', 'approved', 'in_progress', 'resolved', 'rejected'] as FilterStatus[]).map((s) => {
            const meta = s === 'all' ? null : STATUS_META[s]
            return (
              <TabsTrigger key={s} value={s} className="gap-1.5 data-[state=active]:bg-background text-xs">
                {s === 'all' ? 'All' : meta!.label}
                <Badge variant="secondary" className="ml-1 h-4 text-[10px] px-1.5">{counts[s] || 0}</Badge>
              </TabsTrigger>
            )
          })}
        </TabsList>
      </Tabs>

      {/* Complaints list */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Icons.Inbox className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p className="text-sm font-medium">No {filter === 'all' ? '' : STATUS_META[filter as keyof typeof STATUS_META]?.label.toLowerCase()} complaints</p>
            <p className="text-xs mt-1">New complaints in this department will appear here automatically.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((c) => (
            <div key={c.id} className={pulse === c.id ? 'animate-pulse rounded-lg' : ''}>
              <ComplaintCard
                complaint={c}
                onOpen={() => void openDetail(c)}
                onQuickAction={(action) => {
                  if (action === 'resolve' || action === 'reject') {
                    // open dialog for note entry
                    void openDetail(c)
                  } else {
                    void handleAction(c.id, action, '')
                  }
                }}
                showActions
                actorName={agentName}
              />
            </div>
          ))}
        </div>
      )}

      <ComplaintDetailDialog
        complaint={selected}
        open={!!selected}
        onOpenChange={(v) => !v && setSelected(null)}
        showActions
        actorName={agentName}
        onAction={async (action, note) => {
          if (selected) await handleAction(selected.id, action, note)
        }}
      />
    </div>
  )
}
