import { getPage } from '../helpers'
import { serve } from '../runners'

test('crx runs from server output', async () => {
  const { browser } = await serve(__dirname)

  const options1 = await getPage(browser, 'chrome-extension')
  const google1 = await getPage(browser, 'google')

  // P2: revisit this, we probably won't need it
  const branch = await Promise.race([
    // it might work the first time
    options1.waitForSelector('.ok').then(() => 0),
    // crx may do runtime reload b/c imported script has changed the manifest
    options1.waitForEvent('close').then(() => 1),
  ])

  if (branch === 0) {
    await google1.waitForSelector('.ok')
  } else {
    // options page will open again when crx reloads
    const options2 = await getPage(browser, 'chrome-extension')

    // close the old google window
    await google1.close()

    // we want the new google window with the new content script
    const google2 = await getPage(browser, 'google')
    await google2.waitForSelector('.ok')

    await options2.waitForSelector('.ok')
  }
})
