import fileName from './content?script'

console.log('options.ts', fileName)

let newTab: chrome.tabs.Tab | undefined
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (tabId === newTab?.id && changeInfo.status === 'complete') {
    chrome.scripting.executeScript({
      target: { tabId: newTab.id! },
      files: [fileName],
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
