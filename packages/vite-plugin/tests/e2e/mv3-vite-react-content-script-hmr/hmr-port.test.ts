import fs from 'fs-extra'
import path from 'pathe'
import { expect, test } from 'vitest'
import { serve } from '../runners'

const hmrPortProbe = `
import { HMRPort as CrxProbeHMRPort } from '/@crx/client-port'

const crxProbePort = new CrxProbeHMRPort()
let openEvents = 0

function logStatus(label, extra = {}) {
  console.log('[crx-test] ' + label + ' ' + JSON.stringify({
    readyState: crxProbePort.readyState,
    isOpen: crxProbePort.readyState === crxProbePort.OPEN,
    openEvents,
    ...extra,
  }))
}

crxProbePort.addEventListener('open', () => {
  openEvents += 1
  logStatus('open')
})

window.addEventListener('message', (event) => {
  if (event.source !== window || event.data?.type !== 'crx-test-hmr-port') {
    return
  }

  if (event.data.action === 'disconnect-then-send') {
    crxProbePort.port.disconnect()
    crxProbePort.send('{"type":"ping"}')
    setTimeout(() => logStatus('after-disconnect-send'), 0)
  }

  if (event.data.action === 'check-after-delay') {
    setTimeout(() => {
      let sendOk = true
      try {
        crxProbePort.send('{"type":"ping"}')
      } catch (error) {
        sendOk = false
        console.error('[crx-test] send failed after reconnect', error)
      }
      logStatus('after-reconnect', { sendOk })
    }, event.data.delay)
  }
})
`

async function prepareFixture() {
  const src = path.join(__dirname, 'src')
  const src1 = path.join(__dirname, 'src1')

  await fs.remove(src)
  await fs.copy(src1, src, { recursive: true })
  await fs.appendFile(path.join(src, 'main.jsx'), hmrPortProbe)
}

async function withReconnectInterval<T>(
  interval: number,
  fn: () => Promise<T>,
): Promise<T> {
  const previous = process.env.CRX_TEST_HMR_RECONNECT_INTERVAL
  process.env.CRX_TEST_HMR_RECONNECT_INTERVAL = `${interval}`

  try {
    return await fn()
  } finally {
    if (typeof previous === 'undefined') {
      delete process.env.CRX_TEST_HMR_RECONNECT_INTERVAL
    } else {
      process.env.CRX_TEST_HMR_RECONNECT_INTERVAL = previous
    }
  }
}

function getStatus(messages: string[], label: string) {
  const prefix = `[crx-test] ${label} `
  const message = [...messages]
    .reverse()
    .find((text) => text.startsWith(prefix))
  if (!message) throw new Error(`Missing ${label} status`)
  return JSON.parse(message.slice(prefix.length)) as {
    readyState: number
    isOpen: boolean
    openEvents: number
    sendOk?: boolean
  }
}

test('HMRPort logs postMessage failures instead of throwing page errors', async () => {
  await prepareFixture()

  const { browser } = await serve(__dirname)
  const page = await browser.newPage()
  const pageErrors: string[] = []
  const consoleMessages: string[] = []

  page.on('pageerror', (error) => pageErrors.push(error.message))
  page.on('console', (message) => consoleMessages.push(message.text()))

  await page.goto('https://example.com')
  await page.locator('.App').waitFor()

  await page.evaluate(() => {
    window.postMessage(
      { type: 'crx-test-hmr-port', action: 'disconnect-then-send' },
      '*',
    )
  })
  await new Promise((resolve) => setTimeout(resolve, 500))

  expect(pageErrors).toEqual([])
  expect(
    consoleMessages.some(
      (message) =>
        message.includes('[crx] HMR runtime port postMessage failed') &&
        message.includes('Attempting to use a disconnected port object'),
    ),
  ).toBe(true)

  const status = getStatus(consoleMessages, 'after-disconnect-send')
  expect(status.isOpen).toBe(false)
})

test('HMRPort reconnect interval restores an open runtime port after dev server disconnect', async () => {
  await prepareFixture()

  const { browser, devServer } = await withReconnectInterval(100, () =>
    serve(__dirname),
  )
  const page = await browser.newPage()
  const pageErrors: string[] = []
  const consoleMessages: string[] = []

  page.on('pageerror', (error) => pageErrors.push(error.message))
  page.on('console', (message) => consoleMessages.push(message.text()))

  await page.goto('https://example.com')
  await page.locator('.App').waitFor()

  await devServer.close()
  await page.evaluate(() => {
    window.postMessage(
      { type: 'crx-test-hmr-port', action: 'check-after-delay', delay: 350 },
      '*',
    )
  })
  await new Promise((resolve) => setTimeout(resolve, 700))

  expect(pageErrors).toEqual([])

  const status = getStatus(consoleMessages, 'after-reconnect')
  expect(status.isOpen).toBe(true)
  expect(status.openEvents).toBeGreaterThan(1)
  expect(status.sendOk).toBe(true)
})
