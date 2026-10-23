"use client";

import * as React from "react";
import * as Icons from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area,
  Legend,
  RadialBarChart,
  RadialBar,
} from "recharts";
import {
  DEPARTMENTS,
  STATUS_META,
  PRIORITY_META,
  type StatusKey,
  type CategoryKey,
} from "@/lib/complaint-config";
import type { Stats, Complaint, RealtimeEvent } from "@/lib/complaint-types";
import { fetchStats, fetchComplaints } from "@/lib/complaint-api";
import { useComplaintSocket } from "@/hooks/use-complaint-socket";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ComplaintCard } from "./complaint-card";
import { ComplaintDetailDialog } from "./complaint-detail-dialog";
import { StatusBadge, PriorityBadge } from "./badges";
import { format, formatDistanceToNow } from "date-fns";

const STATUS_COLORS: Record<StatusKey, string> = {
  pending: "#94a3b8",
  approved: "#8b5cf6",
  in_progress: "#3b82f6",
  resolved: "#10b981",
  rejected: "#f43f5e",
};

const DEPT_COLORS: Record<CategoryKey, string> = {
  electrical: "#f59e0b",
  plumbing: "#0ea5e9",
  it: "#10b981",
  civil: "#78716c",
  sanitation: "#84cc16",
  security: "#f43f5e",
};

export function AdminDashboard({
  account: _account,
}: {
  account: import("@/lib/auth").PublicAccount;
}) {
  void _account;
  const { toast } = useToast();
  const [stats, setStats] = React.useState<Stats | null>(null);
  const [complaints, setComplaints] = React.useState<Complaint[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [liveEvents, setLiveEvents] = React.useState<RealtimeEvent[]>([]);
  const [selected, setSelected] = React.useState<Complaint | null>(null);
  const [pulse, setPulse] = React.useState<string | null>(null);
  const [filterStatus, setFilterStatus] = React.useState<StatusKey | "all">(
    "all",
  );

  const reload = React.useCallback(async () => {
    setLoading(true);
    try {
      const [s, c] = await Promise.all([
        fetchStats(),
        fetchComplaints({ limit: 200 }),
      ]);
      setStats(s);
      setComplaints(c);
    } catch (e) {
      toast({
        title: "Failed to load",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    let cancelled = false;
    Promise.all([fetchStats(), fetchComplaints({ limit: 200 })])
      .then(([s, c]) => {
        if (cancelled) return;
        setStats(s);
        setComplaints(c);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        toast({
          title: "Failed to load",
          description: (e as Error).message,
          variant: "destructive",
        });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [toast]);

  // Live updates — admin subscribes to all channels via the 'admin' channel
  useComplaintSocket({
    channels: ["admin"],
    onNew: (e) => {
      setLiveEvents((prev) => [e, ...prev].slice(0, 20));
      setPulse(e.id);
      setTimeout(() => setPulse((p) => (p === e.id ? null : p)), 2500);
      // Refresh stats periodically (debounced)
      scheduleStatsRefresh();
    },
    onUpdate: (e) => {
      setLiveEvents((prev) => [e, ...prev].slice(0, 20));
      setComplaints((prev) =>
        prev.map((c) =>
          c.id === e.id
            ? {
                ...c,
                status: e.status,
                assignedTo: e.assignedTo ?? c.assignedTo,
                updatedAt: e.updatedAt ?? c.updatedAt,
              }
            : c,
        ),
      );
      setPulse(e.id);
      setTimeout(() => setPulse((p) => (p === e.id ? null : p)), 2500);
      scheduleStatsRefresh();
    },
  });

  const statsTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleStatsRefresh = React.useCallback(() => {
    if (statsTimer.current) clearTimeout(statsTimer.current);
    statsTimer.current = setTimeout(() => {
      void reload();
    }, 800);
  }, [reload]);

  const filtered = React.useMemo(() => {
    let list = complaints;
    if (filterStatus !== "all")
      list = list.filter((c) => c.status === filterStatus);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.ticketId.toLowerCase().includes(q) ||
          c.reporterName.toLowerCase().includes(q) ||
          c.location.toLowerCase().includes(q),
      );
    }
    return list;
  }, [complaints, filterStatus, search]);

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center py-20">
        <Icons.Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          icon="ClipboardList"
          label="Total Complaints"
          value={stats?.total ?? 0}
          accent="text-foreground"
          bg="bg-slate-50"
          border="border-slate-200"
        />
        <KpiCard
          icon="AlertCircle"
          label="Open"
          value={stats?.open ?? 0}
          accent="text-amber-600"
          bg="bg-amber-50"
          border="border-amber-200"
        />
        <KpiCard
          icon="CheckCheck"
          label="Resolved"
          value={stats?.resolved ?? 0}
          accent="text-emerald-600"
          bg="bg-emerald-50"
          border="border-emerald-200"
        />
        <KpiCard
          icon="TrendingUp"
          label="Resolution Rate"
          value={`${stats?.resolutionRate ?? 0}%`}
          accent="text-violet-600"
          bg="bg-violet-50"
          border="border-violet-200"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Trend chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Icons.Activity className="h-4 w-4" /> Complaints Trend (Last 14
              Days)
            </CardTitle>
            <CardDescription>
              New complaints vs resolved per day
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart
                data={stats?.trend ?? []}
                margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="gCreated" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gResolved" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(d) => format(new Date(d), "MMM dd")}
                  tick={{ fontSize: 11 }}
                  className="text-muted-foreground"
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11 }}
                  className="text-muted-foreground"
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    fontSize: 12,
                    border: "1px solid hsl(var(--border))",
                  }}
                  labelFormatter={(d) => format(new Date(d as string), "PP")}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area
                  type="monotone"
                  dataKey="created"
                  name="New"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  fill="url(#gCreated)"
                />
                <Area
                  type="monotone"
                  dataKey="resolved"
                  name="Resolved"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#gResolved)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status donut */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Icons.PieChart className="h-4 w-4" /> Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={Object.entries(stats?.byStatus ?? {}).map(([k, v]) => ({
                    name: STATUS_META[k as StatusKey].label,
                    value: v,
                    key: k,
                  }))}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  {Object.entries(stats?.byStatus ?? {}).map(([k]) => (
                    <Cell key={k} fill={STATUS_COLORS[k as StatusKey]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-1.5 mt-2">
              {Object.entries(stats?.byStatus ?? {}).map(([k, v]) => (
                <div key={k} className="flex items-center gap-1.5 text-xs">
                  <span
                    className="h-2.5 w-2.5 rounded-sm"
                    style={{ backgroundColor: STATUS_COLORS[k as StatusKey] }}
                  />
                  <span className="text-muted-foreground">
                    {STATUS_META[k as StatusKey].label}
                  </span>
                  <span className="ml-auto font-semibold">{v}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Department load bar chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Icons.BarChart3 className="h-4 w-4" /> Department Workload
            </CardTitle>
            <CardDescription>
              Total complaints per service department
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={stats?.perDepartment ?? []}
                margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-muted"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11 }}
                  className="text-muted-foreground"
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11 }}
                  className="text-muted-foreground"
                />
                <Tooltip
                  contentStyle={{ borderRadius: 8, fontSize: 12 }}
                  cursor={{ fill: "rgba(0,0,0,0.03)" }}
                />
                <Bar dataKey="total" name="Total" radius={[4, 4, 0, 0]}>
                  {stats?.perDepartment.map((d) => (
                    <Cell key={d.key} fill={DEPT_COLORS[d.key]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Priority radial */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Icons.Flag className="h-4 w-4" /> Priority Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <RadialBarChart
                cx="50%"
                cy="50%"
                innerRadius="30%"
                outerRadius="100%"
                barSize={12}
                data={[
                  {
                    name: "Urgent",
                    value: stats?.byPriority.urgent ?? 0,
                    fill: "#f43f5e",
                  },
                  {
                    name: "High",
                    value: stats?.byPriority.high ?? 0,
                    fill: "#fb923c",
                  },
                  {
                    name: "Medium",
                    value: stats?.byPriority.medium ?? 0,
                    fill: "#f59e0b",
                  },
                  {
                    name: "Low",
                    value: stats?.byPriority.low ?? 0,
                    fill: "#94a3b8",
                  },
                ]}
                startAngle={90}
                endAngle={-270}
              >
                <RadialBar background dataKey="value" cornerRadius={6} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-1.5 mt-2">
              {Object.entries(stats?.byPriority ?? {}).map(([k, v]) => (
                <div key={k} className="flex items-center gap-1.5 text-xs">
                  <span
                    className="h-2.5 w-2.5 rounded-sm"
                    style={{
                      backgroundColor: PRIORITY_META[
                        k as keyof typeof PRIORITY_META
                      ]
                        ? {
                            low: "#94a3b8",
                            medium: "#f59e0b",
                            high: "#fb923c",
                            urgent: "#f43f5e",
                          }[k as "low" | "medium" | "high" | "urgent"]
                        : "#94a3b8",
                    }}
                  />
                  <span className="text-muted-foreground capitalize">{k}</span>
                  <span className="ml-auto font-semibold">{v}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Per-department table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Icons.Building2 className="h-4 w-4" /> Department Status Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="py-2 px-4 font-medium">Department</th>
                  <th className="py-2 px-3 font-medium text-center">Total</th>
                  <th className="py-2 px-3 font-medium text-center">Pending</th>
                  <th className="py-2 px-3 font-medium text-center">
                    Approved
                  </th>
                  <th className="py-2 px-3 font-medium text-center">
                    In Progress
                  </th>
                  <th className="py-2 px-3 font-medium text-center">
                    Resolved
                  </th>
                  <th className="py-2 px-3 font-medium text-center">
                    Rejected
                  </th>
                </tr>
              </thead>
              <tbody>
                {stats?.perDepartment.map((d) => {
                  const cfg = DEPARTMENTS.find((x) => x.key === d.key)!;
                  const Icon = (
                    Icons as unknown as Record<string, Icons.LucideIcon>
                  )[cfg.icon];
                  return (
                    <tr
                      key={d.key}
                      className="border-b last:border-0 hover:bg-muted/30"
                    >
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-2">
                          <div
                            className={`inline-flex h-7 w-7 items-center justify-center rounded ${cfg.bg}`}
                          >
                            <Icon className={`h-3.5 w-3.5 ${cfg.accent}`} />
                          </div>
                          <div>
                            <div className="font-medium">{d.label}</div>
                            <div className="text-[11px] text-muted-foreground">
                              {d.department}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-center font-semibold">
                        {d.total}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="text-slate-600">{d.pending}</span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="text-violet-600">{d.approved}</span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="text-blue-600">{d.in_progress}</span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="text-emerald-600">{d.resolved}</span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="text-rose-600">{d.rejected}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* All complaints */}
        <div className="lg:col-span-2 space-y-3">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Icons.ListFilter className="h-4 w-4" /> All Complaints
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Search title, ticket, name..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-8 w-48"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void reload()}
                    className="gap-1.5 h-8"
                  >
                    <Icons.RefreshCw className="h-3.5 w-3.5" /> Refresh
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                <FilterChip
                  active={filterStatus === "all"}
                  onClick={() => setFilterStatus("all")}
                  label="All"
                  count={stats?.total ?? 0}
                />
                {(
                  [
                    "pending",
                    "approved",
                    "in_progress",
                    "resolved",
                    "rejected",
                  ] as StatusKey[]
                ).map((s) => (
                  <FilterChip
                    key={s}
                    active={filterStatus === s}
                    onClick={() => setFilterStatus(s)}
                    label={STATUS_META[s].label}
                    count={stats?.byStatus[s] ?? 0}
                    color={STATUS_COLORS[s]}
                  />
                ))}
              </div>
            </CardHeader>
          </Card>
          {filtered.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground text-sm">
                No complaints match your filters.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {filtered.map((c) => (
                <div
                  key={c.id}
                  className={pulse === c.id ? "animate-pulse rounded-lg" : ""}
                >
                  <ComplaintCard
                    complaint={c}
                    onOpen={() => setSelected(c)}
                    showActions={false}
                    compact
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Live activity feed */}
        <Card className="lg:sticky lg:top-20 h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              Live Activity Feed
            </CardTitle>
            <CardDescription>
              Real-time updates across all departments
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[560px] overflow-y-auto px-4 pb-4 space-y-2">
              {liveEvents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-xs">
                  <Icons.Activity className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  Live events will stream here as they happen.
                </div>
              ) : (
                liveEvents.map((e, i) => (
                  <ActivityItem key={`${e.id}-${i}`} event={e} />
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <ComplaintDetailDialog
        complaint={selected}
        open={!!selected}
        onOpenChange={(v) => !v && setSelected(null)}
        showActions={false}
      />
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  accent,
  bg,
  border,
}: {
  icon: string;
  label: string;
  value: string | number;
  accent: string;
  bg: string;
  border: string;
}) {
  const Icon =
    (Icons as unknown as Record<string, Icons.LucideIcon>)[icon] ??
    Icons.Circle;
  return (
    <Card className={`${border} border-l-4`}>
      <CardContent className="p-4 flex items-center gap-3">
        <div
          className={`inline-flex h-11 w-11 items-center justify-center rounded-lg ${bg} ${border} border`}
        >
          <Icon className={`h-5 w-5 ${accent}`} />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            {label}
          </p>
          <p className="text-2xl font-bold leading-tight">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  count,
  color,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  color?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-card hover:bg-muted border-border"
      }`}
    >
      {color && (
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: color }}
        />
      )}
      {label}
      <span
        className={`text-[10px] ${active ? "opacity-80" : "text-muted-foreground"}`}
      >
        {count}
      </span>
    </button>
  );
}

function ActivityItem({ event }: { event: RealtimeEvent }) {
  const dept = DEPARTMENTS.find((d) => d.key === event.category);
  const Icon = dept
    ? (Icons as unknown as Record<string, Icons.LucideIcon>)[dept.icon]
    : Icons.CircleDot;
  const isNew = !event.action;
  return (
    <div className="flex items-start gap-2 rounded-md border bg-card p-2.5 text-xs">
      <div
        className={`shrink-0 inline-flex h-7 w-7 items-center justify-center rounded ${dept?.bg}`}
      >
        <Icon className={`h-3.5 w-3.5 ${dept?.accent}`} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-medium leading-snug line-clamp-1">{event.title}</p>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <span className="font-mono text-[10px] text-muted-foreground">
            {event.ticketId}
          </span>
          {isNew ? (
            <Badge
              variant="outline"
              className="h-4 text-[10px] px-1 bg-slate-100 text-slate-600 border-slate-200"
            >
              New
            </Badge>
          ) : (
            <StatusBadge
              status={event.status}
              className="h-4 text-[10px] px-1"
            />
          )}
          <PriorityBadge
            priority={event.priority}
            className="h-4 text-[10px] px-1"
          />
        </div>
        {event.by && (
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {event.action === "resolve"
              ? "Resolved"
              : event.action === "reject"
                ? "Rejected"
                : event.action === "approve"
                  ? "Approved"
                  : event.action === "start"
                    ? "Work started"
                    : "Updated"}{" "}
            by {event.by}
            {event.updatedAt &&
              ` · ${formatDistanceToNow(new Date(event.updatedAt), { addSuffix: true })}`}
          </p>
        )}
      </div>
    </div>
  );
}
