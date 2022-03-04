/* eslint-disable @typescript-eslint/no-explicit-any */

declare const __CRX_HMR_TIMEOUT__: number

export class HMRPort {
  private port: chrome.runtime.Port | undefined
  private callbacks: Map<string, Set<(event: any) => void>>

  handleDisconnect() {
    if (this.callbacks.has('close'))
      for (const cb of this.callbacks.get('close')!) {
        cb({ wasClean: true })
      }
  }

  handleMessage(message: any) {
    console.log('[crx] port message', JSON.parse(message.data))
    if (this.callbacks.has('message'))
      for (const cb of this.callbacks.get('message')!) {
        cb(message)
      }
  }

  initPort() {
    this.port?.disconnect()
    this.port = chrome.runtime.connect({ name: '@crx/client' })
    this.port.onDisconnect.addListener(this.handleDisconnect.bind(this))
    this.port.onMessage.addListener(this.handleMessage.bind(this))
    this.port.postMessage({ type: 'connected' })
  }

  constructor() {
    this.callbacks = new Map()
    this.initPort()

    /**
     * To keep extension background alive:
     *
     * - Ping service worker every 5 seconds
     * - Re-initialize port every 4 minutes
     */

    setInterval(() => this.port?.postMessage('ping'), __CRX_HMR_TIMEOUT__)
    setInterval(this.initPort, 5 * 60 * 1000)
  }

  addEventListener(
    event: 'message',
    callback: (event: { data: string }) => void,
  ): void
  addEventListener(
    event: 'close',
    callback: (event: { wasClean: boolean }) => void,
  ): void
  addEventListener(event: string, callback: (event: any) => void) {
    const cbs = this.callbacks.get(event) ?? new Set()
    cbs.add(callback)
    this.callbacks.set(event, cbs)
  }

  send(data: string) {
    if (this.port) this.port.postMessage({ data })
    else throw new Error('HMRPort is not initialized')
  }
}
