'use client'

import { useEffect, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'
import type { RealtimeEvent } from '@/lib/complaint-types'

interface UseComplaintSocketOptions {
  channels: string[]
  onNew?: (e: RealtimeEvent) => void
  onUpdate?: (e: RealtimeEvent) => void
  enabled?: boolean
}

/**
 * Connects to the complaint-realtime socket.io mini-service (port 3003 via Caddy gateway)
 * and subscribes to the given channels. Channels: 'admin', 'citizen', 'dept:<category>'.
 */
export function useComplaintSocket({
  channels,
  onNew,
  onUpdate,
  enabled = true,
}: UseComplaintSocketOptions) {
  const [isConnected, setIsConnected] = useState(false)
  const socketRef = useRef<Socket | null>(null)
  // Keep latest callbacks without re-subscribing
  const cbRef = useRef({ onNew, onUpdate })
  useEffect(() => {
    cbRef.current = { onNew, onUpdate }
  }, [onNew, onUpdate])

  // Stable channel list
  const channelsKey = channels.slice().sort().join(',')

  useEffect(() => {
    if (!enabled) return
    const socket = io('/?XTransformPort=3003', {
      transports: ['websocket', 'polling'],
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1500,
      timeout: 10000,
    })
    socketRef.current = socket

    const chList = channelsKey.split(',').filter(Boolean)

    socket.on('connect', () => {
      setIsConnected(true)
      socket.emit('subscribe', { channels: chList })
    })
    socket.on('disconnect', () => setIsConnected(false))
    socket.io.on('reconnect', () => {
      setIsConnected(true)
      socket.emit('subscribe', { channels: chList })
    })

    socket.on('complaint:new', (e: RealtimeEvent) => cbRef.current.onNew?.(e))
    socket.on('complaint:update', (e: RealtimeEvent) => cbRef.current.onUpdate?.(e))

    return () => {
      socket.emit('unsubscribe', { channels: chList })
      socket.disconnect()
      socketRef.current = null
      setIsConnected(false)
    }
  }, [channelsKey, enabled])

  return { isConnected }
}
