import { expect, test } from 'vitest'
import { serve } from '../runners'

test(
  'favicon URLs work in content script and popup in serve mode',
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
    expect(githubSrc).toMatch(
      /chrome-extension:\/\/.*\/_favicon\/\?pageUrl=https%3A%2F%2Fgithub\.com&size=32/,
    )

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
