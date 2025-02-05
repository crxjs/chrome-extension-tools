/* eslint-disable @typescript-eslint/no-unused-vars */

// This fixes `self`'s type.
declare const self: ServiceWorkerGlobalScope
export {}

import type { CrxHMRPayload } from 'src/types'
import type { HMRPayload } from 'vite'

// injected by the hmr plugin when served
declare const __BASE__: string
declare const __HMR_PROTOCOL__: string
declare const __HMR_HOSTNAME__: string
declare const __HMR_PORT__: string
declare const __HMR_TIMEOUT__: number
declare const __SERVER_PORT__: string

/* -------- REDIRECT FETCH TO THE DEV SERVER ------- */

const ownOrigin = `chrome-extension://${chrome.runtime.id}`;
self.addEventListener('fetch', (fetchEvent) => {
  const url = new URL(fetchEvent.request.url)
  if (url.origin === ownOrigin) {
    fetchEvent.respondWith(sendToServer(fetchEvent.request))
  }
})

/**
 * Sending extension page requests to the dev server via fetch handler.
 *
 * HMR requires fetching extension page code from the dev server, but the
 * default extension CSP does not allow remote code. We should be able to relax
 * the extension CSP, but Chromium currently ignores custom CSP's:
 * https://bugs.chromium.org/p/chromium/issues/detail?id=1247690#c_ts1631117342
 */
async function sendToServer(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const requestHeaders = new Headers(req.headers);

  // change the url to point to the dev server
  url.protocol = 'http:'
  url.host = 'localhost'
  url.port = __SERVER_PORT__
  // add a timestamp to force Chrome to do a new request
  url.searchParams.set('t', Date.now().toString())
  // URLSearchParams adds "=" to every empty param & vite doesn't like it
  const response = await fetch(url.href.replace(/=$|=(?=&)/g, ''),{
    headers: requestHeaders,
  });


  const responseHeaders = new Headers(response.headers);
  responseHeaders.set('Content-Type', responseHeaders.get('Content-Type') ?? 'text/javascript');
  responseHeaders.set('Cache-Control', responseHeaders.get('Cache-Control') ?? '');


  // circumvent extension CSP by creating response from extension origin
  return new Response(response.body, {
    headers: responseHeaders,
  })
}

/* ----------- CONNECT TO CONTENT SCRIPTS ---------- */

const ports = new Set<chrome.runtime.Port>()

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === '@crx/client') {
    ports.add(port)
    port.onDisconnect.addListener((port) => ports.delete(port))
    port.onMessage.addListener((message: string) => {
      // console.log(
      //   `${JSON.stringify(message, null, 2)} from ${port.sender?.origin}`,
      // )
    })
    port.postMessage({ data: JSON.stringify({ type: 'connected' }) })
  }
})

function notifyContentScripts(payload: HMRPayload) {
  const data = JSON.stringify(payload)
  for (const port of ports) port.postMessage({ data })
}

/* ----------- CONNECT TO VITE DEV SERVER ---------- */

console.log('[vite] connecting...')

// use server configuration, then fallback to inference
const socketProtocol =
  __HMR_PROTOCOL__ || (location.protocol === 'https:' ? 'wss' : 'ws')
const socketHost = `${__HMR_HOSTNAME__ || location.hostname}:${__HMR_PORT__}`
const socket = new WebSocket(`${socketProtocol}://${socketHost}`, 'vite-hmr')
const base = __BASE__ || '/'

// Listen for messages
socket.addEventListener('message', async ({ data }) => {
  handleSocketMessage(JSON.parse(data))
})

function isCrxHmrPayload(x: HMRPayload): x is CrxHMRPayload {
  return x.type === 'custom' && x.event.startsWith('crx:')
}

function handleSocketMessage(payload: HMRPayload) {
  if (isCrxHmrPayload(payload)) {
    handleCrxHmrPayload(payload)
  } else if (payload.type === 'connected') {
    console.log(`[vite] connected.`)
    // proxy(nginx, docker) hmr ws maybe caused timeout,
    // so send ping package let ws keep alive.
    const interval = setInterval(() => socket.send('ping'), __HMR_TIMEOUT__)
    socket.addEventListener('close', () => clearInterval(interval))
  }
}

function handleCrxHmrPayload(payload: CrxHMRPayload) {
  // everything goes to the content scripts
  notifyContentScripts(payload)

  switch (payload.event) {
    case 'crx:runtime-reload':
      // immediate runtime reload
      console.log('[crx] runtime reload')
      chrome.runtime.reload()
      break

    default:
      break
  }
}

async function waitForSuccessfulPing(ms = 1000) {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      await fetch(`${base}__vite_ping`)
      break
    } catch (e) {
      await new Promise((resolve) => setTimeout(resolve, ms))
    }
  }
}

// ping server
socket.addEventListener('close', async ({ wasClean }) => {
  if (wasClean) return
  console.log(`[vite] server connection lost. polling for restart...`)
  await waitForSuccessfulPing()
  handleCrxHmrPayload({
    type: 'custom',
    event: 'crx:runtime-reload',
  })
})
