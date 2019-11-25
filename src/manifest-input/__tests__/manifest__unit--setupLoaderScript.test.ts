import { setupLoaderScript } from '../setupLoaderScript'

test('replaces delay', () => {
  const loaderScript = setupLoaderScript({
    eventDelay: 2000,
  })

  const result = loaderScript('background.js')

  expect(result).toMatch('.then(delay(2000))')
})

test('replaces namespace and event', () => {
  const loaderScript = setupLoaderScript({
    eventDelay: 2000,
    wakeEvents: [
      'chrome.runtime.onMessage',
      'chrome.tabs.onUpdated',
    ],
  })

  const result = loaderScript('background.js')

  // Namespaces
  expect(result).not.toMatch("case '%NAME%':")
  expect(result).toMatch(`case '${'runtime'}':`)
  expect(result).toMatch(`case '${'tabs'}':`)
  
  // Events
  expect(result).not.toMatch("case '%EVENT%':")
  expect(result).toMatch(`case '${'onMessage'}':`)
  expect(result).toMatch(`case '${'onUpdated'}':`)
})


test('replaces path', () => {
  const loaderScript = setupLoaderScript({
    eventDelay: 2000,
  })
  
  const result = loaderScript('background.js')
  
  expect(result).toMatch(`import('${'../background.js'}')`)
})