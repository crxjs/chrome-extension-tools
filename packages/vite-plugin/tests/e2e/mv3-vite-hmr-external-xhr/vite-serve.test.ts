import { createServer } from 'node:http'
import { AddressInfo } from 'node:net'
import { expect, test } from 'vitest'
import { getPage } from '../helpers'
import { serve } from '../runners'

test(
  'crx runs from server output',
  async () => {
    let requests = 0
    const api = createServer((_req, res) => {
      requests++
      res.writeHead(200, {
        'Content-Type': 'text/plain',
        'Access-Control-Allow-Origin': '*',
      })
      res.end('ok')
    })
    await new Promise<void>((resolve) => api.listen(0, '127.0.0.1', resolve))
    const previous = process.env.CRX_TEST_API_URL
    process.env.CRX_TEST_API_URL = `http://127.0.0.1:${
      (api.address() as AddressInfo).port
    }/`
    try {
      const { browser } = await serve(__dirname)

      const page = await getPage(browser, 'chrome-extension')

      try {
        await page.waitForSelector('text=external XHR: Yes', { timeout: 5000 })
      } catch {
        await page.reload()
        await page.waitForSelector('text=external XHR: Yes', { timeout: 5000 })
      }
      expect(requests).toBeGreaterThan(0)
    } finally {
      if (previous === undefined) delete process.env.CRX_TEST_API_URL
      else process.env.CRX_TEST_API_URL = previous
      await new Promise<void>((resolve, reject) =>
        api.close((error) => (error ? reject(error) : resolve())),
      )
    }
  },
  { retry: process.env.CI ? 5 : 0 },
)
