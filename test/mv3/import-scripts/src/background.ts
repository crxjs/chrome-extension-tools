import scriptFileName from './dynamic-script?script'

console.log('service_worker.ts')

chrome.tabs
  .query({
    active: true,
    currentWindow: true,
  })
  .then(([tab]) => {
    if (tab?.id)
      chrome.scripting.executeScript({
        files: [scriptFileName],
        target: { tabId: tab.id },
      })
  })
