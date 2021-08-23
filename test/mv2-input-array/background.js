console.log('background.js')

chrome.runtime.onInstalled.addListener(() => {
  chrome.tabs.create({
    url: chrome.runtime.getURL('index.html'),
  })
})
