import content1 from './content1?script'
import content2 from './content2?script'

console.log('options.ts', content1, content2)

let newTab: chrome.tabs.Tab | undefined
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (tabId === newTab?.id && changeInfo.status === 'loading') {
    chrome.scripting.executeScript({
      target: { tabId: newTab.id! },
      files: [content1],
    })
  }
})
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (tabId === newTab?.id && changeInfo.status === 'complete') {
    chrome.scripting.executeScript({
      target: { tabId: newTab.id! },
      files: [content2],
    })
  }
})

// https://github.com/microsoft/playwright/issues/32865
// Network mocking does not work for initial request when page opened via extension API chrome.tabs.create()
// Network mocking _does_ work for the redirect request.
const url = chrome.runtime.getURL('src/redirect.html')
chrome.tabs.create({ url }).then((tab) => {
  newTab = tab
})

chrome.runtime.onMessage.addListener(({ type }) => {
  if (type === 'ok') {
    const p = document.createElement('p')
    p.className = 'ok'
    p.innerText = 'ok'
    document.body.append(p)
  }
})
