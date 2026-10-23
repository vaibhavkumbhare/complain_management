// Server-side helper to push realtime events to the socket.io mini-service.
// Uses fetch to the internal HTTP push endpoint on port 3003.
// In the browser/gateway context this is unreachable, so only call from API routes.

import type { CategoryKey } from '@/lib/complaint-config'

const REALTIME_PUSH_PORT = 3004

interface PushPayload {
  channels: string[]
  event: string
  data: unknown
}

/**
 * Push a realtime event to the complaint-realtime mini-service.
 * Called from Next.js API routes after a DB mutation.
 * Safe to fail: realtime is best-effort.
 */
export async function pushRealtime(channels: string[], event: string, data: unknown) {
  try {
    const payload: PushPayload = { channels, event, data }
    // Internal call to the mini-service. Use 127.0.0.1 directly (server-side only).
    await fetch(`http://127.0.0.1:${REALTIME_PUSH_PORT}/__push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch (e) {
    // Non-fatal: realtime is best-effort
    console.warn('[realtime] push failed:', (e as Error).message)
  }
}

/** Channels relevant to a complaint event */
export function channelsForComplaint(department: CategoryKey | string): string[] {
  return ['admin', 'citizen', `dept:${department}`]
}
