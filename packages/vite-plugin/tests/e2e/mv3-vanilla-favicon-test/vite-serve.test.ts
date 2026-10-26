import { expect, test } from 'vitest'
import { serve } from '../runners'

// Firefox has no Chrome /_favicon/ endpoint or favicon permission.
// https://bugzilla.mozilla.org/show_bug.cgi?id=1315616
test.skipIf(process.env.E2E_BROWSER === 'firefox')(
  'favicon URLs work in content scripts in serve mode',
  async () => {
    const { browser } = await serve(__dirname)

    const contentPage = await browser.newPage()
    await contentPage.goto('https://example.com')

    await contentPage.waitForSelector('#favicon-test-container', {
      timeout: 10000,
    })

    const githubFavicon = contentPage.locator('.favicon-test-github')
    await githubFavicon.waitFor({ timeout: 5000 })

    const githubSrc = await githubFavicon.getAttribute('src')
    const faviconUrl = new URL(githubSrc!)
    expect(faviconUrl.protocol).toBe(
      process.env.E2E_BROWSER === 'firefox'
        ? 'moz-extension:'
        : 'chrome-extension:',
    )
    expect(faviconUrl.pathname).toBe('/_favicon/')
    expect(faviconUrl.searchParams.get('pageUrl')).toBe('https://github.com')
    expect(faviconUrl.searchParams.get('size')).toBe('32')

    // Test if the image really loaded without errors
    const imageLoadedSuccessfully = await githubFavicon.evaluate(
      (img: HTMLImageElement) => {
        return new Promise((resolve) => {
          if (img.complete && img.naturalWidth > 0) {
            // Image is already loaded
            resolve(true)
          } else {
            // Wait for image to load
            img.onload = () => resolve(true)
            img.onerror = () => resolve(false)
            // Set a timeout in case the image never loads
            setTimeout(() => resolve(false), 5000)
          }
        })
      },
    )

    expect(imageLoadedSuccessfully).toBe(true)
  },
  {
    retry: process.env.CI ? 5 : 0,
  },
)
