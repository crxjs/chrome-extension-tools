import { test } from 'vitest'
import { getPage } from '../helpers'
import { serve } from '../runners'

test(
  'crx runs from server output',
  async () => {
    const { browser } = await serve(__dirname)
    const options = await getPage(browser, 'chrome-extension')
    const handle = await options.waitForSelector('iframe')
    const iframe = await handle.contentFrame()
    await iframe!.waitForSelector('h1')
  },
  { retry: process.env.CI ? 5 : 0 },
)
