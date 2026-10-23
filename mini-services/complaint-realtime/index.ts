import { createServer } from 'http'
import { Server } from 'socket.io'

// ---- Socket.IO server (port 3003) ----
// Exposed to the browser via Caddy gateway using path "/" + ?XTransformPort=3003
const httpServer = createServer()
const io = new Server(httpServer, {
  // DO NOT change the path, it is used by Caddy to forward the request to the correct port
  path: '/',
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
})

const roomCounts = new Map<string, number>()

io.on('connection', (socket) => {
  console.log(`[realtime] client connected: ${socket.id}`)

  socket.on('subscribe', (payload: { channels: string[] }) => {
    const channels = Array.isArray(payload?.channels) ? payload.channels : []
    channels.forEach((ch) => {
      socket.join(`channel:${ch}`)
      roomCounts.set(`channel:${ch}`, (roomCounts.get(`channel:${ch}`) ?? 0) + 1)
    })
  })

  socket.on('unsubscribe', (payload: { channels: string[] }) => {
    const channels = Array.isArray(payload?.channels) ? payload.channels : []
    channels.forEach((ch) => {
      socket.leave(`channel:${ch}`)
      const n = (roomCounts.get(`channel:${ch}`) ?? 0) - 1
      if (n <= 0) roomCounts.delete(`channel:${ch}`)
      else roomCounts.set(`channel:${ch}`, n)
    })
  })

  socket.on('disconnect', () => {
    console.log(`[realtime] client disconnected: ${socket.id}`)
  })

  socket.on('error', (err) => {
    console.error(`[realtime] socket error (${socket.id}):`, err)
  })
})

const PORT = 3003
httpServer.listen(PORT, () => {
  console.log(`[complaint-realtime] socket.io server running on port ${PORT}`)
})

// ---- Internal push HTTP server (port 3004) ----
// Only reachable from localhost (Next.js API routes). Not exposed via Caddy.
// The API routes POST here to fan out events to subscribed clients.
const pushServer = createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/__push') {
    let body = ''
    req.on('data', (chunk) => (body += chunk))
    req.on('end', () => {
      try {
        const payload = JSON.parse(body) as { channels: string[]; event: string; data: unknown }
        const channels = Array.isArray(payload.channels) ? payload.channels : []
        const allChannels = new Set<string>(channels)
        // Always fan out to admin + citizen so those dashboards stay live
        allChannels.add('admin')
        allChannels.add('citizen')
        allChannels.forEach((ch) => {
          io.to(`channel:${ch}`).emit(payload.event, payload.data)
        })
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true, fanned: allChannels.size }))
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: false, error: (e as Error).message }))
      }
    })
  } else if (req.method === 'GET' && req.url === '/__health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(
      JSON.stringify({
        ok: true,
        connections: io.engine.clientsCount,
        rooms: Object.fromEntries(roomCounts),
      })
    )
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: false, error: 'not found' }))
  }
})

const PUSH_PORT = 3004
pushServer.listen(PUSH_PORT, '127.0.0.1', () => {
  console.log(`[complaint-realtime] internal push server on 127.0.0.1:${PUSH_PORT}`)
})

process.on('SIGTERM', () => {
  console.log('[realtime] SIGTERM, shutting down...')
  httpServer.close(() => process.exit(0))
  pushServer.close()
})
process.on('SIGINT', () => {
  console.log('[realtime] SIGINT, shutting down...')
  httpServer.close(() => process.exit(0))
  pushServer.close()
})
