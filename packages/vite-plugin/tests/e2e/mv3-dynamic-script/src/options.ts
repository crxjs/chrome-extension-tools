import content1 from './content1?script'
import content2 from './content2?script'

console.log('options.ts', content1, content2)

let newTab: chrome.tabs.Tab | undefined
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (
    tab.url?.startsWith('https://example.com') &&
    tabId === newTab?.id &&
    changeInfo.status === 'loading'
  ) {
    chrome.scripting.executeScript({
      target: { tabId: newTab.id! },
      // Firefox resolves relative files against this nested options page.
      files: [`/${content1}`],
    })
  }
})
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (
    tab.url?.startsWith('https://example.com') &&
    tabId === newTab?.id &&
    changeInfo.status === 'complete'
  ) {
    chrome.scripting.executeScript({
      target: { tabId: newTab.id! },
      files: [`/${content2}`],
    })
  }
})

// Start only after the test has installed network routes. Assign the tab ID
// before navigation so neither browser can dispatch onUpdated too early.
const start = document.createElement('button')
start.id = 'start'
start.textContent = 'Start injection test'
start.onclick = async () => {
  newTab = await chrome.tabs.create({ url: 'about:blank' })
  await chrome.tabs.update(newTab.id!, { url: 'https://example.com' })
}
document.body.append(start)

chrome.runtime.onMessage.addListener(({ type }) => {
  if (type === 'ok') {
    const p = document.createElement('p')
    p.className = 'ok'
    p.innerText = 'ok'
    document.body.append(p)
  }
})
