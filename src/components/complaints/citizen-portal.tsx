'use client'

import * as React from 'react'
import * as Icons from 'lucide-react'
import { DEPARTMENTS, type CategoryKey, type PriorityKey } from '@/lib/complaint-config'
import type { Complaint, RealtimeEvent } from '@/lib/complaint-types'
import { createComplaint, fetchComplaints, updateComplaintStatus } from '@/lib/complaint-api'
import { useComplaintSocket } from '@/hooks/use-complaint-socket'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { ComplaintCard } from './complaint-card'
import { ComplaintDetailDialog } from './complaint-detail-dialog'
import { StatusBadge } from './badges'
import { formatDistanceToNow } from 'date-fns'
import type { PublicAccount } from '@/lib/auth'

export function CitizenPortal({ account }: { account: PublicAccount }) {
  const { toast } = useToast()
  const [tab, setTab] = React.useState<'submit' | 'track'>('submit')
  const [trackEmail, setTrackEmail] = React.useState(account.email)
  const [trackedEmail, setTrackedEmail] = React.useState('')
  const [complaints, setComplaints] = React.useState<Complaint[]>([])
  const [loadingTrack, setLoadingTrack] = React.useState(false)
  const [pulse, setPulse] = React.useState<string | null>(null)
  const [selected, setSelected] = React.useState<Complaint | null>(null)

  // form state — prefilled from the logged-in account
  const [form, setForm] = React.useState({
    title: '',
    description: '',
    category: '' as CategoryKey | '',
    priority: 'medium' as PriorityKey,
    location: '',
    reporterName: account.name,
    reporterContact: account.email,
  })
  const [submitting, setSubmitting] = React.useState(false)
  const [lastTicket, setLastTicket] = React.useState<Complaint | null>(null)

  // Live updates for citizen channel
  useComplaintSocket({
    channels: ['citizen'],
    onNew: (e) => {
      setLiveFeed((prev) => [e, ...prev].slice(0, 8))
      if (trackedEmail && e) {
        // can't know reporter from event; refresh tracked list to be safe
      }
    },
    onUpdate: (e) => {
      setLiveFeed((prev) => [e, ...prev].slice(0, 8))
      setComplaints((prev) =>
        prev.map((c) => (c.id === e.id ? { ...c, status: e.status, updatedAt: e.updatedAt ?? c.updatedAt } : c))
      )
      setPulse(e.id)
      setTimeout(() => setPulse((p) => (p === e.id ? null : p)), 2500)
    },
  })

  const [liveFeed, setLiveFeed] = React.useState<RealtimeEvent[]>([])

  const submit = async () => {
    if (!form.title || !form.description || !form.category || !form.reporterName || !form.reporterContact) {
      toast({ title: 'Missing fields', description: 'Please fill all required fields.', variant: 'destructive' })
      return
    }
    setSubmitting(true)
    try {
      const created = await createComplaint(form as { title: string; description: string; category: CategoryKey; priority: PriorityKey; location: string; reporterName: string; reporterContact: string })
      setLastTicket(created)
      toast({
        title: 'Complaint submitted!',
        description: `Ticket ${created.ticketId} routed to ${created.department}.`,
      })
      setForm({
        title: '',
        description: '',
        category: '',
        priority: 'medium',
        location: '',
        reporterName: form.reporterName,
        reporterContact: form.reporterContact,
      })
      // Auto-track this reporter
      setTrackEmail(created.reporterContact)
      setTrackedEmail(created.reporterContact)
      setTab('track')
      void loadTracked(created.reporterContact)
    } catch (e) {
      toast({ title: 'Submission failed', description: (e as Error).message, variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const loadTracked = async (email: string) => {
    if (!email.trim()) return
    setLoadingTrack(true)
    try {
      const list = await fetchComplaints({ reporter: email.trim(), limit: 100 })
      setComplaints(list)
      setTrackedEmail(email.trim())
    } catch (e) {
      toast({ title: 'Failed to load', description: (e as Error).message, variant: 'destructive' })
    } finally {
      setLoadingTrack(false)
    }
  }

  // Auto-load this citizen's complaints on mount
  React.useEffect(() => {
    void loadTracked(account.email)
  }, [account.email])

  const dept = form.category ? DEPARTMENTS.find((d) => d.key === form.category) : null

  return (
    <div className="space-y-6">
      {/* Success banner */}
      {lastTicket && (
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="py-3 flex items-center gap-3">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100">
              <Icons.CheckCheck className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-emerald-800">
                Complaint submitted — Ticket <span className="font-mono">{lastTicket.ticketId}</span>
              </p>
              <p className="text-xs text-emerald-700">
                Auto-routed to {lastTicket.department}. Track its live status in the &ldquo;Track My Complaints&rdquo; tab.
              </p>
            </div>
            <Button size="sm" variant="ghost" className="text-emerald-700" onClick={() => setLastTicket(null)}>
              Dismiss
            </Button>
          </CardContent>
        </Card>
      )}

      <Tabs value={tab} onValueChange={(v) => setTab(v as 'submit' | 'track')}>
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="submit" className="gap-1.5">
            <Icons.PlusCircle className="h-4 w-4" /> Submit Complaint
          </TabsTrigger>
          <TabsTrigger value="track" className="gap-1.5">
            <Icons.Search className="h-4 w-4" /> Track My Complaints
          </TabsTrigger>
        </TabsList>

        <div className="grid lg:grid-cols-3 gap-6 mt-4">
          <div className="lg:col-span-2">
            <TabsContent value="submit" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Icons.FileText className="h-5 w-5" /> Report a Problem
                  </CardTitle>
                  <CardDescription>
                    Fill in the details below. Your complaint will be automatically routed to the right service department.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="title">Problem Title <span className="text-rose-500">*</span></Label>
                    <Input
                      id="title"
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      placeholder="e.g. Power outage in Block A"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Service Category <span className="text-rose-500">*</span></Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {DEPARTMENTS.map((d) => {
                        const Icon = (Icons as unknown as Record<string, Icons.LucideIcon>)[d.icon]
                        const active = form.category === d.key
                        return (
                          <button
                            key={d.key}
                            type="button"
                            onClick={() => setForm({ ...form, category: d.key })}
                            className={`flex flex-col items-start gap-1 rounded-lg border-2 p-2.5 text-left transition-all hover:shadow-sm ${
                              active ? `${d.bg} ${d.border} ring-2 ring-offset-1 ring-current ${d.accent}` : 'bg-card border-border'
                            }`}
                          >
                            <Icon className={`h-4 w-4 ${active ? d.accent : 'text-muted-foreground'}`} />
                            <span className="text-xs font-medium leading-tight">{d.label}</span>
                          </button>
                        )
                      })}
                    </div>
                    {dept && (
                      <p className={`text-xs ${dept.accent} mt-1`}>
                        Routed to <strong>{dept.department}</strong> — {dept.description}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="desc">Description <span className="text-rose-500">*</span></Label>
                    <Textarea
                      id="desc"
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder="Describe the problem in detail..."
                      rows={4}
                    />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="priority">Priority</Label>
                      <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as PriorityKey })}>
                        <SelectTrigger id="priority"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="location">Location</Label>
                      <Input
                        id="location"
                        value={form.location}
                        onChange={(e) => setForm({ ...form, location: e.target.value })}
                        placeholder="e.g. Block A, Floor 2"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="name">Your Name</Label>
                      <Input
                        id="name"
                        value={form.reporterName}
                        readOnly
                        className="bg-muted/50 cursor-not-allowed"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="contact">Email / Contact</Label>
                      <Input
                        id="contact"
                        type="email"
                        value={form.reporterContact}
                        readOnly
                        className="bg-muted/50 cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <Button onClick={submit} disabled={submitting} className="w-full gap-2">
                    {submitting ? <Icons.Loader2 className="h-4 w-4 animate-spin" /> : <Icons.Send className="h-4 w-4" />}
                    {submitting ? 'Submitting...' : 'Submit Complaint'}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="track" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Icons.Search className="h-5 w-5" /> Track My Complaints
                  </CardTitle>
                  <CardDescription>Enter your email/contact to view all complaints you have submitted and their live status.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      type="email"
                      value={trackEmail}
                      onChange={(e) => setTrackEmail(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') void loadTracked(trackEmail) }}
                      placeholder="you@example.com"
                    />
                    <Button onClick={() => void loadTracked(trackEmail)} disabled={loadingTrack || !trackEmail.trim()} className="gap-1.5 shrink-0">
                      {loadingTrack ? <Icons.Loader2 className="h-4 w-4 animate-spin" /> : <Icons.Search className="h-4 w-4" />}
                      Track
                    </Button>
                  </div>

                  {!trackedEmail ? (
                    <div className="text-center py-10 text-muted-foreground text-sm">
                      <Icons.Inbox className="h-10 w-10 mx-auto mb-2 opacity-40" />
                      Enter your contact above to track your complaints.
                    </div>
                  ) : complaints.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground text-sm">
                      <Icons.Inbox className="h-10 w-10 mx-auto mb-2 opacity-40" />
                      No complaints found for <strong>{trackedEmail}</strong>.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-xs text-muted-foreground">{complaints.length} complaint(s) for <strong>{trackedEmail}</strong></p>
                      {complaints.map((c) => (
                        <div key={c.id} className={pulse === c.id ? 'animate-pulse rounded-lg' : ''}>
                          <ComplaintCard complaint={c} onOpen={() => setSelected(c)} showActions={false} />
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </div>

          {/* Live feed sidebar */}
          <div>
            <Card className="lg:sticky lg:top-20">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  Live Status Feed
                </CardTitle>
                <CardDescription>Real-time complaint activity across all departments</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-[420px] overflow-y-auto px-4 pb-4 space-y-2">
                  {liveFeed.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-xs">
                      <Icons.Activity className="h-8 w-8 mx-auto mb-2 opacity-40" />
                      Waiting for live updates...
                    </div>
                  ) : (
                    liveFeed.map((e, i) => (
                      <LiveFeedItem key={`${e.id}-${i}`} event={e} />
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </Tabs>

      <ComplaintDetailDialog
        complaint={selected}
        open={!!selected}
        onOpenChange={(v) => !v && setSelected(null)}
        showActions={false}
      />
    </div>
  )
}

function LiveFeedItem({ event }: { event: RealtimeEvent }) {
  const dept = DEPARTMENTS.find((d) => d.key === event.category)
  const Icon = dept ? (Icons as unknown as Record<string, Icons.LucideIcon>)[dept.icon] : Icons.CircleDot
  const isNew = !event.action
  return (
    <div className="flex items-start gap-2 rounded-md border bg-card p-2.5 text-xs">
      <div className={`shrink-0 inline-flex h-7 w-7 items-center justify-center rounded ${dept?.bg}`}>
        <Icon className={`h-3.5 w-3.5 ${dept?.accent}`} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-medium leading-snug line-clamp-1">{event.title}</p>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <span className="font-mono text-[10px] text-muted-foreground">{event.ticketId}</span>
          {isNew ? (
            <Badge variant="outline" className="h-4 text-[10px] px-1 bg-slate-100 text-slate-600 border-slate-200">New</Badge>
          ) : (
            <StatusBadge status={event.status} className="h-4 text-[10px] px-1" />
          )}
        </div>
        {event.by && (
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {event.action === 'resolve' ? 'Resolved' : event.action === 'reject' ? 'Rejected' : event.action === 'approve' ? 'Approved' : event.action === 'start' ? 'Work started' : 'Updated'} by {event.by}
            {event.createdAt && ` · ${formatDistanceToNow(new Date(event.createdAt), { addSuffix: true })}`}
          </p>
        )}
      </div>
    </div>
  )
}
