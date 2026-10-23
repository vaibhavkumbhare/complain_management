# ResolveHub — Complaint Management System

A full-stack complaint management system with role-based authentication, 6 separate service department dashboards, an approve/reject workflow, and live real-time statistics.

Built with **Next.js 16 (App Router)**, **TypeScript**, **Tailwind CSS 4**, **shadcn/ui**, **Prisma (SQLite)**, **Recharts**, and **Socket.IO** for real-time updates.

---

## Features

### Authentication & Roles
- **Sign up / Sign in** with email + password (scrypt hashing, HMAC-signed httpOnly session cookies)
- Three roles with role-based access control:
  - **Citizen** → Citizen Portal only
  - **Service Agent** → their department's Service Dashboard (locked)
  - **Admin** → all three dashboards

### Three Dashboards
1. **Citizen Portal** — submit a complaint (auto-routed to the matching department), track all your complaints by email with a live status feed.
2. **Service Agent Dashboard** — pick your department → see its complaint queue with live counts per status. Approve / Reject / Start Work / Resolve / Reopen actions with notes for resolve/reject. Status timeline + activity history in the detail dialog.
3. **Admin Stats Dashboard** — 4 live KPI cards, 14-day trend area chart, status donut, department workload bar chart, priority radial chart, per-department breakdown table, searchable all-complaints list, and a live activity feed.

### 6 Service Departments
Electrical · Plumbing · IT & Network · Civil & Infrastructure · Sanitation · Security

### Real-time
Socket.IO mini-service fans out `complaint:new` / `complaint:update` events to channel-based rooms (`admin`, `citizen`, `dept:<category>`). All dashboards update live.

---

## Project Structure

```
.
├── prisma/
│   └── schema.prisma              # Complaint, ActivityLog, Account models
├── scripts/
│   ├── seed.ts                    # seed 18 demo complaints + activity logs
│   └── seed-accounts.ts           # seed 8 demo auth accounts
├── mini-services/
│   └── complaint-realtime/        # Socket.IO mini-service (port 3003) + internal push (3004)
│       ├── index.ts
│       └── package.json
├── src/
│   ├── app/
│   │   ├── page.tsx               # main app: auth gate + role-based dashboards
│   │   ├── layout.tsx
│   │   ├── globals.css
│   │   └── api/
│   │       ├── complaints/        # GET/POST + [id] GET/PATCH (workflow actions)
│   │       ├── stats/             # GET aggregate stats
│   │       ├── activity/          # GET activity feed
│   │       └── auth/              # signup, login, logout, me
│   ├── components/
│   │   ├── complaints/            # auth-screen, citizen-portal, service-dashboard,
│   │   │                          # admin-dashboard, complaint-card, detail-dialog, badges
│   │   └── ui/                    # shadcn/ui components
│   ├── hooks/
│   │   ├── use-auth.ts            # Zustand auth store
│   │   └── use-complaint-socket.ts# Socket.IO hook
│   └── lib/
│       ├── auth.ts                # password hashing, session cookies, getSession
│       ├── complaint-config.ts    # departments, statuses, priorities metadata
│       ├── complaint-types.ts     # shared TS types
│       ├── complaint-api.ts       # frontend API client
│       ├── realtime.ts            # server-side push helper
│       └── db.ts                  # Prisma client
├── Caddyfile                      # gateway config (port 81 → 3000, ?XTransformPort routing)
├── package.json
└── tailwind.config.ts
```

---

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) 18+ or [Bun](https://bun.sh/)
- A Caddy gateway (or any reverse proxy) for Socket.IO port routing — see `Caddyfile`

### Install
```bash
bun install
cd mini-services/complaint-realtime && bun install && cd ../..
```

### Database
```bash
bun run db:push        # create SQLite schema
bun run scripts/seed.ts           # seed 18 demo complaints
bun run scripts/seed-accounts.ts  # seed 8 demo accounts
```

### Run
```bash
# 1. Start the realtime mini-service
cd mini-services/complaint-realtime && bun run dev &
cd ../..

# 2. Start the Next.js app
bun run dev
```
App runs on http://localhost:3000. The realtime service runs on ports 3003 (socket.io) + 3004 (internal push).

### Demo Accounts (password: `demo1234`)
| Email | Role |
|-------|------|
| citizen@demo.com | Citizen |
| admin@demo.com | Admin (all dashboards) |
| agent.electrical@demo.com | Service Agent — Electrical |
| agent.plumbing@demo.com | Service Agent — Plumbing |
| agent.it@demo.com | Service Agent — IT & Network |
| agent.civil@demo.com | Service Agent — Civil |
| agent.sanitation@demo.com | Service Agent — Sanitation |
| agent.security@demo.com | Service Agent — Security |

---

## How it works

1. A **citizen** submits a complaint and picks a category → the system auto-routes it to the matching service department and generates a ticket ID (`CMP-YYYY-NNNN`).
2. A **service agent** for that department sees the new complaint appear in their queue (live via Socket.IO) and can Approve → Start Work → Resolve (or Reject at any stage), with notes.
3. The **admin** dashboard shows live stats across all departments — KPIs, charts, and a real-time activity feed update instantly as complaints are created and progressed.
4. Every status change emits a Socket.IO event that fans out to subscribed dashboards; the citizen sees their complaint's status update in real time.

---

## Notes

- The app is a single-route SPA (`/`) — all three dashboards live behind a role-based auth gate on the same route.
- Socket.IO routing goes through the Caddy gateway via `?XTransformPort=3003`. Direct `localhost:3000` access bypasses Caddy and breaks real-time updates — use the gateway port (81 in the dev sandbox) or a similar reverse proxy in production.
- SQLite database file is at `db/custom.db` (gitignored; recreated by `db:push` + seed scripts).
