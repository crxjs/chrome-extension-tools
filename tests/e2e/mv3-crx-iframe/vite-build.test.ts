import { getPage } from '../helpers'
import { build } from '../runners'

test('crx runs from build output', async () => {
  const { browser } = await build(__dirname)
  const options = await getPage(browser, 'chrome-extension')
  const handle = await options.waitForSelector('iframe')
  const iframe = await handle.contentFrame()
  await iframe!.waitForSelector('h1')
})
