import contentScript from './content?script'

// This fixes `self`'s type.
declare const self: ServiceWorkerGlobalScope
export { }

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  if (reason === 'install') {
    await self.skipWaiting()
    await new Promise((r) => setTimeout(r, 100))

    chrome.scripting
      .registerContentScripts([
        { id: 'contentScript', js: [contentScript], matches: ['<all_urls>'] },
      ])
      .catch(console.error)
      .then(() => {
        console.log('Content script registered successfully.')
        
        chrome.tabs.create({
          url: 'https://example.com'
        }).catch(console.error);
      })
  }
})
