'use client'

import * as React from 'react'
import * as Icons from 'lucide-react'
import { DEPARTMENTS, type CategoryKey } from '@/lib/complaint-config'
import type { Role } from '@/lib/auth'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'

const ROLE_OPTIONS: Array<{ key: Role; label: string; icon: string; description: string }> = [
  { key: 'citizen', label: 'Citizen', icon: 'User', description: 'Report & track problems' },
  { key: 'service', label: 'Service Agent', icon: 'Wrench', description: 'Handle department complaints' },
  { key: 'admin', label: 'Admin', icon: 'LayoutDashboard', description: 'Full oversight & stats' },
]

const DEMO_ACCOUNTS = [
  { email: 'citizen@demo.com', role: 'Citizen', icon: 'User', color: 'text-foreground' },
  { email: 'agent.electrical@demo.com', role: 'Electrical Agent', icon: 'Zap', color: 'text-amber-600' },
  { email: 'admin@demo.com', role: 'Admin', icon: 'LayoutDashboard', color: 'text-violet-600' },
]

export function AuthScreen() {
  const { toast } = useToast()
  const { login, signup, submitting, error, clearError } = useAuth()
  const [mode, setMode] = React.useState<'login' | 'signup'>('login')

  // shared fields
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  // signup-only
  const [name, setName] = React.useState('')
  const [role, setRole] = React.useState<Role>('citizen')
  const [department, setDepartment] = React.useState<CategoryKey>('electrical')

  const reset = () => {
    setEmail('')
    setPassword('')
    setName('')
    setRole('citizen')
    setDepartment('electrical')
    clearError()
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const ok = await login(email.trim(), password)
    if (ok) {
      toast({ title: 'Welcome back!', description: 'You are now signed in.' })
    } else if (!error) {
      toast({ title: 'Login failed', variant: 'destructive' })
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    const ok = await signup({
      name: name.trim(),
      email: email.trim(),
      password,
      role,
      department: role === 'service' ? department : undefined,
    })
    if (ok) {
      toast({ title: 'Account created!', description: 'Welcome to ResolveHub.' })
    } else if (!error) {
      toast({ title: 'Sign up failed', variant: 'destructive' })
    }
  }

  const quickFill = (demoEmail: string) => {
    setMode('login')
    setEmail(demoEmail)
    setPassword('demo1234')
    clearError()
  }

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      {/* Top brand bar */}
      <header className="border-b bg-background/80 backdrop-blur">
        <div className="container mx-auto max-w-7xl px-4 h-16 flex items-center gap-2.5">
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Icons.ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold leading-tight">ResolveHub</h1>
            <p className="text-[11px] text-muted-foreground leading-tight hidden sm:block">Complaint Management System</p>
          </div>
        </div>
      </header>

      <main className="flex-1 grid lg:grid-cols-2">
        {/* Brand / marketing panel */}
        <section className="hidden lg:flex flex-col justify-between p-10 bg-primary text-primary-foreground relative overflow-hidden">
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
            backgroundSize: '24px 24px',
          }} />
          <div className="relative space-y-6 max-w-md">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary-foreground/15 backdrop-blur">
              <Icons.ShieldCheck className="h-6 w-6" />
            </div>
            <div className="space-y-3">
              <h2 className="text-3xl font-bold leading-tight">Report. Route. Resolve.</h2>
              <p className="text-primary-foreground/80 leading-relaxed">
                A unified complaint management platform where citizens report problems, service departments handle them,
                and admins track everything in real time.
              </p>
            </div>
            <div className="space-y-3 pt-4">
              <Feature icon="Zap" title="Auto-routing" desc="Complaints instantly reach the right service department." />
              <Feature icon="Radio" title="Real-time updates" desc="Live status changes stream to every dashboard." />
              <Feature icon="BarChart3" title="Live stats" desc="Track resolution rates and department workload." />
            </div>
          </div>
          <div className="relative text-xs text-primary-foreground/60">
            © {new Date().getFullYear()} ResolveHub · Complaint Management System
          </div>
        </section>

        {/* Auth form panel */}
        <section className="flex items-center justify-center p-5 sm:p-8">
          <div className="w-full max-w-md space-y-5">
            <div className="text-center lg:text-left">
              <h2 className="text-2xl font-bold">{mode === 'login' ? 'Welcome back' : 'Create your account'}</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {mode === 'login' ? 'Sign in to access your dashboard.' : 'Sign up to start reporting and resolving complaints.'}
              </p>
            </div>

            <Tabs value={mode} onValueChange={(v) => { setMode(v as 'login' | 'signup'); reset() }}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login" className="gap-1.5">
                  <Icons.LogIn className="h-4 w-4" /> Sign In
                </TabsTrigger>
                <TabsTrigger value="signup" className="gap-1.5">
                  <Icons.UserPlus className="h-4 w-4" /> Sign Up
                </TabsTrigger>
              </TabsList>

              {/* LOGIN */}
              <TabsContent value="login" className="mt-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Sign In</CardTitle>
                    <CardDescription>Enter your credentials to continue.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleLogin} className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="login-email">Email</Label>
                        <div className="relative">
                          <Icons.Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="login-email"
                            type="email"
                            value={email}
                            onChange={(e) => { setEmail(e.target.value); clearError() }}
                            placeholder="you@example.com"
                            className="pl-9"
                            required
                            autoComplete="email"
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="login-password">Password</Label>
                        <div className="relative">
                          <Icons.Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="login-password"
                            type="password"
                            value={password}
                            onChange={(e) => { setPassword(e.target.value); clearError() }}
                            placeholder="••••••••"
                            className="pl-9"
                            required
                            autoComplete="current-password"
                          />
                        </div>
                      </div>

                      {error && (
                        <div className="flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700">
                          <Icons.AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                          <span>{error}</span>
                        </div>
                      )}

                      <Button type="submit" className="w-full gap-2" disabled={submitting}>
                        {submitting ? <Icons.Loader2 className="h-4 w-4 animate-spin" /> : <Icons.LogIn className="h-4 w-4" />}
                        {submitting ? 'Signing in...' : 'Sign In'}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* SIGNUP */}
              <TabsContent value="signup" className="mt-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Create Account</CardTitle>
                    <CardDescription>Choose your role to get started.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSignup} className="space-y-4">
                      <div className="space-y-1.5">
                        <Label>Account Type</Label>
                        <div className="grid grid-cols-3 gap-2">
                          {ROLE_OPTIONS.map((r) => {
                            const Icon = (Icons as unknown as Record<string, Icons.LucideIcon>)[r.icon]
                            const active = role === r.key
                            return (
                              <button
                                key={r.key}
                                type="button"
                                onClick={() => { setRole(r.key); clearError() }}
                                className={`flex flex-col items-center gap-1 rounded-lg border-2 p-2.5 text-center transition-all ${
                                  active ? 'border-primary bg-primary/5 ring-2 ring-offset-1 ring-primary/30' : 'border-border hover:border-foreground/20'
                                }`}
                              >
                                <Icon className={`h-4 w-4 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
                                <span className="text-[11px] font-medium leading-tight">{r.label}</span>
                              </button>
                            )
                          })}
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          {ROLE_OPTIONS.find((r) => r.key === role)?.description}
                        </p>
                      </div>

                      {role === 'service' && (
                        <div className="space-y-1.5">
                          <Label htmlFor="signup-dept">Department</Label>
                          <Select value={department} onValueChange={(v) => { setDepartment(v as CategoryKey); clearError() }}>
                            <SelectTrigger id="signup-dept"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {DEPARTMENTS.map((d) => (
                                <SelectItem key={d.key} value={d.key}>{d.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <Label htmlFor="signup-name">Full Name</Label>
                        <div className="relative">
                          <Icons.User className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="signup-name"
                            value={name}
                            onChange={(e) => { setName(e.target.value); clearError() }}
                            placeholder="Your name"
                            className="pl-9"
                            required
                            autoComplete="name"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="signup-email">Email</Label>
                        <div className="relative">
                          <Icons.Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="signup-email"
                            type="email"
                            value={email}
                            onChange={(e) => { setEmail(e.target.value); clearError() }}
                            placeholder="you@example.com"
                            className="pl-9"
                            required
                            autoComplete="email"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="signup-password">Password</Label>
                        <div className="relative">
                          <Icons.Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="signup-password"
                            type="password"
                            value={password}
                            onChange={(e) => { setPassword(e.target.value); clearError() }}
                            placeholder="Min. 6 characters"
                            className="pl-9"
                            required
                            minLength={6}
                            autoComplete="new-password"
                          />
                        </div>
                      </div>

                      {error && (
                        <div className="flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700">
                          <Icons.AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                          <span>{error}</span>
                        </div>
                      )}

                      <Button type="submit" className="w-full gap-2" disabled={submitting}>
                        {submitting ? <Icons.Loader2 className="h-4 w-4 animate-spin" /> : <Icons.UserPlus className="h-4 w-4" />}
                        {submitting ? 'Creating account...' : 'Create Account'}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Demo accounts */}
            <Card className="bg-muted/40">
              <CardContent className="p-3.5 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  <Icons.Sparkles className="h-3.5 w-3.5" /> Try a demo account
                </div>
                <div className="grid gap-1.5">
                  {DEMO_ACCOUNTS.map((d) => {
                    const Icon = (Icons as unknown as Record<string, Icons.LucideIcon>)[d.icon]
                    return (
                      <button
                        key={d.email}
                        onClick={() => quickFill(d.email)}
                        className="flex items-center gap-2 rounded-md border bg-background px-2.5 py-1.5 text-left text-xs hover:border-foreground/30 hover:shadow-sm transition-all"
                      >
                        <Icon className={`h-3.5 w-3.5 ${d.color}`} />
                        <span className="font-medium">{d.role}</span>
                        <span className="text-muted-foreground truncate">{d.email}</span>
                        <Badge variant="secondary" className="ml-auto text-[10px] h-4 px-1.5">demo1234</Badge>
                      </button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
    </div>
  )
}

function Feature({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  const Icon = (Icons as unknown as Record<string, Icons.LucideIcon>)[icon]
  return (
    <div className="flex items-start gap-3">
      <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary-foreground/15 backdrop-blur shrink-0">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="font-semibold text-sm">{title}</p>
        <p className="text-xs text-primary-foreground/70 leading-relaxed">{desc}</p>
      </div>
    </div>
  )
}
