import fs from 'fs-extra'
import path from 'pathe'
import { expect, test } from 'vitest'
import { getServiceWorker } from '../helpers'
import { serve } from '../runners'

test('sandbox page loads and runs JavaScript in dev mode', async () => {
  const { browser } = await serve(__dirname)
  const worker = await getServiceWorker(browser, { timeout: 10000 })
  expect(worker).toBeDefined()
  const page = await browser.newPage()
  await page.goto(new URL('src/sandbox.html', worker!.url()).href)
  const button = page.getByRole('button', { name: 'count is: 0', exact: true })

  await button.click({ timeout: 10000 })

  expect(await page.getByRole('button').textContent()).toBe('count is: 1')
})

test('sandbox keeps its isolation and loads local assets in dev mode', async () => {
  const { browser } = await serve(__dirname)
  const worker = await getServiceWorker(browser, { timeout: 10000 })
  expect(worker).toBeDefined()
  const page = await browser.newPage()
  const failedRequests: string[] = []
  page.on('requestfailed', (request) => failedRequests.push(request.url()))
  await page.goto(new URL('src/sandbox.html', worker!.url()).href)
  await page.locator('.App').waitFor()

  expect(await page.evaluate(() => typeof chrome.runtime)).toBe('undefined')
  expect(
    await page
      .locator('.App-logo')
      .evaluate(
        (image: HTMLImageElement) => image.complete && image.naturalWidth > 0,
      ),
  ).toBe(true)
  const favicon = await page.evaluate(async () => {
    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')!
    return (await fetch(link.href)).ok
  })
  expect(favicon).toBe(true)
  expect(failedRequests).toEqual([])
})

test('sandbox preserves component state during hot updates', async () => {
  const { browser } = await serve(__dirname)
  const worker = await getServiceWorker(browser, { timeout: 10000 })
  expect(worker).toBeDefined()
  const page = await browser.newPage()
  await page.goto(new URL('src/sandbox.html', worker!.url()).href)
  await page.getByRole('button', { name: 'count is: 0', exact: true }).click()
  const appPath = path.join(__dirname, 'src/App.jsx')
  const original = await fs.readFile(appPath, 'utf8')
  try {
    await fs.writeFile(
      appPath,
      original.replace('Hello Vite + React!', 'Hello sandbox HMR!'),
    )
    await page
      .getByText('Hello sandbox HMR!', { exact: true })
      .waitFor({ timeout: 10000 })
    expect(await page.getByRole('button').textContent()).toBe('count is: 1')
  } finally {
    await fs.writeFile(appPath, original)
  }
})
