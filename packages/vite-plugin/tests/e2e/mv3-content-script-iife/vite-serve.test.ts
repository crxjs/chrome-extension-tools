import fs from 'fs-extra'
import path from 'pathe'
import { expect, test } from 'vitest'
import { waitForRegisteredContentScripts } from '../helpers'
import { serve } from '../runners'
import { bareIifeAliasScriptId, dynamicBareIifeAliasId, dynamicIifeId, dynamicRegularId, iifeContentId, regularContentId, standaloneIifeScriptId } from './src1/script-ids'

test('IIFE content scripts work in dev mode', async () => {
  const src = path.join(__dirname, 'src')
  const src1 = path.join(__dirname, 'src1')

  // emptyDir + overwrite: more reliable than remove+copy when tests run back-to-back
  // (Vite watchers / polling from previous serve() can cause ENOTEMPTY/EEXIST).
  await fs.emptyDir(src)
  await fs.copy(src1, src, { overwrite: true })

  const { browser, outDir } = await serve(__dirname)

  await waitForRegisteredContentScripts(browser, [
    dynamicRegularId,
    dynamicIifeId,
    dynamicBareIifeAliasId,
  ])

  const page = await browser.newPage()
  await page.goto('https://example.com')

  // In dev mode, declared IIFE scripts skip the async dev loader and are
  // referenced directly in the manifest so they execute synchronously,
  // like build output and dynamically registered IIFE scripts (#1225).
  const manifest = await fs.readJson(path.join(outDir, 'manifest.json'))
  const declaredJs: string[] = manifest.content_scripts.flatMap(
    (script: { js?: string[] }) => script.js ?? [],
  )
  expect(declaredJs).toContain('src/content-iife.iife.ts.iife.js')
  expect(declaredJs).toContain('src/content-standalone.ts.iife.js')
  expect(declaredJs).toContain('src/content-regular.ts-loader.js')
  for (const fileName of declaredJs.filter((f) => f.endsWith('.iife.js'))) {
    const code = await fs.readFile(path.join(outDir, fileName), 'utf8')
    expect(code).toMatch(/^\(function\(\)/)
  }

  await page.waitForSelector(`#${regularContentId}`, { timeout: 10000 })
  await page.waitForSelector(`#${iifeContentId}`, { timeout: 10000 })
  await page.waitForSelector(`#${standaloneIifeScriptId}`, { timeout: 10000 })
  await page.waitForSelector(`#${dynamicRegularId}`, { timeout: 10000 })
  await page.waitForSelector(`#${dynamicIifeId}`, { timeout: 10000 })
  await page.waitForSelector(`#${bareIifeAliasScriptId}`, { timeout: 10000 })

  const regularText = await page.locator(`#${regularContentId}`).textContent()
  expect(regularText).toBe('regular: shared-util')

  const iifeText = await page.locator(`#${iifeContentId}`).textContent()
  expect(iifeText).toBe('iife: shared-util')

  const standaloneText = await page.locator(`#${standaloneIifeScriptId}`).textContent()
  expect(standaloneText).toBe('standalone: shared-util')

  const dynamicRegularText = await page.locator(`#${dynamicRegularId}`).textContent()
  expect(dynamicRegularText).toBe('dynamic-regular: shared-util')

  const dynamicIifeText = await page.locator(`#${dynamicIifeId}`).textContent()
  expect(dynamicIifeText).toBe('dynamic-iife: shared-util')

  const bareAliasText = await page.locator(`#${bareIifeAliasScriptId}`).textContent()
  expect(bareAliasText).toBe('bare-iife-alias: shared-util')
})
