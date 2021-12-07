// This fixes `self`'s type.
declare const self: ServiceWorkerGlobalScope
export {}

self.skipWaiting()

// TODO: make this configurable
const supported = [
  '.html',
  '.js',
  '.jsx',
  '.mjs',
  '.ts',
  '.tsx',
  '.svelte',
  '.css',
  '.scss',
  '.sass',
]

self.addEventListener('fetch', (fetchEvent) => {
  const url = new URL(fetchEvent.request.url)
  if (
    url.pathname === '/__vite_ping' ||
    url.pathname.startsWith('/@') ||
    supported.some((ext) => url.pathname.endsWith(ext))
  ) {
    fetchEvent.respondWith(mapRequestsToLocalhost(url.href))
  }
})

function mapRequestsToLocalhost(
  requestUrl: string,
): Response | PromiseLike<Response> {
  const url = new URL(requestUrl)
  url.protocol = 'http:'
  url.host = 'localhost'
  url.port = JSON.parse('%VITE_SERVE_PORT%')

  return fetch(url.href).then(async (r) => {
    const body = await r.text()
    return new Response(body, {
      headers: {
        'Content-Type': url.pathname.endsWith('html')
          ? 'text/html'
          : 'text/javascript',
      },
    })
  })
}
