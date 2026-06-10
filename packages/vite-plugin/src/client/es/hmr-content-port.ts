/* eslint-disable @typescript-eslint/no-explicit-any */

import type { CrxHMRPayload } from 'src/types'
import type { HMRPayload } from 'vite'

declare const __CRX_HMR_TIMEOUT__: number
declare const __CRX_HMR_RECONNECT_INTERVAL__: number
declare const __CRX_LIVE_RELOAD__: boolean

function isCrxHMRPayload(x: HMRPayload): x is CrxHMRPayload {
  return x.type === 'custom' && x.event.startsWith('crx:')
}

function isExtensionContextInvalidated(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message.includes('Extension context invalidated.')
  )
}

type PortMessage = { data: string } | { type: string }

export class HMRPort {
  readonly CONNECTING = 0
  readonly OPEN = 1
  readonly CLOSING = 2
  readonly CLOSED = 3

  readyState = this.CONNECTING

  private port: chrome.runtime.Port | undefined
  private callbacks = new Map<string, Set<(event: any) => void>>()

  constructor() {
    /**
     * To keep extension background alive:
     *
     * - Ping service worker on a configured interval (5 seconds by default)
     * - Re-initialize port on a configured interval (5 minutes by default)
     */
    setInterval(() => this.postMessage({ data: 'ping' }), __CRX_HMR_TIMEOUT__)
    setInterval(this.initPort, __CRX_HMR_RECONNECT_INTERVAL__)
    this.initPort()
  }

  initPort = () => {
    if (this.port) {
      this.readyState = this.CLOSING
      this.port.disconnect()
    }

    this.readyState = this.CONNECTING
    const port = chrome.runtime.connect({ name: '@crx/client' })
    this.port = port
    port.onDisconnect.addListener(this.handleDisconnect.bind(this, port))
    port.onMessage.addListener(this.handleMessage.bind(this))
    this.readyState = this.OPEN
    setTimeout(() => {
      if (this.port === port && this.readyState === this.OPEN) {
        this.dispatchEvent('open', {})
      }
    }, 0)
    this.postMessage({ type: 'connected' })
  }

  handleDisconnect = (port: chrome.runtime.Port) => {
    if (port !== this.port) return
    this.closePort(true)
  }

  handleMessage = (message: any) => {
    const forward = (data: string) => {
      if (this.callbacks.has('message'))
        for (const cb of this.callbacks.get('message')!) {
          cb({ data })
        }
    }

    const payload: HMRPayload | CrxHMRPayload = JSON.parse(message.data)
    if (isCrxHMRPayload(payload)) {
      if (payload.event === 'crx:runtime-reload') {
        if (__CRX_LIVE_RELOAD__) {
          // delayed page reload; let background finish restart
          console.log('[crx] runtime reload')
          setTimeout(() => location.reload(), 500)
        } else {
          console.log('[crx] runtime reload suppressed (liveReload disabled)')
        }
      } else {
        // unpack hmr payloads; forward to vite client
        // console.log('[crx] content payload', payload)
        forward(JSON.stringify(payload.data))
      }
    } else {
      // forward things like connected messages
      // console.log('[crx] forwarding', message)
      forward(message.data)
    }
  }

  addEventListener = (
    event: string,
    callback: (event: any) => void,
    options?: { once?: boolean } | boolean,
  ) => {
    const cbs = this.callbacks.get(event) ?? new Set()
    const cb =
      typeof options === 'object' && options.once
        ? (event: any) => {
            cbs.delete(cb)
            callback(event)
          }
        : callback
    cbs.add(cb)
    this.callbacks.set(event, cbs)
  }

  dispatchEvent = (event: string, payload: any) => {
    if (this.callbacks.has(event))
      for (const cb of this.callbacks.get(event)!) {
        cb(payload)
      }
  }

  closePort = (wasClean: boolean) => {
    if (this.readyState === this.CLOSED) return
    this.port = undefined
    this.readyState = this.CLOSED
    this.dispatchEvent('close', { wasClean })
  }

  postMessage = (message: PortMessage) => {
    if (this.readyState !== this.OPEN || !this.port) return false

    try {
      this.port.postMessage(message)
      return true
    } catch (error) {
      console.error('[crx] HMR runtime port postMessage failed', error)
      this.closePort(false)
      if (isExtensionContextInvalidated(error)) {
        // TODO: hook into error overlay?
        location.reload()
      }
      return false
    }
  }

  send = (data: string) => {
    this.postMessage({ data })
  }
}
