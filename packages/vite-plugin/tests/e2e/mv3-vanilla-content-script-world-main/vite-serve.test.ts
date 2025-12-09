import { expect, test } from 'vitest'
import { serve } from '../runners'

test(
  'content script with world MAIN runs in page context',
  async () => {
    const { browser } = await serve(__dirname)

    const page = await browser.newPage()
    await page.goto('https://example.com')

    // Wait for the content script to load and create the test container
    await page.waitForSelector('#world-main-test-container', {
      timeout: 10000,
    })

    const testContainer = page.locator('#world-main-test-container')
    await testContainer.waitFor({ timeout: 5000 })

    // Verify the container has the correct text
    const containerText = await testContainer.textContent()
    expect(containerText).toBe('Content Script World: MAIN')

    // Verify the container has the correct styles
    const bgColor = await testContainer.evaluate((el: HTMLElement) => {
      return window.getComputedStyle(el).backgroundColor
    })
    expect(bgColor).toMatch(/lime|rgb\(0,\s*255,\s*0\)/)

    // Verify that the script set a global variable (proving it runs in MAIN world)
    const globalVar = await page.evaluate(() => {
      return (window as any).testWorldMain
    })
    expect(globalVar).toBe('running in MAIN world')

    console.log('✓ Content script with world MAIN verified successfully')
  },
  {
    retry: process.env.CI ? 5 : 0,
  },
)
