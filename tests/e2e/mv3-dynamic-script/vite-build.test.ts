import { getPage } from '../helpers'
import { build } from '../runners'

// TODO: handle main world scripts through web_accessible_resources

test.skip('crx runs from build output', async () => {
  const { browser } = await build(__dirname)

  const options = await getPage(browser, 'chrome-extension')
  const google = await getPage(browser, 'google')

  await options.waitForSelector('.ok', { timeout: 10000 })
  await google.waitForSelector('.ok', { timeout: 10000 })
})
