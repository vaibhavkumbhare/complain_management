"use client";

import * as React from "react";
import * as Icons from "lucide-react";
import { CitizenPortal } from "@/components/complaints/citizen-portal";
import { ServiceDashboard } from "@/components/complaints/service-dashboard";
import { AdminDashboard } from "@/components/complaints/admin-dashboard";
import { AuthScreen } from "@/components/complaints/auth-screen";
import { useComplaintSocket } from "@/hooks/use-complaint-socket";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import type { PublicAccount, Role } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

type View = "citizen" | "service" | "admin";

const VIEW_META: Record<
  View,
  { label: string; icon: string; description: string }
> = {
  citizen: {
    label: "Citizen Portal",
    icon: "User",
    description:
      "Report a problem and track its live status as service teams work on it.",
  },
  service: {
    label: "Service Agent Dashboard",
    icon: "Wrench",
    description:
      "View your department complaint queue. Approve, reject, start work, and resolve complaints.",
  },
  admin: {
    label: "Admin Stats Dashboard",
    icon: "LayoutDashboard",
    description:
      "Live overview of all complaints across departments with real-time statistics.",
  },
};

export default function Page() {
  const { account, loading, fetchMe, logout } = useAuth();
  const { toast } = useToast();

  React.useEffect(() => {
    void fetchMe();
  }, [fetchMe]);

  // Global connection indicator (subscribes to a benign channel to show status)
  const { isConnected } = useComplaintSocket({ channels: ["citizen"] });

  // Determine which views the user can access based on role
  const accessibleViews: View[] = React.useMemo(() => {
    if (!account) return [];
    if (account.role === "admin")
      return ["citizen", "service", "admin"] as View[];
    if (account.role === "service") return ["service"] as View[];
    return ["citizen"] as View[];
  }, [account]);

  const defaultView: View = account ? (account.role as View) : "citizen";
  const [view, setView] = React.useState<View>("citizen");

  // When account loads, set the default view
  React.useEffect(() => {
    if (account) setView(defaultView);
  }, [account, defaultView]);

  // Loading splash while checking session
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Icons.Loader2 className="h-6 w-6 animate-spin" />
          <p className="text-sm">Loading ResolveHub...</p>
        </div>
      </div>
    );
  }

  // Not authenticated → show auth screen
  if (!account) {
    return <AuthScreen />;
  }

  const handleLogout = async () => {
    await logout();
    toast({ title: "Signed out", description: "You have been logged out." });
  };

  const currentView: View = accessibleViews.includes(view) ? view : defaultView;
  const meta = VIEW_META[currentView];
  const ViewIcon = (Icons as unknown as Record<string, Icons.LucideIcon>)[
    meta.icon
  ];
  const initials = account.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto max-w-7xl px-4">
          <div className="flex h-16 items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shrink-0">
                <Icons.ShieldCheck className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg font-bold leading-tight truncate">
                  ResolveHub
                </h1>
                <p className="text-[11px] text-muted-foreground leading-tight hidden sm:block">
                  Complaint Management System
                </p>
              </div>
            </div>

            {/* View switcher (only shows views the user can access) */}
            {accessibleViews.length > 1 && (
              <nav
                className="flex items-center gap-1 rounded-lg border bg-muted/50 p-1"
                role="tablist"
                aria-label="Switch view"
              >
                {accessibleViews.map((v) => {
                  const Icon = (
                    Icons as unknown as Record<string, Icons.LucideIcon>
                  )[VIEW_META[v].icon];
                  const active = currentView === v;
                  return (
                    <button
                      key={v}
                      role="tab"
                      aria-selected={active}
                      onClick={() => setView(v)}
                      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-medium transition-all ${
                        active
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Icon className="h-3.5 sm:h-4 w-3.5 sm:w-4" />
                      <span className="hidden sm:inline">
                        {VIEW_META[v].label.split(" ")[0]}
                      </span>
                    </button>
                  );
                })}
              </nav>
            )}

            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={`gap-1.5 ${isConnected ? "text-emerald-600 border-emerald-200 bg-emerald-50" : "text-muted-foreground"}`}
              >
                <span className={`relative flex h-2 w-2`}>
                  {isConnected && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  )}
                  <span
                    className={`relative inline-flex rounded-full h-2 w-2 ${isConnected ? "bg-emerald-500" : "bg-muted-foreground"}`}
                  />
                </span>
                <span className="hidden sm:inline">
                  {isConnected ? "Live" : "Offline"}
                </span>
              </Badge>

              {/* Account menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="gap-2 h-9 px-1.5 sm:px-2.5"
                  >
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden sm:inline text-sm font-medium max-w-[120px] truncate">
                      {account.name}
                    </span>
                    <Icons.ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60">
                  <DropdownMenuLabel>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium">{account.name}</span>
                      <span className="text-xs text-muted-foreground font-normal truncate">
                        {account.email}
                      </span>
                      <Badge
                        variant="secondary"
                        className="w-fit mt-1 text-[10px] capitalize"
                      >
                        {account.role}
                        {account.department ? ` · ${account.department}` : ""}
                      </Badge>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => void handleLogout()}
                    className="text-rose-600 focus:text-rose-700 gap-2"
                  >
                    <Icons.LogOut className="h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 container mx-auto max-w-7xl px-4 py-6 w-full">
        {/* View description banner */}
        <div className="mb-5 flex items-start gap-3">
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
            <ViewIcon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold leading-tight">
              {meta.label}
            </h2>
            <p className="text-sm text-muted-foreground">{meta.description}</p>
          </div>
        </div>

        {currentView === "citizen" && <CitizenPortal account={account} />}
        {currentView === "service" && <ServiceDashboard account={account} />}
        {currentView === "admin" && <AdminDashboard account={account} />}
      </main>

      {/* Sticky footer */}
      <footer className="mt-auto border-t bg-background">
        <div className="container mx-auto max-w-7xl px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <p className="flex items-center gap-1.5">
            <Icons.ShieldCheck className="h-3.5 w-3.5" />
            ResolveHub — Complaint Management System
          </p>
          <p className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <Icons.Zap className="h-3.5 w-3.5" /> Auto-routing
            </span>
            <span className="inline-flex items-center gap-1">
              <Icons.Radio className="h-3.5 w-3.5" /> Real-time
            </span>
            <span className="inline-flex items-center gap-1">
              <Icons.BarChart3 className="h-3.5 w-3.5" /> Live Stats
            </span>
          </p>
        </div>
      </footer>
    </div>
  );
}

// Re-export type for dashboards
export type { PublicAccount, Role };
