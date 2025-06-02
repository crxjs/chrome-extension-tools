/* eslint-disable @typescript-eslint/no-explicit-any */

import type { HMRPayload } from 'vite'

declare const __HMR_PROTOCOL__: string
declare const __HMR_HOSTNAME__: string
declare const __HMR_PORT__: string
declare const __HMR_TIMEOUT__: number
declare const __HMR_TOKEN__: string

export class HMRWebSocketClient {
  private socket: WebSocket | null = null
  private callbacks = new Map<string, Set<(event: any) => void>>()
  private reconnectTimer: number | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 10
  private reconnectDelay = 1000

  constructor() {
    this.connect()
  }

  private connect = () => {
    try {
      // Use server configuration, then fallback to inference
      const socketProtocol =
        __HMR_PROTOCOL__ || (location.protocol === 'https:' ? 'wss' : 'ws')
      const socketToken = __HMR_TOKEN__
      const socketHost = `${__HMR_HOSTNAME__ || 'localhost'}:${
        __HMR_PORT__ || '5173'
      }`
      const socketUrl = `${socketProtocol}://${socketHost}?token=${socketToken}`

      console.log('[vite] connecting to HMR server at', socketUrl)

      this.socket = new WebSocket(socketUrl, 'vite-hmr')

      this.socket.addEventListener('open', this.handleOpen)
      this.socket.addEventListener('message', this.handleMessage)
      this.socket.addEventListener('close', this.handleClose)
      this.socket.addEventListener('error', this.handleError)
    } catch (error) {
      console.error('[vite] failed to connect to HMR server:', error)
      this.scheduleReconnect()
    }
  }

  private handleOpen = () => {
    console.log('[vite] connected to HMR server')
    this.reconnectAttempts = 0
    this.clearReconnectTimer()

    // Send ping to keep connection alive
    const pingInterval = setInterval(() => {
      if (this.socket?.readyState === WebSocket.OPEN) {
        this.socket.send('ping')
      } else {
        clearInterval(pingInterval)
      }
    }, __HMR_TIMEOUT__ || 30000)
  }

  private handleMessage = (event: MessageEvent) => {
    try {
      const payload: HMRPayload = JSON.parse(event.data)

      // Handle different payload types
      if (payload.type === 'connected') {
        console.log('[vite] HMR connected')
        this.triggerEvent('connected', payload)
      } else if (
        payload.type === 'custom' &&
        payload.event === 'crx:runtime-reload'
      ) {
        console.log('[crx] runtime reload requested')
        // Delay reload to allow background script to restart
        setTimeout(() => location.reload(), 500)
      } else {
        // Forward all other messages to Vite client
        this.triggerEvent('message', { data: event.data })
      }
    } catch (error) {
      console.error('[vite] failed to parse HMR message:', error)
    }
  }

  private handleClose = (event: CloseEvent) => {
    console.log('[vite] HMR connection closed')
    this.triggerEvent('close', event)
    this.scheduleReconnect()
  }

  private handleError = (event: Event) => {
    console.error('[vite] HMR connection error:', event)
    this.triggerEvent('error', event)
  }

  private scheduleReconnect = () => {
    if (this.reconnectTimer !== null) return

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[vite] max reconnection attempts reached, giving up')
      return
    }

    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts),
      30000,
    )

    console.log(`[vite] reconnecting in ${delay}ms...`)
    this.reconnectAttempts++

    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null
      this.connect()
    }, delay)
  }

  private clearReconnectTimer = () => {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }

  private triggerEvent = (event: string, data: any) => {
    const callbacks = this.callbacks.get(event)
    if (callbacks) {
      callbacks.forEach((cb) => cb(data))
    }
  }

  // WebSocket-compatible API
  addEventListener = (event: string, callback: (event: any) => void) => {
    const cbs = this.callbacks.get(event) ?? new Set()
    cbs.add(callback)
    this.callbacks.set(event, cbs)
  }

  removeEventListener = (event: string, callback: (event: any) => void) => {
    const cbs = this.callbacks.get(event)
    if (cbs) {
      cbs.delete(callback)
    }
  }

  send = (data: string) => {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(data)
    } else {
      console.warn('[vite] cannot send message, WebSocket is not open')
    }
  }

  close = () => {
    this.clearReconnectTimer()
    if (this.socket) {
      this.socket.close()
      this.socket = null
    }
  }
}
