import { test } from 'vitest'
import { getPage } from '../helpers'
import { build } from '../runners'

test('crx runs from build output', async () => {
  const { browser } = await build(__dirname)

  const options = await getPage(browser, 'chrome-extension')
  const example = await getPage(browser, 'example')

  await options.waitForSelector('.ok', { timeout: 10000 })
  await example.waitForSelector('.ok', { timeout: 10000 })
})
