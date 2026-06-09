/* eslint-disable @typescript-eslint/no-explicit-any */

import type { CrxHMRPayload } from 'src/types'
import type { HMRPayload } from 'vite'

declare const __CRX_HMR_TIMEOUT__: number
declare const __CRX_LIVE_RELOAD__: boolean
declare const __CRX_HMR_TOKEN__: string

const crxClientPortName = `@crx/client:${__CRX_HMR_TOKEN__}`

function isCrxHMRPayload(x: HMRPayload): x is CrxHMRPayload {
  return x.type === 'custom' && x.event.startsWith('crx:')
}

function getRuntime() {
  return typeof chrome === 'undefined' ? undefined : chrome.runtime
}

function getExtensionId() {
  return new URL(import.meta.url).host
}

function hasOwnExtensionRuntime(
  runtime: typeof chrome.runtime,
  extensionId: string,
) {
  try {
    return new URL(runtime.getURL('')).host === extensionId
  } catch {
    return false
  }
}

export class HMRPort {
  private port: chrome.runtime.Port | undefined
  private callbacks = new Map<string, Set<(event: any) => void>>()

  constructor() {
    /**
     * To keep extension background alive:
     *
     * - Ping service worker every 5 seconds
     * - Re-initialize port every 5 minutes
     */
    setInterval(() => {
      try {
        this.port?.postMessage({ data: 'ping' })
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes('Extension context invalidated.')
        ) {
          // TODO: hook into error overlay?
          location.reload()
        } else throw error
      }
    }, __CRX_HMR_TIMEOUT__)
    setInterval(this.initPort, 5 * 60 * 1000)
    this.initPort()
  }

  initPort = () => {
    const runtime = getRuntime()
    if (!runtime) throw new Error('[crx] chrome.runtime is not available')

    const extensionId = getExtensionId()
    const connectInfo = { name: crxClientPortName }

    this.port?.disconnect()
    this.port = hasOwnExtensionRuntime(runtime, extensionId)
      ? runtime.connect(connectInfo)
      : runtime.connect(extensionId, connectInfo)
    this.port.onDisconnect.addListener(this.handleDisconnect.bind(this))
    this.port.onMessage.addListener(this.handleMessage.bind(this))
    this.port.postMessage({ type: 'connected' })
  }

  handleDisconnect = () => {
    if (this.callbacks.has('close'))
      for (const cb of this.callbacks.get('close')!) {
        cb({ wasClean: true })
      }
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

  addEventListener = (event: string, callback: (event: any) => void) => {
    const cbs = this.callbacks.get(event) ?? new Set()
    cbs.add(callback)
    this.callbacks.set(event, cbs)
  }

  send = (data: string) => {
    if (this.port) this.port.postMessage({ data })
    else throw new Error('HMRPort is not initialized')
  }
}
