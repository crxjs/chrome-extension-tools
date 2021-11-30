import {
  registerInlineScript,
  waitForInlineScripts,
} from './handleInlineScripts'
import { mapRequestsToLocalhost } from './mapRequestsToLocalhost'

const localhostPort = JSON.parse('%VITE_SERVE_PORT%')

// This fixes `self`'s type.
declare const self: ServiceWorkerGlobalScope

self.skipWaiting()

self.addEventListener('fetch', (fetchEvent) => {
  const url = new URL(fetchEvent.request.url)

  // TODO: support served html files
  if (url.pathname.endsWith('.html')) return

  // TODO: verify that all top level script requests are run before responses start coming in
  const inlineId = url.searchParams.get('inline')
  if (inlineId) registerInlineScript(inlineId)

  const delayId = url.searchParams.get('delay')
  const delay = delayId
    ? waitForInlineScripts(delayId)
    : Promise.resolve()

  fetchEvent.respondWith(
    (async () => {
      // Point all HTTP requests except HTML to localhost
      const response = await mapRequestsToLocalhost(
        url.href,
        localhostPort,
      )
      // Wait until converted inline scripts have loaded
      // MV3 doesn't allow inline scripts
      await delay
      return response
    })(),
  )
})
