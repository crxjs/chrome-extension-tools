import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { once } from 'node:events'
import { mkdtemp, mkdir, open, readFile, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { Builder, By, until } from 'selenium-webdriver'
import firefox from 'selenium-webdriver/firefox.js'
import { build, version as viteVersion } from 'vite'
import { crx } from '../../dist/index.mjs'

const directory = path.dirname(fileURLToPath(import.meta.url))
const fixture = path.join(directory, 'fixture')
const artifacts = path.join(directory, 'artifacts')

test(
  'Firefox loads a production extension with background, popup and content scripts',
  { timeout: 120_000 },
  async (t) => {
    const outDir = await mkdtemp(path.join(tmpdir(), 'crxjs-firefox-'))
    const server = createServer((_request, response) => {
      response.writeHead(200, { 'Content-Type': 'text/html' })
      response.end(
        '<!doctype html><html><body>Firefox content-script host</body></html>',
      )
    })
    let driver
    let driverLog
    t.after(async () => {
      try {
        await driver?.quit()
      } finally {
        await driverLog?.close()
        server.closeAllConnections()
        if (server.listening)
          await new Promise((resolve) => server.close(resolve))
        await rm(outDir, { recursive: true, force: true })
      }
    })

    try {
      await rm(artifacts, { recursive: true, force: true })
      const manifest = JSON.parse(
        await readFile(path.join(fixture, 'manifest.json'), 'utf8'),
      )
      await build({
        root: fixture,
        configFile: false,
        plugins: [crx({ manifest, browser: 'firefox' })],
        build: { outDir, emptyOutDir: true },
      })
      const output = JSON.parse(
        await readFile(path.join(outDir, 'manifest.json'), 'utf8'),
      )
      assert.equal(output.background.service_worker, undefined)
      assert.equal(output.background.type, 'module')
      assert.equal(output.background.scripts.length, 1)

      const extensionId = manifest.browser_specific_settings.gecko.id
      const extensionUuid = randomUUID()
      const options = new firefox.Options()
        .addArguments('-headless')
        .setPreference(
          'extensions.webextensions.uuids',
          JSON.stringify({ [extensionId]: extensionUuid }),
        )
      if (process.env.FIREFOX_BINARY)
        options.setBinary(process.env.FIREFOX_BINARY)
      // Firefox 153+ requires this opt-in to navigate to moz-extension pages.
      // Only the isolated test browser receives elevated WebDriver access.
      const service = new firefox.ServiceBuilder(
        process.env.GECKODRIVER,
      ).addArguments('--allow-system-access')
      await mkdir(artifacts, { recursive: true })
      driverLog = await open(path.join(artifacts, 'geckodriver.log'), 'w')
      service.setStdio(['ignore', driverLog.fd, driverLog.fd])
      driver = await new Builder()
        .forBrowser('firefox')
        .setFirefoxOptions(options)
        .setFirefoxService(service)
        .build()
      const capabilities = await driver.getCapabilities()
      t.diagnostic(
        `Firefox ${capabilities.get('browserVersion')}; Vite ${viteVersion}`,
      )
      await driver.manage().setTimeouts({ pageLoad: 20_000, script: 10_000 })
      const extension = await driver.installWebExtension(outDir, {
        permanent: false,
      })
      assert.equal(extension.id, extensionId)

      await driver.get(
        `moz-extension://${extensionUuid}/${output.action.default_popup}`,
      )
      const result = await driver.wait(
        until.elementLocated(By.id('result')),
        15_000,
      )
      await driver.wait(
        until.elementTextIs(result, '42:popup'),
        15_000,
        'Popup did not receive the background response and stored value',
      )

      server.listen(0, '127.0.0.1')
      await once(server, 'listening')
      await driver.get(`http://127.0.0.1:${server.address().port}/`)
      await driver.wait(
        async () => {
          const body = await driver.findElement(By.css('body'))
          return (
            (await body.getAttribute('data-crxjs-firefox')) === '42:content'
          )
        },
        15_000,
        'Content script did not run or communicate with the background',
      )
      await driver.wait(
        async () =>
          (await driver.executeScript('return window.crxjsFirefoxMain')) ===
          '42:main',
        15_000,
        'MAIN world module did not import its dependency and execute in the page',
      )
    } catch (error) {
      await mkdir(artifacts, { recursive: true })
      await writeFile(
        path.join(artifacts, 'error.txt'),
        String(error.stack ?? error),
      )
      if (driver) {
        // Diagnostics must not replace the original assertion or browser failure.
        await Promise.allSettled([
          driver
            .takeScreenshot()
            .then((image) =>
              writeFile(path.join(artifacts, 'failure.png'), image, 'base64'),
            ),
          driver
            .getPageSource()
            .then((html) => writeFile(path.join(artifacts, 'page.html'), html)),
        ])
      }
      throw error
    }
  },
)
