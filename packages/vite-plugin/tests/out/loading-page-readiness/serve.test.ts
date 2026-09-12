import { request } from 'http'
import { serve } from 'tests/runners'
import { testOutput } from 'tests/testOutput'
import { afterAll, expect, test } from 'vitest'

let result: Awaited<ReturnType<typeof serve>> | undefined

afterAll(async () => {
  try {
    await result?.server.close()
  } catch (error) {}
})

function getResponse(
  port: number,
  path: string,
): Promise<{ status: number; headers: Record<string, string | string[]> }> {
  return new Promise((resolve, reject) => {
    const req = request(
      {
        hostname: 'localhost',
        method: 'GET',
        path,
        port,
      },
      (res) => {
        res.resume()
        res.on('end', () =>
          resolve({
            status: res.statusCode ?? 0,
            headers: res.headers as Record<string, string | string[]>,
          }),
        )
      },
    )
    req.on('error', reject)
    req.end()
  })
}

test('serve loading page waits for the requested extension html', async () => {
  result = await serve(__dirname)

  const port = result.config.server.port
  if (typeof port !== 'number') throw new TypeError('server port is undefined')

  const readyPath = '/@crx/dev-ready'
  const popupPath = encodeURIComponent('/src/popup.html?page=default')
  const rootPath = encodeURIComponent('/')
  const missingPath = encodeURIComponent('/missing.html')

  await expect(
    getResponse(port, `${readyPath}?path=${popupPath}`),
  ).resolves.toMatchObject({
    status: 204,
    headers: { 'access-control-allow-origin': '*' },
  })
  await expect(
    getResponse(port, `${readyPath}?path=${rootPath}`),
  ).resolves.toMatchObject({
    status: 404,
    headers: { 'access-control-allow-origin': '*' },
  })
  await expect(
    getResponse(port, `${readyPath}?path=${missingPath}`),
  ).resolves.toMatchObject({
    status: 404,
    headers: { 'access-control-allow-origin': '*' },
  })

  await testOutput(
    result,
    new Map([
      [
        /assets\/loading-page\..+\.js/,
        (source, name) => {
          expect(source).toContain('/@crx/dev-ready')
          expect(source).toContain('location.pathname + location.search')
          expect(source).toContain('RELOAD_DELAY = 100')
          expect(source).toContain('Reloading in')
          expect({
            usesCurrentPage: source.includes(
              'location.pathname + location.search',
            ),
            usesReadyEndpoint: source.includes('/@crx/dev-ready'),
            rejectsHttpErrors: source.includes('!response.ok'),
            throttlesReloads: source.includes('RELOAD_DELAY = 100'),
          }).toMatchSnapshot(name)
        },
      ],
    ]),
  )
})
