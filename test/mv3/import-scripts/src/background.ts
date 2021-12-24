import scriptFileName from './executed-script?script'

console.log('service_worker.ts')

chrome.action.onClicked.addListener((tab) => {
  if (tab.id)
    chrome.scripting.executeScript({
      files: [scriptFileName],
      target: { tabId: tab.id },
    })
})
