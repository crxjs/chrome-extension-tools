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
        
        chrome.tabs.create({
          url: 'https://example.com'
        }).catch(console.error);
      })
  }
})
