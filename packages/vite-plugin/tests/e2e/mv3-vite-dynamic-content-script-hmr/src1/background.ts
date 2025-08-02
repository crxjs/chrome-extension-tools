import contentScript from './content?script'

export { }

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  if (reason === 'install') {
    chrome.scripting
      .registerContentScripts([
        { id: 'contentScript', js: [contentScript], matches: ['<all_urls>'] },
      ])
      .catch(console.error)
      .then(() => {
        console.log('Content script registered successfully.')
        
        // https://github.com/microsoft/playwright/issues/32865
        // Network mocking does not work for initial request when page opened via extension API chrome.tabs.create()
        // Network mocking _does_ work for the redirect request.
        chrome.tabs.create({
          url: chrome.runtime.getURL('src/redirect.html')
        }).catch(console.error);
      })
  }
})
