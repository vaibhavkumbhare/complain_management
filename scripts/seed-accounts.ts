// Seed demo auth accounts.
// Run with: bun run scripts/seed-accounts.ts
import { db } from '../src/lib/db'
import { hashPassword } from '../src/lib/auth'
import { DEPARTMENTS } from '../src/lib/complaint-config'

const PASSWORD = 'demo1234'

const demoAccounts: Array<{ email: string; name: string; role: string; department: string | null }> = [
  { email: 'citizen@demo.com', name: 'Demo Citizen', role: 'citizen', department: null },
  { email: 'admin@demo.com', name: 'Admin User', role: 'admin', department: null },
  // One service agent per department
  ...DEPARTMENTS.map((d) => ({
    email: `agent.${d.key}@demo.com`,
    name: `${d.label} Agent`,
    role: 'service',
    department: d.key,
  })),
]

async function main() {
  console.log('Seeding demo accounts...')
  await db.account.deleteMany({})
  const hash = hashPassword(PASSWORD)
  for (const a of demoAccounts) {
    await db.account.create({
      data: {
        email: a.email,
        name: a.name,
        passwordHash: hash,
        role: a.role,
        department: a.department,
      },
    })
    console.log(`  • ${a.email} / ${PASSWORD}  [${a.role}${a.department ? `:${a.department}` : ''}]`)
  }
  console.log(`Seeded ${demoAccounts.length} demo accounts.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
