export function mapRequestsToLocalhost(
  requestUrl: string,
  port: string | number,
): Response | PromiseLike<Response> {
  const url = new URL(requestUrl)
  url.protocol = 'http:'
  url.host = 'localhost'
  url.port = port.toString()

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
