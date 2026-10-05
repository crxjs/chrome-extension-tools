import { expect, test } from 'vitest'
import { getServiceWorker } from '../helpers'
import { build, serve } from '../runners'

test.each(['serve', 'build'] as const)(
  'Chrome handles popup favicons in %s mode',
  async (mode) => {
    const result = await (mode === 'serve'
      ? serve(__dirname)
      : build(__dirname))
    const { browser } = result
    const faviconRequests: string[] = []
    if ('devServer' in result) {
      result.devServer.httpServer!.prependListener('request', (req) => {
        if (
          req.url &&
          new URL(req.url, 'http://localhost').pathname === '/_favicon/'
        ) {
          faviconRequests.push(req.url)
        }
      })
    }

    const worker = await getServiceWorker(browser, { timeout: 10000 })
    expect(worker).toBeDefined()
    const popup = await browser.newPage()
    await popup.goto(new URL('popup.html', worker!.url()).href)

    const favicon = popup.locator('#favicon')
    await favicon.waitFor()
    // Dynamic resource URLs use another host and bypass the worker's origin guard.
    const faviconUrl = new URL((await favicon.getAttribute('src'))!)
    expect(faviconUrl.hostname).toBe(new URL(popup.url()).hostname)
    expect(faviconUrl.pathname).toBe('/_favicon/')
    const imageLoaded = await favicon.evaluate((img: HTMLImageElement) => {
      if (img.complete) return img.naturalWidth > 0
      return new Promise<boolean>((resolve) => {
        img.onload = () => resolve(img.naturalWidth > 0)
        img.onerror = () => resolve(false)
        setTimeout(() => resolve(false), 5000)
      })
    })

    if (mode === 'serve') expect(faviconRequests).toEqual([])
    expect(imageLoaded).toBe(true)
  },
)
