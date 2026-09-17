/**
 * Real-time event subscription with automatic transport fallback.
 *
 * Tries WebSocket, then SSE, then plain polling. A transport failure is not an
 * error state for the app - it just degrades to the next option and reports
 * which one is in use so the UI can say so.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { api, streamBase, tokenStore } from './api'

const MAX_EVENTS = 200

export function useStream({ enabled = true, types = null } = {}) {
  const [events, setEvents] = useState([])
  const [transport, setTransport] = useState('connecting')
  const lastIdRef = useRef(0)
  const cleanupRef = useRef(null)

  const push = useCallback(
    (event) => {
      if (!event || event.type === 'heartbeat' || event.type === 'connected') return
      if (types && !types.includes(event.type)) return
      if (event.id) lastIdRef.current = Math.max(lastIdRef.current, event.id)
      setEvents((prev) => [event, ...prev].slice(0, MAX_EVENTS))
    },
    [types],
  )

  useEffect(() => {
    if (!enabled) {
      setTransport('disabled')
      return undefined
    }

    let cancelled = false
    const token = tokenStore.get()
    if (!token) {
      setTransport('unauthenticated')
      return undefined
    }

    const startPolling = () => {
      if (cancelled) return
      setTransport('polling')
      const timer = setInterval(async () => {
        try {
          const data = await api.pollEvents(lastIdRef.current || undefined)
          for (const event of data.events || []) push(event)
        } catch {
          /* keep polling; transient failures are expected */
        }
      }, 4000)
      cleanupRef.current = () => clearInterval(timer)
    }

    const startSse = () => {
      if (cancelled) return
      try {
        const url = `${streamBase()}/api/stream/sse?token=${encodeURIComponent(token)}`
        const source = new EventSource(url)
        let opened = false
        source.onopen = () => {
          opened = true
          setTransport('sse')
        }
        source.onmessage = (message) => {
          try {
            push(JSON.parse(message.data))
          } catch {
            /* ignore malformed frame */
          }
        }
        source.onerror = () => {
          source.close()
          if (!opened) startPolling()
        }
        cleanupRef.current = () => source.close()
      } catch {
        startPolling()
      }
    }

    const startWebSocket = () => {
      try {
        const base = streamBase().replace(/^http/, 'ws')
        const socket = new WebSocket(
          `${base}/api/stream/ws?token=${encodeURIComponent(token)}`,
        )
        let opened = false
        const fallbackTimer = setTimeout(() => {
          if (!opened) {
            try {
              socket.close()
            } catch {
              /* already closed */
            }
            startSse()
          }
        }, 3000)

        socket.onopen = () => {
          opened = true
          clearTimeout(fallbackTimer)
          setTransport('websocket')
        }
        socket.onmessage = (message) => {
          try {
            push(JSON.parse(message.data))
          } catch {
            /* ignore malformed frame */
          }
        }
        socket.onerror = () => {
          clearTimeout(fallbackTimer)
          if (!opened) {
            startSse()
          }
        }
        socket.onclose = () => {
          clearTimeout(fallbackTimer)
          if (!opened) startSse()
        }
        cleanupRef.current = () => {
          clearTimeout(fallbackTimer)
          try {
            socket.close()
          } catch {
            /* already closed */
          }
        }
      } catch {
        startSse()
      }
    }

    // Seed with whatever the ring buffer already holds.
    api
      .pollEvents()
      .then((data) => {
        for (const event of (data.events || []).slice().reverse()) push(event)
      })
      .catch(() => {})
      .finally(() => {
        if (typeof WebSocket !== 'undefined') startWebSocket()
        else if (typeof EventSource !== 'undefined') startSse()
        else startPolling()
      })

    return () => {
      cancelled = true
      if (cleanupRef.current) cleanupRef.current()
      cleanupRef.current = null
    }
  }, [enabled, push])

  return { events, transport, clear: () => setEvents([]) }
}
