// Seed the complaint DB with realistic demo data.
// Run with: bun run scripts/seed.ts
import { db } from '../src/lib/db'
import { DEPARTMENTS } from '../src/lib/complaint-config'

const reporters = [
  { name: 'Aarav Sharma', contact: 'aarav@example.com' },
  { name: 'Priya Patel', contact: 'priya@example.com' },
  { name: 'Rohan Mehta', contact: 'rohan@example.com' },
  { name: 'Ananya Iyer', contact: 'ananya@example.com' },
  { name: 'Vikram Nair', contact: 'vikram@example.com' },
  { name: 'Sneha Reddy', contact: 'sneha@example.com' },
  { name: 'Karthik Rao', contact: 'karthik@example.com' },
  { name: 'Divya Menon', contact: 'divya@example.com' },
]

const agents = ['Ravi Kumar', 'Suresh Pillai', 'Meera Joshi', 'Anil Gupta', 'Farhan Ali', 'Lakshmi Nair']

const sampleComplaints: Array<{
  title: string
  description: string
  category: string
  priority: string
  location: string
}> = [
  // Electrical
  { title: 'Power outage in Block A', description: 'No electricity in Block A wing 2 since morning. Affects 30 workstations.', category: 'electrical', priority: 'urgent', location: 'Block A, Floor 2' },
  { title: 'Flickering lights in conference room', description: 'Lights flicker continuously during meetings, causing eye strain.', category: 'electrical', priority: 'medium', location: 'Block C, Conference Room 3' },
  { title: 'Broken switch near entrance', description: 'A light switch near the main entrance is broken and exposed.', category: 'electrical', priority: 'high', location: 'Main Entrance' },
  // Plumbing
  { title: 'Water leakage in restroom', description: 'Continuous water leakage from the pipe in the second-floor restroom.', category: 'plumbing', priority: 'high', location: 'Block B, Floor 2, Restroom' },
  { title: 'No water supply in cafeteria', description: 'Cafeteria has no running water since this morning, affecting food prep.', category: 'plumbing', priority: 'urgent', location: 'Cafeteria' },
  { title: 'Clogged drain in parking', description: 'Drain near parking lot entrance is clogged causing water logging.', category: 'plumbing', priority: 'medium', location: 'Parking Lot East' },
  // IT
  { title: 'No internet on floor 3', description: 'Entire floor 3 has no internet connectivity. Switch seems down.', category: 'it', priority: 'urgent', location: 'Block A, Floor 3' },
  { title: 'Printer not working', description: 'Network printer PRN-04 not responding to print jobs.', category: 'it', priority: 'low', location: 'Block B, Print Station' },
  { title: 'Email account locked', description: 'My email account got locked after password change. Need reset.', category: 'it', priority: 'medium', location: 'Remote / Online' },
  // Civil
  { title: 'Cracked wall in lobby', description: 'A visible crack has appeared on the lobby wall, getting wider.', category: 'civil', priority: 'high', location: 'Main Lobby' },
  { title: 'Broken door handle', description: 'Door handle of meeting room 5 came off, door cannot close properly.', category: 'civil', priority: 'low', location: 'Block C, Meeting Room 5' },
  { title: 'Pothole in parking', description: 'Large pothole near parking entry damaging vehicle tires.', category: 'civil', priority: 'medium', location: 'Parking Entry' },
  // Sanitation
  { title: 'Trash not collected', description: 'Trash bins in Block B haven\'t been collected for 3 days, smell is bad.', category: 'sanitation', priority: 'high', location: 'Block B, All Floors' },
  { title: 'Dirty restroom on floor 1', description: 'Restroom near reception is very dirty, needs urgent cleaning.', category: 'sanitation', priority: 'medium', location: 'Block A, Floor 1' },
  { title: 'Pest problem in pantry', description: 'Cockroaches seen in the pantry area, needs pest control.', category: 'sanitation', priority: 'medium', location: 'Block C, Pantry' },
  // Security
  { title: 'Broken lock on storage room', description: 'Storage room lock is broken, anyone can access valuable equipment.', category: 'security', priority: 'high', location: 'Block A, Storage Room' },
  { title: 'Suspicious person near gate', description: 'Unknown person was seen loitering near gate 2 yesterday evening.', category: 'security', priority: 'medium', location: 'Gate 2' },
  { title: 'CCTV camera not working', description: 'Camera CAM-12 in parking is showing black screen since 2 days.', category: 'security', priority: 'high', location: 'Parking Lot West' },
]

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function makeTicketId(): string {
  const year = new Date().getFullYear()
  const num = Math.floor(1000 + Math.random() * 9000)
  return `CMP-${year}-${num}`
}

async function main() {
  console.log('Seeding complaints...')
  // Wipe existing
  await db.activityLog.deleteMany()
  await db.complaint.deleteMany()

  const now = Date.now()
  let created = 0

  for (const c of sampleComplaints) {
    const dept = DEPARTMENTS.find((d) => d.key === c.category)!
    const reporter = pick(reporters)
    // Spread createdAt across last 14 days
    const ageDays = Math.floor(Math.random() * 14)
    const ageHours = Math.floor(Math.random() * 24)
    const createdAt = new Date(now - ageDays * 86400000 - ageHours * 3600000)

    // Decide a realistic status based on age
    let status: string
    let assignedTo: string | null = null
    let resolutionNote: string | null = null
    const r = Math.random()
    if (ageDays >= 7) {
      status = r > 0.2 ? 'resolved' : 'rejected'
      assignedTo = pick(agents)
      resolutionNote =
        status === 'resolved'
          ? 'Issue inspected and fixed. Verified by site visit.'
          : 'Duplicate / not actionable. Please refile with more details.'
    } else if (ageDays >= 3) {
      status = r > 0.4 ? 'in_progress' : 'approved'
      assignedTo = pick(agents)
    } else if (ageDays >= 1) {
      status = r > 0.5 ? 'approved' : 'pending'
      if (status === 'approved') assignedTo = pick(agents)
    } else {
      status = 'pending'
    }

    const complaint = await db.complaint.create({
      data: {
        ticketId: makeTicketId(),
        title: c.title,
        description: c.description,
        category: c.category,
        department: dept.department,
        priority: c.priority,
        status,
        location: c.location,
        reporterName: reporter.name,
        reporterContact: reporter.contact,
        assignedTo,
        resolutionNote,
        createdAt,
        updatedAt: new Date(createdAt.getTime() + Math.random() * 86400000),
      },
    })

    // Activity log entries
    await db.activityLog.create({
      data: {
        complaintId: complaint.id,
        action: 'created',
        by: reporter.name,
        note: 'Complaint submitted by citizen.',
        timestamp: createdAt,
      },
    })
    if (status === 'approved' || status === 'in_progress' || status === 'resolved') {
      await db.activityLog.create({
        data: {
          complaintId: complaint.id,
          action: 'approved',
          by: assignedTo ?? 'System',
          note: 'Complaint approved and assigned to service team.',
          timestamp: new Date(createdAt.getTime() + 3600000),
        },
      })
    }
    if (status === 'in_progress' || status === 'resolved') {
      await db.activityLog.create({
        data: {
          complaintId: complaint.id,
          action: 'started',
          by: assignedTo ?? 'System',
          note: 'Work started by service team.',
          timestamp: new Date(createdAt.getTime() + 7200000),
        },
      })
    }
    if (status === 'resolved') {
      await db.activityLog.create({
        data: {
          complaintId: complaint.id,
          action: 'resolved',
          by: assignedTo ?? 'System',
          note: resolutionNote ?? 'Resolved.',
          timestamp: new Date(createdAt.getTime() + 14400000),
        },
      })
    }
    if (status === 'rejected') {
      await db.activityLog.create({
        data: {
          complaintId: complaint.id,
          action: 'rejected',
          by: assignedTo ?? 'System',
          note: resolutionNote ?? 'Rejected.',
          timestamp: new Date(createdAt.getTime() + 3600000),
        },
      })
    }
    created++
  }

  console.log(`Seeded ${created} complaints with activity logs.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
