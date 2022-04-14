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

chrome.tabs.create({ url: 'https://google.com' }).then((tab) => {
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
