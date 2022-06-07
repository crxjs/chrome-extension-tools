import { getPage } from '../helpers'
import { serve } from '../runners'

test('crx runs from server output', async () => {
  const { browser } = await serve(__dirname)
  // if page opens, service worker is ok
  await getPage(browser, 'chrome-extension')
})
