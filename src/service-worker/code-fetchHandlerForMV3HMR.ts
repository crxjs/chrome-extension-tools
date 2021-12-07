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
  const { pathname, href } = new URL(fetchEvent.request.url)
  if (
    pathname === '/__vite_ping' ||
    pathname.startsWith('/@') ||
    supported.some((ext) => pathname.endsWith(ext))
  ) {
    fetchEvent.respondWith(mapRequestsToLocalhost(href))
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
