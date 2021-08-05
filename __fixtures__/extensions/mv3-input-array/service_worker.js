console.log('service_worker.js')

chrome.runtime.onInstalled.addListener(() => {
  chrome.tabs.create({
    url: chrome.runtime.getURL('index.html'),
  })
})
