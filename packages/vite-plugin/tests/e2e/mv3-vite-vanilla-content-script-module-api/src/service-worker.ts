import contentScript from './root?script'

chrome.runtime.onMessage.addListener((msg, sender) => {
  chrome.scripting
    .executeScript({
      target: { tabId: sender.tab!.id! },
      files: [contentScript],
    })
    .then(() => console.log('injected'))
})
