import contentScript from './content?script'

chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') {
    chrome.scripting
      .registerContentScripts([
        { id: 'contentScript', js: [contentScript], matches: ['<all_urls>'] },
      ])
      .catch(console.error)
  }
})
